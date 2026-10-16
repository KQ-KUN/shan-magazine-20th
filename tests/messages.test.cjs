const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const git=(...args)=>cp.execFileSync('git',['-c',`safe.directory=${root}`,'-c','core.quotePath=false',...args],{cwd:root}).toString();
const scope=read('workflow/TASK27_SCOPE.json'),baseline=read('exports/messages_v2/BASELINE.json'),map=read('content/MESSAGES_IMPORT_MAP.json'),source=read('exports/messages_v2/SOURCE_IMPORT.json');
assert.strictEqual(hash(map.source),scope.source_sha256);assert.strictEqual(source.source_sha256,map.sha256);
assert.strictEqual(source.paragraphs.length,130);assert.strictEqual(source.paragraphs.filter(p=>p==='').length,27);assert.strictEqual(map.entries.length,28);
const coverage=[];
for(const e of map.entries){const raw=source.paragraphs[e.header_paragraph-1];assert.strictEqual(raw.slice(...e.role_range)+raw.slice(...e.separator_range)+raw.slice(...e.name_range),raw);coverage.push(e.header_paragraph,...e.body_paragraphs);}
assert.deepStrictEqual(coverage,Array.from({length:130},(_,i)=>i+1));
assert(source.paragraphs[129].endsWith('在山外相逢，在未来重聚。'));
const t=read('spec/MESSAGES_TOKENS.json');assert.strictEqual(t.styles.P_Message_Body.size_pt,9.4);assert.strictEqual(t.styles.P_Message_Body.leading_pt,15.5);assert.strictEqual(t.header_keep_body_lines,2);
const renderer=fs.readFileSync(path.join(root,'modules/messages.jsx'),'utf8');assert(renderer.includes('nextTextFrame = f'));assert(!renderer.includes('long_entry_threshold'));assert(!renderer.includes('bodyHeight:'));assert(renderer.includes('rect.fillTint = 100'));
for(const f of scope.allowed.filter(f=>f.endsWith('.jsx'))){const b=fs.readFileSync(path.join(root,f));assert.strictEqual(b.subarray(0,3).toString('hex'),'efbbbf',f);const code=b.toString('utf8').replace(/^\uFEFF/,'');for(const m of code.matchAll(/^#include "([^"]+)"/gm))assert(fs.existsSync(path.resolve(path.dirname(path.join(root,f)),m[1])));new vm.Script(code.replace(/^#.*$/gm,''),{filename:f});assert(!/throw\s+e\s*;/.test(code),f);}
const before=read('exports/messages_v2/BASELINE_ASSEMBLY_V0_MANIFEST.json'),expected=JSON.parse(JSON.stringify(before));expected.interior[expected.interior.length-1]={id:'messages',kind:'messages',title:'寄语',source:map.source};assert.deepStrictEqual(read('content/ASSEMBLY_V0_MANIFEST.json'),expected);
let frozen=0;for(const m of Object.values(read('workflow/MODULE_STATUS.json')))if(m.frozen)for(const f of m.scope){assert.strictEqual(hash(f),baseline.preserved_hashes[f],'Frozen '+f);frozen++;}
for(const [f,h]of Object.entries(baseline.preserved_hashes))if(f!=='content/ASSEMBLY_V0_MANIFEST.json')assert.strictEqual(hash(f),h,'Prior work/protected file '+f);
const oldAssembly=git('show',scope.baseline+':modules/assembly_v0.jsx');let expectedAssembly=oldAssembly.replace('        } else if (c.kind === "history") {','        } else if (c.kind === "messages") {\n            tokens = this.read(root, "spec/MESSAGES_TOKENS.json");\n            SHAN.messagesSkin.apply(doc, tokens, base, context);\n            result = SHAN.messages.render(doc, this.read(root, "exports/messages_v2/SOURCE_IMPORT.json"), this.read(root, "content/MESSAGES_IMPORT_MAP.json"), tokens, runtime);\n        } else if (c.kind === "history") {');
const normalized=s=>s.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');assert.strictEqual(normalized(fs.readFileSync(path.join(root,'modules/assembly_v0.jsx'),'utf8')),normalized(expectedAssembly));
const oldBuild=git('show',scope.baseline+':build/14_magazine_assembly_v0.jsx');assert.strictEqual(normalized(fs.readFileSync(path.join(root,'build/14_magazine_assembly_v0.jsx'),'utf8')),normalized(oldBuild.replace('#include "../modules/assembly_v0.jsx"','#include "../modules/messages.jsx"\n#include "../visual/messages_skin.jsx"\n#include "../modules/assembly_v0.jsx"')));
const changed=git('diff','--name-only',scope.baseline).trim().split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').trim().split('\n').filter(Boolean);
for(const f of [...changed,...untracked])assert(scope.allowed.includes(f)||baseline.tracked_dirty.includes(f)||baseline.existing_untracked.includes(f)||f.startsWith('assets/cover/emblem/'),'Outside scope '+f);
console.log(`PASS Messages V2 static/source/frozen-scope: 28 people, 130 exact source paragraphs including empties; JSX BOM/includes; threaded story; body 9.4/15.5 unchanged; ${frozen} frozen files unchanged; prior cover/probes preserved; Assembly delta only Messages`);

const sandbox={};vm.createContext(sandbox);vm.runInContext(renderer.replace(/^\uFEFF/,''),sandbox);assert.strictEqual(sandbox.SHAN.messages.styleFor(0,{'$0':1},['header']), 'P_Message_Header');assert.strictEqual(sandbox.SHAN.messages.styleFor(1,{'$0':1},['header','']), 'P_Message_Empty');assert.strictEqual(sandbox.SHAN.messages.styleFor(2,{'$0':1},['header','','body']), 'P_Message_Body');
