const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
const scope=json('workflow/TASK23_SCOPE.json'),git=(...args)=>cp.execFileSync('git',['-c',`safe.directory=${root}`,'-c','core.quotePath=false',...args],{cwd:root});
const old=p=>JSON.parse(git('show',scope.baseline+':'+p));
const data=json('content/XINGYUE.json'),prior=old('content/XINGYUE.json'),tokens=json('spec/XINGYUE_TOKENS.json'),previous=old('spec/XINGYUE_TOKENS.json');
assert.deepStrictEqual(data.paragraphs.map(({block,...p})=>p),prior.paragraphs.map(({block,...p})=>p));
assert.deepStrictEqual(tokens.styles,previous.styles);assert.strictEqual(tokens.page_count,2);
for(const k of ['1','3'])assert(tokens.image_widths_mm[k]>previous.image_widths_mm[k]);assert(tokens.portrait_zoom>previous.portrait_zoom);
for(const p of data.paragraphs.filter(p=>p.image)){const b=data.blocks.find(b=>b.id===p.block);assert(b);assert.strictEqual(b.page,p.image===2?1:2);assert(tokens.image_widths_mm[p.image]<=(b.width_mm||73)+.01);}
const closing=data.blocks.find(b=>b.id==='closing'),details=data.blocks.find(b=>b.id==='details');assert(closing.x_mm+closing.width_mm+6<=details.x_mm+.01);assert(details.x_mm+details.width_mm<=170);
let count=0;for(const m of Object.values(json('workflow/MODULE_STATUS.json')))if(m.frozen)for(const f of m.scope){assert.strictEqual(git('diff',scope.baseline,'--',f).length,0,'Frozen '+f);count++;}
for(const [f,h] of Object.entries(json('exports/ebook_v8/PROTECTED_HASHES.json')))assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),h,'Protected '+f);
for(const a of json('assets/ebook_v8/ASSET_ORIGINS.json').assets)assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,a.file))).digest('hex'),a.sha256,'User package asset '+a.file);
const changed=git('diff','--name-only',scope.baseline).toString('utf8').trim().split('\n').filter(Boolean);
const untracked=git('ls-files','--others','--exclude-standard').toString('utf8').trim().split('\n').filter(Boolean);
for(const f of [...changed,...untracked])if(!f.startsWith('SHAN_MEMOIR_CLEAN_IMPORT_PROBE/') && f!=='build/SHAN_MEMOIR_IMPORT_PROBE.jsx')assert(scope.allowed.includes(f),'Outside V8 '+f);
for(const f of scope.allowed.filter(p=>p.endsWith('.jsx'))){const bytes=fs.readFileSync(path.join(root,f));assert.strictEqual(bytes.subarray(0,3).toString('hex'),'efbbbf',f);const source=bytes.toString('utf8').replace(/^\uFEFF/,'').replace(/^#.*$/gm,'');new vm.Script(source);assert(!/throw\s+e\s*;|\bvar\s+final\b/.test(source));}
const render=fs.readFileSync(path.join(root,'modules/ebook_v8.jsx'),'utf8');assert(!render.includes('SHAN.history.create'));assert(render.includes('Justification.LEFT_ALIGN'));assert(render.includes("s.fillColor=doc.colors.itemByName('C_TEXT')"));
const runner=fs.readFileSync(path.join(root,'tools/run_ebook_v8.ps1'),'utf8');assert(!runner.includes('prepare_print_components.py'));assert(runner.includes('tests/ebook_v8_outputs.py'));
const standalone=fs.readFileSync(path.join(root,'build/40_ebook_v8_standalone.jsx'),'utf8');assert(standalone.includes('SHAN.printBook.exportPDF(doc,') && !standalone.includes('exportIsolatedPages('));
console.log('PASS V8: exact approved text, separate proportional image regions, '+count+' frozen files unchanged, allowlist and BOM/runtime guards');
