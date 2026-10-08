const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..'),json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
const scope=json('workflow/TASK22_SCOPE.json'),git=(...a)=>cp.execFileSync('git',['-c','core.quotePath=false',...a],{cwd:root}),old=p=>JSON.parse(git('show',scope.baseline+':'+p));
cp.execFileSync(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'),['-X','utf8','tools/task22_source.py'],{cwd:root,stdio:'inherit'});
const data=json('content/XINGYUE.json'),t=json('spec/XINGYUE_TOKENS.json'),prev=old('spec/XINGYUE_TOKENS.json');
assert.strictEqual(t.page_count,2);assert(t.image_widths_mm['3']/prev.image_widths_mm['3']>=1.15 && t.image_widths_mm['3']/prev.image_widths_mm['3']<=1.25);
assert(t.portrait_zoom>1.2);assert.deepStrictEqual(t.styles.P_XingYue_Body,prev.styles.P_XingYue_Body);
for(const p of data.paragraphs.filter(p=>p.image)){const b=data.blocks.find(b=>b.id===p.block);assert.strictEqual(b.page,p.image===2?1:2);if(p.image===2)assert.strictEqual(b.column,1);}
let frozen=0;for(const m of Object.values(json('workflow/MODULE_STATUS.json')))if(m.frozen)for(const f of m.scope){assert.strictEqual(git('diff',scope.baseline,'--',f).length,0,'Frozen '+f);frozen++;}
for(const dir of ['assets','manuscripts','modules/history.jsx','visual/history_skin.jsx','spec/HISTORY_TOKENS.json','content/HISTORY_IMPORT_MAP.json','spec/CONTENT_MANIFEST.json','spec/CHAPTER_ART_TOKENS.json','modules/assembly_v0.jsx','modules/print_book.jsx'])for(const f of git('ls-tree','-r','--name-only',scope.baseline,'--',dir).toString('utf8').trim().split('\n').filter(Boolean))assert.strictEqual(git('diff',scope.baseline,'--',f).length,0,'Protected '+f);
for(const f of git('diff','--name-only',scope.baseline).toString('utf8').trim().split('\n').filter(Boolean))assert(scope.allowed.includes(f),'Outside TASK22 '+f);
for(const f of git('ls-files','--others','--exclude-standard').toString('utf8').trim().split('\n').filter(Boolean))if(!f.startsWith('SHAN_MEMOIR_CLEAN_IMPORT_PROBE/') && f!=='build/SHAN_MEMOIR_IMPORT_PROBE.jsx')assert(scope.allowed.includes(f),'Outside TASK22 '+f);
for(const f of scope.allowed.filter(f=>f.endsWith('.jsx'))){const b=fs.readFileSync(path.join(root,f));assert.strictEqual(b.subarray(0,3).toString('hex'),'efbbbf');const s=b.toString('utf8').replace(/^\uFEFF/,'').replace(/^#.*$/gm,'');new vm.Script(s);assert(!/throw\s+e\s*;|\bvar\s+final\b/.test(s));}
const standalone=fs.readFileSync(path.join(root,'build/36_targeted_refinement_test.jsx'),'utf8');
assert(standalone.includes('SHAN.printBook.exportPDF(doc,') && !standalone.includes('exportIsolatedPages('),'Live component facing-page geometry must be retained');
const runner=fs.readFileSync(path.join(root,'tools/run_print_v7.ps1'),'utf8');
assert(runner.includes("Invoke-PublicationPython 'tools/task22_source.py' @()"));
assert(runner.includes("Invoke-PublicationPython 'tests/print_book_outputs.py' @('--v7')"));
require('./task21.test.cjs');console.log('PASS TASK22 scope: '+frozen+' frozen files unchanged; new geometry plus historical copy checks');
