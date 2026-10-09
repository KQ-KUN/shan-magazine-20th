const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'')),scope=read('workflow/TASK24_SCOPE.json');
const git=(...a)=>cp.execFileSync('git',['-c',`safe.directory=${root}`,'-c','core.quotePath=false',...a],{cwd:root});
const old=JSON.parse(git('show',scope.baseline+':content/XINGYUE.json')),now=read('content/XINGYUE.json');old.blocks.find(b=>b.id==='story').top_mm=32;assert.deepStrictEqual(now,old);
const media=read('assets/PANCAKE_MEDIA_MANIFEST.json'),origin=read('spec/TASK16_SOURCE_AUDIT.json').pancake_original;
assert.strictEqual(media.file,origin.file);assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,media.file))).digest('hex'),origin.sha256);
assert(media.width_mm>=60 && media.width_mm<=68);assert(Math.abs(media.height_mm/media.width_mm-350/257)<1e-8);assert.strictEqual(media.caption,'△《生物中心主义》');assert.strictEqual(media.first_page_columns_mm[1],media.width_mm);
let frozen=0;for(const m of Object.values(read('workflow/MODULE_STATUS.json')))if(m.frozen)for(const f of m.scope){assert.strictEqual(git('diff',scope.baseline,'--',f).length,0,'Frozen '+f);frozen++;}
for(const [f,h] of Object.entries(read('exports/ebook_v8_r1/PROTECTED_HASHES.json')))assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),h,'Protected '+f);
const changed=git('diff','--name-only',scope.baseline).toString().trim().split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').toString().trim().split('\n').filter(Boolean);
for(const f of [...changed,...untracked])if(!scope.ignored_existing.some(p=>f===p || f.startsWith(p.endsWith('/')?p:p+'/')))assert(scope.allowed.includes(f),'Outside R1 '+f);
for(const f of scope.allowed.filter(f=>f.endsWith('.jsx'))){const buf=fs.readFileSync(path.join(root,f));assert.strictEqual(buf.subarray(0,3).toString('hex'),'efbbbf',f);const code=buf.toString('utf8').replace(/^\uFEFF/,'').replace(/^#.*$/gm,'');new vm.Script(code);assert(!/throw\s+e\s*;|\bvar\s+final\b/.test(code));}
const adapter=fs.readFileSync(path.join(root,'modules/ebook_v8_r1.jsx'),'utf8');assert(!adapter.includes('pancake_media_canvas'));assert(!adapter.includes('SHAN.history.create'));assert(adapter.includes("c.id==='memoir_pancake'"));assert(adapter.includes('SHAN.memoir.mapStory'));assert(adapter.includes('SHAN.memoir.placeMedia'));
assert.strictEqual(git('diff',scope.baseline,'--','spec/XINGYUE_TOKENS.json','spec/MEMOIR_TOKENS.json','modules/publication_refinements.jsx','modules/ebook_v8.jsx').length,0,'Typography or other V8 display changed');
console.log(`PASS V8 R1: exact copy; sole XingYue story offset; opaque portrait; ${frozen} frozen files unchanged; two-component adapter; scope/BOM`);
