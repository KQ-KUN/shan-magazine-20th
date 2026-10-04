const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const git=(...args)=>cp.execFileSync('git',args,{cwd:root});
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const info=json('content/FICTION_WORK_INFO.json');
assert.deepStrictEqual(info,{fiction_fourfold:'获第三届星火杯二等奖',fiction_tin_soldier:'获第二届月曜杯优秀奖',fiction_teleport_history:'发表于《科幻世界》2022年第一期'});
const audit=json('spec/TASK16_SOURCE_AUDIT.json');
assert.strictEqual(sha(fs.readFileSync(path.join(root,audit.source))),audit.sha256);
assert.deepStrictEqual(audit.images.map(i=>i.index),[1,2,3]);
for(const image of audit.images.concat([audit.pancake_original])){
 const bytes=fs.readFileSync(path.join(root,image.file));assert.strictEqual(sha(bytes),image.sha256);
 assert.strictEqual(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.strictEqual(bytes.readUInt32BE(16),image.width_px);assert.strictEqual(bytes.readUInt32BE(20),image.height_px);
}
const data=json('content/XINGYUE.json'),rows=data.paragraphs;
assert.deepStrictEqual(rows.filter(p=>p.image).map(p=>p.image),[1,2,3]);
assert(rows.filter(p=>p.image).every(p=>p.role==='Media' && p.text===''));
for(const [i,p] of rows.entries())if(p.image)assert.strictEqual(rows[i+1].role,'Caption');
assert.deepStrictEqual(rows.filter(p=>p.role==='Caption').map(p=>p.text),['原型图｜马静雅绘','星岳人物形象','Q版表情包']);
assert(rows.some(p=>p.text==='她是一位 AGI，负责航线计算、信息分析与辅助决策，也是船上的气氛担当。活泼开朗的小星岳，既是大家旅途中的可靠伙伴，也是整艘星船的“最强大脑”。'));
assert(rows.some(p=>p.text==='靴子上则写有“SDU”与“SFA”字样，作为与学校和社团的直接呼应。'));
const m=json('content/ASSEMBLY_V0_MANIFEST.json'),now=m.interior.findIndex(c=>c.id==='chapter_now'),x=m.interior.findIndex(c=>c.id==='xingyue'),next=m.interior.findIndex(c=>c.id==='chapter_beyond');
assert(now<x && x<next);assert(m.interior.some(c=>c.id==='now_pending' && c.kind==='placeholder'));assert(!m.excluded_for_v0.includes('社娘（暂停）'));
const status=json('workflow/MODULE_STATUS.json');
const exception=json('workflow/TASK16_FROZEN_EXCEPTION.json'),baseline=exception.baseline_commit;
assert.deepStrictEqual(exception.allowed_frozen_files,[]);
assert.strictEqual(git('diff',baseline,'--','workflow/MODULE_STATUS.json').length,0);
for(const mod of Object.values(status))if(mod.frozen)for(const file of mod.scope)assert.strictEqual(git('diff',baseline,'--',file).length,0,'Frozen changed '+file);
for(const file of ['spec/VISUAL_TOKENS.json','spec/FICTION_TOKENS.json','spec/MEMOIR_TOKENS.json','assets/PANCAKE_MEDIA_MANIFEST.json','assets/cover/SHAN_FRONT_COVER_FINAL.pdf','modules/history.jsx','visual/history_skin.jsx','content/HISTORY_IMPORT_MAP.json','spec/HISTORY_TOKENS.json'])assert.strictEqual(git('diff',baseline,'--',file).length,0,'Read-only changed '+file);
const originals=m.interior.filter(c=>c.kind==='fiction' || c.kind==='memoir').map(c=>c.source);
for(const file of originals)assert.strictEqual(sha(fs.readFileSync(path.join(root,file))),sha(git('show',baseline+':'+file)),'Original Fiction/Memoir source changed '+file);
for(const file of ['modules/publication_refinements.jsx','modules/xingyue.jsx','visual/xingyue_skin.jsx','build/16_content_refinement_test.jsx','build/14_magazine_assembly_v0.jsx','modules/assembly_v0.jsx']){
 assert.strictEqual(fs.readFileSync(path.join(root,file)).subarray(0,3).toString('hex'),'efbbbf');
 new vm.Script(read(file).replace(/^#.*$/gm,''),{filename:file});
 assert(!/\bvar\s+final\b|throw\s+e\s*;/.test(read(file)));
}
console.log('PASS TASK16 static: 3 exact work-info / 3 original XingYue images / original Pancake PNG / chapter_now + retained pending / original sources / all frozen files unchanged / BOM and syntax');
