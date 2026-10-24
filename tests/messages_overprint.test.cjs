const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'')),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const scope=read('workflow/TASK30_SCOPE.json'),map=read('content/MESSAGES_IMPORT_MAP.json'),source=read('exports/messages_v2/SOURCE_IMPORT.json'),t=read('spec/MESSAGES_TOKENS.json');
assert.strictEqual(hash(map.source),map.sha256);assert.strictEqual(source.source_sha256,map.sha256);assert.strictEqual(map.entries.length,31);assert.strictEqual(source.paragraphs.length,148);
const covered=[];for(const e of map.entries){let raw=source.paragraphs[e.header_paragraph-1];assert.strictEqual(raw.slice(...e.role_range)+raw.slice(...e.separator_range)+raw.slice(...e.name_range),raw);covered.push(e.header_paragraph,...e.body_paragraphs);}
assert.deepStrictEqual(covered,Array.from({length:148},(_,i)=>i+1));assert.strictEqual(source.paragraphs.filter(s=>s==='').length,30);
assert.strictEqual(t.styles.P_Message_Body.size_pt,9.4);assert.strictEqual(t.styles.P_Message_Body.leading_pt,15.5);assert(t.name_size_pt<=15&&t.name_min_size_pt>=13);assert(t.styles.P_Message_Header.size_pt>=10.5);assert.strictEqual(t.name_family,'serif_cn');assert.strictEqual(t.name_weight,'SemiBold');assert.strictEqual(t.styles.P_Message_Header.weight_preference,'Medium');assert.strictEqual(t.header_keep_body_lines,2);assert(t.palettes.length<=4);assert(t.plate_height_ratio>=.7&&t.plate_height_ratio<=.85);assert(t.role_gap_mm>=3&&t.role_gap_mm<=4);
for(const f of scope.allow.filter(f=>f.endsWith('.jsx'))){let b=fs.readFileSync(path.join(root,f));assert.strictEqual(b.subarray(0,3).toString('hex'),'efbbbf');let s=b.toString('utf8').replace(/^\uFEFF/,'');new vm.Script(s.replace(/^#.*$/gm,''),{filename:f});assert(!/throw\s+e\s*;/.test(s));for(const m of s.matchAll(/^#include "([^"]+)"/gm))assert(fs.existsSync(path.resolve(root,path.dirname(f),m[1])));}
assert.strictEqual(map.centered_titles.length,2);assert.strictEqual(map.double_underlines.length,1);
assert(map.entries.every(e=>/^\d{4}级/.test(source.paragraphs[e.header_paragraph-1])));
const liu=map.entries.find(e=>source.paragraphs[e.header_paragraph-1].slice(...e.name_range)==='刘洋（笠原 JunE）');assert(liu);assert.strictEqual(source.paragraphs[liu.header_paragraph-1].slice(...liu.role_range),'2014级策划部长');
const expectedAssembly=structuredClone(scope.assembly_before);expectedAssembly.interior.find(c=>c.id==='messages').source=map.source;assert.deepStrictEqual(read('content/ASSEMBLY_V0_MANIFEST.json'),expectedAssembly);
const renderer=fs.readFileSync(path.join(root,'modules/messages.jsx'),'utf8'),sandbox={};vm.createContext(sandbox);vm.runInContext(renderer,sandbox);
for(const [i,expected] of [[0,'P_Message_Header'],[1,'P_Message_Empty'],[2,'P_Message_Body']])assert.strictEqual(sandbox.SHAN.messages.styleFor(i,{'$0':1},['header','','body']),expected);
for(const [year,index] of [[2006,0],[2012,1],[2018,2],[2025,3]])assert.strictEqual(sandbox.SHAN.messages.paletteFor(year+'级会长',t).name,t.palettes[index].name);
assert(renderer.includes('nextTextFrame = f'));assert(renderer.includes('center-placed-message-headers'));assert(!renderer.includes('邵珠瑜')&&!renderer.includes('刘慧颖'));
for(const [p,h] of Object.entries(scope.protected))assert.strictEqual(hash(p),h,'Outside scope or protected prior output: '+p);
const git=(...args)=>cp.execFileSync('git',['-c','safe.directory='+root,'-c','core.quotePath=false',...args],{cwd:root}).toString();
const changed=git('diff','--name-only',scope.head).trim().split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').trim().split('\n').filter(Boolean);
for(const p of [...changed,...untracked])assert(scope.allow.includes(p)||Object.hasOwn(scope.protected,p),'Unexpected change: '+p);
let frozen=0;for(const m of Object.values(read('workflow/MODULE_STATUS.json')))if(m.frozen)for(const p of m.scope){assert.strictEqual(hash(p),scope.protected[p]);frozen++;}
assert.strictEqual(sandbox.SHAN.messages.styleFor(3,{},['','','','title'],{'$3':true}),'P_Message_InternalTitle');
console.log('PASS: 31 names/roles, 148 source paragraphs, 30 empties; 9.4/15.5 body; dynamic measured headers; JSX BOM/includes; '+frozen+' frozen files; '+Object.keys(scope.protected).length+' protected files/output hashes; unrelated dirty work preserved');
