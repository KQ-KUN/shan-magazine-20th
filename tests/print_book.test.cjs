const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const git=(...args)=>cp.execFileSync('git',args,{cwd:root});
const baseline=json('content/PRINT_BOOK_BASELINE.json'),plan=json('content/PRINT_BOOK_MANIFEST.json'),m=JSON.parse(git('show',baseline.baseline_commit+':'+plan.source_plan).toString('utf8')),t=json(plan.section_tokens);
assert.deepStrictEqual(m.interior.map(c=>c.id),baseline.components.map(c=>c.id));
assert.strictEqual(plan.reader_interior_offset,2);assert.strictEqual(plan.interior_number_start,1);
assert.strictEqual(plan.binding_mode,'UNCONFIRMED');assert.strictEqual(plan.cover_pages,4);
assert.notStrictEqual(plan.inside_front_type,plan.parity_page_type);
let next=1;const transitions=[];
for(const [i,c] of m.interior.entries()){
 if(c.start_on_recto && next%2===0)transitions.push({page:next++,before:c.id});
 const old=baseline.components[i];assert.strictEqual(next,old.start_page);
 if(c.kind==='chapter')assert(next%2===1 && old.page_count===1);
 assert.strictEqual(hash(old.file),old.sha256,'Approved PDF changed '+c.id);
 next+=old.page_count;
}
assert.strictEqual(next-1,71);assert.deepStrictEqual(transitions,baseline.parity_transitions.map(({page,before})=>({page,before})));
assert.deepStrictEqual(transitions.map(t=>t.page),[6,26,62]);assert.strictEqual(next-1+2,73);
assert.strictEqual(hash(plan.approved_cover),baseline.approved_cover_sha256);
assert.deepStrictEqual(Object.keys(t.sections),json('spec/CONTENT_MANIFEST.json').sections.map(c=>c.id));
for(const section of Object.values(t.sections)){assert.strictEqual(section.cmyk.length,4);assert(section.cmyk.every(v=>v>=0&&v<=100));assert(section.cmyk.reduce((a,b)=>a+b,0)<=t.max_artwork_tac_percent);}
assert.strictEqual(t.bleed_mm,3);assert(t.inside_mm>=18 && t.safe_trim_mm>=5);
for(const file of ['modules/chapter_art.jsx','modules/print_book.jsx','build/17_chapter_art_samples.jsx','build/18_print_book_test.jsx','build/19_print_postflight.jsx']){
 assert.strictEqual(fs.readFileSync(path.join(root,file)).subarray(0,3).toString('hex'),'efbbbf',file);
 new vm.Script(read(file).replace(/^#.*$/gm,''),{filename:file});assert(!/\bthrow\s+e\s*;|\bvar\s+final\b/.test(read(file)));
}
const status=json('workflow/MODULE_STATUS.json');
for(const module of Object.values(status))if(module.frozen)for(const file of module.scope)assert.strictEqual(git('diff',baseline.baseline_commit,'--',file).length,0,'Frozen changed '+file);
for(const file of ['modules/history.jsx','visual/history_skin.jsx','spec/HISTORY_TOKENS.json','content/HISTORY_IMPORT_MAP.json','modules/publication_refinements.jsx','modules/xingyue.jsx','visual/xingyue_skin.jsx','spec/XINGYUE_TOKENS.json','spec/VISUAL_TOKENS.json','workflow/MODULE_STATUS.json'])assert.strictEqual(git('diff',baseline.baseline_commit,'--',file).length,0,'Protected changed '+file);
const existing=git('ls-tree','-r','--name-only',baseline.baseline_commit,'--','manuscripts','assets').toString('utf8').trim().split('\n');
for(const file of existing)assert.strictEqual(git('diff',baseline.baseline_commit,'--',file).length,0,'Existing source/asset changed '+file);
require(json('content/ASSEMBLY_V0_MANIFEST.json').interior.some(c=>c.kind==='toc')?'./task19.test.cjs':'./task18.test.cjs');
console.log('PASS PrintBook static: C2 distinct / 71 interior + 2 reader pages / 7 recto chapters / only transitions 6,26,62 / CMYK <=220% / BOM / approved input SHA / zero frozen or body changes');
