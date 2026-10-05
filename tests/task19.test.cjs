const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const manifest=json('content/ASSEMBLY_V0_MANIFEST.json'),config=json('content/TOC_MANIFEST.json'),tokens=json('spec/TOC_TOKENS.json');
assert.strictEqual(manifest.interior[3].id,'editorial_info');assert.strictEqual(manifest.interior[4].kind,'toc');
assert(!manifest.interior.some(c=>c.id==='toc_pending'));
const context={};vm.createContext(context);vm.runInContext(read('modules/toc.jsx'),context);
const actual=json('exports/print_v3/FINAL_PRINT_REPORT.json'),sections=json('spec/CONTENT_MANIFEST.json').sections;
const data=context.SHAN.toc.entries(manifest,actual,config,sections);
assert.strictEqual(data.entries.length,21);assert.strictEqual(data.pending.length,4);
for(const e of data.entries){
 const record=actual.components.find(c=>c.id===e.component_id);
 assert.strictEqual(e.printed_folio,record.start_page);assert.strictEqual(e.review_pdf_page,e.interior_page+2);
 if(e.kind==='chapter')assert.strictEqual(e.printed_folio%2,1);
 assert(!['placeholder','toc','editorial_info'].includes(e.kind));
}
assert(data.entries.some(e=>e.component_id==='feature_monday_cup_backstage' && e.author==='鲲图'));
assert(data.entries.some(e=>e.component_id==='xingyue'));
assert(!data.entries.some(e=>/PENDING|友协祝福|编后记|独立致谢页|优秀奖|二等奖|2022年第一期/.test(e.title)));
assert(data.pending.every(e=>e.status==='PENDING' && !('start_page' in e)));
// Mutate actual runtime ranges, rather than the config, and prove every number refreshes.
const shifted=JSON.parse(JSON.stringify(actual));shifted.components.forEach(c=>{c.start_page+=2;c.end_page+=2;});
const refreshed=context.SHAN.toc.entries(manifest,shifted,config,sections);
data.entries.forEach((e,i)=>assert.strictEqual(refreshed.entries[i].printed_folio,e.printed_folio+2));
// A newly completed module is collected without adding a hardcoded TOC entry.
const expanded=JSON.parse(JSON.stringify(manifest)),expandedReport=JSON.parse(JSON.stringify(actual));
expanded.interior.push({id:'completed_addition',kind:'feature',title:'完成的新稿',author:'作者'});
expandedReport.components.push({id:'completed_addition',status:'COMPLETED',start_page:80});
assert.strictEqual(context.SHAN.toc.entries(expanded,expandedReport,config,sections).entries.length,22);
const missing=JSON.parse(JSON.stringify(actual));missing.components=missing.components.filter(c=>c.id!=='history');
assert.throws(()=>context.SHAN.toc.entries(manifest,missing,config,sections),/history/);
assert(tokens.styles.P_TOC_Article.size_pt>=8.5);
assert(tokens.styles.P_TOC_Author.size_pt<tokens.styles.P_TOC_Article.size_pt);
assert(!/"(?:start_page|interior_page|printed_folio|review_pdf_page)"\s*:/.test(read('content/TOC_MANIFEST.json')));
for(const f of ['modules/toc.jsx','visual/toc_skin.jsx','modules/print_book.jsx','build/24_front_matter_test.jsx','build/25_print_book_v4_test.jsx','build/26_print_v4_folios.jsx','build/27_print_v4_postflight.jsx']){
 assert.strictEqual(fs.readFileSync(path.join(root,f)).subarray(0,3).toString('hex'),'efbbbf',f);
 new vm.Script(read(f).replace(/^#.*$/gm,''),{filename:f});assert(!/throw\s+e\s*;|\bvar\s+final\b/.test(read(f)));
}
assert(read('modules/print_book.jsx').includes('Number(doc.pages[next-1].name)'));
assert(read('modules/print_book.jsx').includes('creditsPage.parent.id===tocPage.parent.id'));
assert(!/\.{4}|leader/i.test(read('modules/toc.jsx')));
require('./task18.test.cjs');
console.log('PASS TASK19: 21 completed entries / actual runtime page refresh / new content auto collection / LEFT-RIGHT front matter / Pending exclusions / BOM');
