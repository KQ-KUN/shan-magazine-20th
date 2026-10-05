const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),baseline='522935fbe2a4635d08b372b0d389f191ad2fe72f';
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const old=p=>cp.execFileSync('git',['show',baseline+':'+p],{cwd:root});
const before=JSON.parse(old('content/ASSEMBLY_V0_MANIFEST.json')),after=json('content/ASSEMBLY_V0_MANIFEST.json');
const id='feature_monday_cup_backstage',article=after.interior.find(c=>c.id===id);
assert(article && article.author==='鲲图' && article.section_id==='ridge');
assert.deepStrictEqual(article.toc,{title:article.title,author:'鲲图'});
const at=after.interior.findIndex(c=>c.id===id);
assert.strictEqual(after.interior[at-1].id,'feature_beyond_ridge');
assert.strictEqual(after.interior[at+1].id,'chapter_constellations');
const without=JSON.parse(JSON.stringify(after));without.interior=without.interior.filter(c=>c.id!==id);
if(without.interior.some(c=>c.kind==='toc')){
 const formal=without.interior.findIndex(c=>c.kind==='toc'),credits=without.interior.find(c=>c.id==='editorial_info');
 assert.strictEqual(formal,4);assert.strictEqual(without.interior[3].id,'editorial_info');
 without.interior.splice(3,2,before.interior[3],credits);
}
assert.deepStrictEqual(without,before,'Only TASK18 article insertion and TASK19 front-matter delta are authorized');
const oldCopy=JSON.parse(old('spec/CONTENT_MANIFEST.json')),copy=json('spec/CONTENT_MANIFEST.json');
const intros={
origin:'一座山的故事，要从最初的一点火光开始讲起。2006年，一群因为科幻而相遇的学生在校园中聚到一起，建立协会、寻找同好、举办最初的活动。“火种”记录的，正是这一份时间之外的往事。',
ridge:'早在协会创立之初，山大幻协便开始尝试与其他高校的科幻爱好者建立联系；多年以后，月曜杯与齐鲁科幻联盟让这些曾经零散的尝试重新汇聚。“越岭”讲述的是从校园走向更广阔科幻共同体的过程。',
beyond:'登上一座山，看到的是更多的山。历任社长的寄语、友协的祝福和对未来的想象，将把这本纪念刊的视线从过去重新投向远方。二十年之后，故事会被继续书写，而山外仍有更辽阔的世界。'};
for(const s of oldCopy.sections)if(intros[s.id])s.intro=intros[s.id];
assert.deepStrictEqual(copy,oldCopy,'Only user-provided intro strings may change');
const map=json(article.import_map);
for(const [file,sha] of [[map.source,map.source_sha256],[map.layout_source,map.layout_sha256]])assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),sha);
assert.strictEqual(map.source_sha256,'37bae5b2b21eb1b8ffe789db47fef3525d17755d9b0a519458aba0ad2098e57c');
assert.strictEqual(map.paragraph_count,18);
assert.deepStrictEqual(map.paragraphs.filter(r=>r.number_marker).map(r=>r.number_marker),Array.from('①②③④⑤⑥⑦⑧'));
for(const f of ['modules/monday_cup.jsx','modules/print_book.jsx','modules/assembly_v0.jsx','build/14_magazine_assembly_v0.jsx','build/20_monday_cup_test.jsx','build/21_print_book_v3_test.jsx','build/22_print_v3_postflight.jsx','build/23_print_v3_folios.jsx']){
 assert.strictEqual(fs.readFileSync(path.join(root,f)).subarray(0,3).toString('hex'),'efbbbf',f);
 new vm.Script(read(f).replace(/^#.*$/gm,''),{filename:f});assert(!/throw\s+e\s*;|\bvar\s+final\b/.test(read(f)));
}
// Existing renderer integration is exactly a dispatch for this new article.
const assembly=read('modules/assembly_v0.jsx').replace(/\r/g,'').replace('if (c.id === "feature_monday_cup_backstage") { SHAN.mondayCup.create(doc, c, root); }\n            else { SHAN.feature.create(doc, File(root + "/" + c.source), c.article_id, media, root); }','SHAN.feature.create(doc, File(root + "/" + c.source), c.article_id, media, root);');
assert.strictEqual(assembly.replace(/\r/g,''),old('modules/assembly_v0.jsx').toString('utf8').replace(/^\uFEFF/,'').replace(/\r/g,''));
const status=json('workflow/MODULE_STATUS.json');let frozen=0;
for(const mod of Object.values(status))if(mod.frozen)for(const file of mod.scope){assert.strictEqual(cp.execFileSync('git',['diff',baseline,'--',file],{cwd:root}).length,0,'Frozen changed '+file);frozen++;}
for(const f of ['content/PRINT_BOOK_BASELINE.json','spec/CHAPTER_ART_TOKENS.json','modules/chapter_art.jsx','modules/history.jsx','visual/history_skin.jsx','spec/HISTORY_TOKENS.json','content/HISTORY_IMPORT_MAP.json','modules/publication_refinements.jsx','modules/xingyue.jsx','visual/xingyue_skin.jsx','spec/XINGYUE_TOKENS.json'])assert.strictEqual(cp.execFileSync('git',['diff',baseline,'--',f],{cwd:root}).length,0,'Protected changed '+f);
console.log('PASS TASK18: exact chapter copy delta / single ridge insertion / original source SHA / 18 mappings / BOM / syntax / '+frozen+' frozen files unchanged');
