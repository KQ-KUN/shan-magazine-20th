const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process'),vm=require('vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''),json=p=>JSON.parse(read(p));
const before=JSON.parse(cp.execFileSync('git',['show','8bbc343faca2b7b9131fd610310e40856a72dcae:content/ASSEMBLY_V0_MANIFEST.json'],{cwd:root}));
const current=json('content/ASSEMBLY_V0_MANIFEST.json'),restored=JSON.parse(JSON.stringify(current));
assert.strictEqual(current.interior[3].id,'editorial_toc');assert.strictEqual(current.interior[4].id,'chapter_origin');
assert(!current.interior.some(c=>['editorial_info','toc','toc_pending'].includes(c.id)));
restored.interior.splice(3,1,...before.interior.slice(3,5));
for(const c of before.interior.filter(c=>['origin_pending','now_pending','closing_pending'].includes(c.id))){if(!restored.interior.some(x=>x.id===c.id)){restored.interior.splice(before.interior.findIndex(x=>x.id===c.id),0,c);}}assert.deepStrictEqual(restored,before,'Only combine two front components');
const context={};vm.createContext(context);vm.runInContext(read('modules/toc.jsx'),context);
const previous=json('exports/print_v4/FINAL_PRINT_REPORT.json'),shifted=JSON.parse(JSON.stringify(previous));
for(const c of shifted.components)if(c.start_page>5){c.start_page-=2;c.end_page-=2;}
const entries=context.SHAN.toc.entries(current,shifted,json('content/TOC_MANIFEST.json'),json('spec/CONTENT_MANIFEST.json').sections);
assert.strictEqual(entries.entries.length,21);assert.strictEqual(entries.pending.length,1);
assert.strictEqual(entries.entries.find(e=>e.component_id==='chapter_origin').printed_folio,5);
assert(entries.entries.some(e=>e.component_id==='feature_monday_cup_backstage'));
assert(entries.entries.some(e=>e.component_id==='xingyue'));
assert(entries.entries.filter(e=>e.kind==='chapter').every(e=>e.printed_folio%2===1));
const t=json('spec/EDITORIAL_TOC_TOKENS.json');assert.strictEqual(t.editorial_width_mm,47);assert.strictEqual(t.contents_width_mm,98);
assert(t.editorial_width_mm/(t.editorial_width_mm+t.contents_width_mm)>.31 && t.editorial_width_mm/(t.editorial_width_mm+t.contents_width_mm)<.35);
assert(t.left_mm+t.editorial_width_mm+t.gap_mm+t.contents_width_mm===167);
assert(t.rule_pt>=.4 && t.rule_pt<=.7);assert(t.styles.P_ET_Article.size_pt>=8.5);
assert(t.styles.P_ET_Author.size_pt<t.styles.P_ET_Article.size_pt);assert(t.styles.P_ET_Contents_Title.size_pt>t.styles.P_ET_Section.size_pt);
for(const f of ['modules/editorial_toc.jsx','visual/editorial_toc_skin.jsx','modules/print_book.jsx','build/29_print_book_v5_test.jsx','build/30_print_v5_folios.jsx','build/31_print_v5_postflight.jsx']){
 assert.strictEqual(fs.readFileSync(path.join(root,f)).subarray(0,3).toString('hex'),'efbbbf');new vm.Script(read(f).replace(/^#.*$/gm,''));assert(!/throw\s+e\s*;|\bvar\s+final\b/.test(read(f)));
}
for(const f of ['modules/toc.jsx','visual/toc_skin.jsx','modules/editorial_info.jsx','visual/editorial_info_skin.jsx','spec/EDITORIAL_INFO_SOURCE_AUDIT.json','spec/CONTENT_MANIFEST.json','content/PRINT_BOOK_BASELINE.json','modules/history.jsx','visual/history_skin.jsx','modules/chapter_art.jsx','spec/CHAPTER_ART_TOKENS.json'])assert.strictEqual(cp.execFileSync('git',['diff','8bbc343faca2b7b9131fd610310e40856a72dcae','--',f],{cwd:root}).length,0,'Protected changed '+f);
assert(read('modules/editorial_toc.jsx').includes('source.paragraphs.slice(0,31)'));
assert(read('modules/editorial_toc.jsx').includes('metadataPreferences.description=fullLegal'));
require('./task19.test.cjs');
console.log('PASS TASK20: one combined verso / 47:98mm / 21 dynamic entries / Fire 5 recto / copyright metadata / BOM / frozen and body scope');
