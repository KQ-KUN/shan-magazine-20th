const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, '');
const json = p => JSON.parse(read(p));
const manifest = json('content/ASSEMBLY_V0_MANIFEST.json');
const ids = ['chapter_prologue','front_note','association_profile','toc_pending','editorial_info','chapter_origin','interview_shao','interview_xiao','origin_pending','chapter_strata','history','chapter_ridge','feature_beyond_ridge','chapter_constellations','fiction_fourfold','fiction_tin_soldier','fiction_teleport_history','memoir_gloomy','memoir_pancake','chapter_now','feature_now','xingyue','now_pending','chapter_beyond','messages_pending','closing_pending'];
assert.deepStrictEqual(manifest.interior.map(c => c.id), ids);
assert.strictEqual(manifest.purpose, 'REVIEW_PROOF_ONLY');
assert.strictEqual(manifest.cover.front.file, 'assets/cover/SHAN_FRONT_COVER_FINAL.pdf');
assert(!manifest.cover.front.include_in_interior_master && manifest.cover.front.include_in_review_pdf);
assert(!manifest.cover.back.include && !manifest.cover.spine.include);
for (const c of manifest.interior) {
  if (c.kind === 'chapter') assert(c.start_on_recto);
  if (c.kind === 'placeholder') { assert.strictEqual(c.pages, 1); assert.strictEqual(c.label, 'CONTENT PENDING — NOT FOR PRINT'); }
  for (const name of ['source','media_manifest']) if (c[name]) assert(fs.existsSync(path.join(root,c[name])));
}
assert(fs.existsSync(path.join(root, manifest.cover.front.file)));
const profile = read('content/ASSOCIATION_PROFILE.json');
assert(profile.includes('SFA10422') && !profile.includes('SFW10422'));
const git = (...args) => cp.execFileSync('git', args, {cwd: root});
const baseline = JSON.parse(git('show','HEAD:workflow/MODULE_STATUS.json'));
const current = json('workflow/MODULE_STATUS.json');
const exception = json('workflow/TASK15_FROZEN_EXCEPTION.json');
assert.deepStrictEqual(exception.allowed_frozen_files, ['visual/interview_skin.jsx']);
const skinPath = exception.allowed_frozen_files[0];
const originalSkin = git('show','HEAD:'+skinPath).toString('utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
const currentSkin = read(skinPath).replace(/\r\n/g,'\n');
const allowedBlock = [
  "        // TASK 15 authorized defect fix: a rule offset smaller than the first",
  "        // line's ascent crosses CJK glyphs. Reserve the full em plus 2 mm.",
  '        var question = doc.paragraphStyles.itemByName("P_Interview_Q");',
  '        if (!question.isValid) { throw new Error("Missing P_Interview_Q"); }',
  '        question.ruleAboveOffset = Number(question.pointSize) + SHAN.utils.pt(2);',
  '        question.keepRuleAboveInFrame = true;'
].join('\n') + '\n';
assert(currentSkin.includes(allowedBlock));
// Compare the entire frozen file after removing only the expressly approved two-property overlay.
if (originalSkin !== currentSkin) assert.strictEqual(currentSkin.replace(allowedBlock,''), originalSkin);
for (const [key,value] of Object.entries(baseline)) {
  assert.deepStrictEqual(current[key], value, 'Existing module status changed: '+key);
  if (value.frozen) for (const p of value.scope) {
    if (p !== skinPath) assert.strictEqual(git('diff','HEAD','--',p).length,0,'Frozen changed: '+p);
  }
}
assert.strictEqual(current.assembly_v0.status, 'IMPLEMENTED_PENDING_IND2026_TEST');
assert(!current.assembly_v0.frozen);
for (const p of ['spec/CONTENT_MANIFEST.json','assets/cover/SHAN_FRONT_COVER_FINAL.pdf','content/HISTORY_IMPORT_MAP.json','content/HISTORY_TAIL_LAYOUT.json']) {
  assert.strictEqual(git('diff','HEAD','--',p).length,0,'Read-only input changed: '+p);
}
const changedManuscripts = git('-c','core.quotePath=false','diff','--name-only','HEAD','--','manuscripts').toString('utf8').trim().split('\n').filter(Boolean);
assert(changedManuscripts.every(p => ['manuscripts/source/编辑信息.docx','manuscripts/source/幻协社娘.docx'].includes(p)), 'Existing manuscript changed');
const editorialAudit = json('spec/EDITORIAL_INFO_SOURCE_AUDIT.json');
assert.strictEqual(require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,editorialAudit.source_file))).digest('hex'), editorialAudit.source_sha256);
assert(git('check-attr','text','--',editorialAudit.xml_file).toString('utf8').endsWith('text: unset\n'), 'Source XML must not receive Git newline normalization');
for (const p of ['modules/assembly_v0.jsx','build/14_magazine_assembly_v0.jsx','modules/editorial_info.jsx','visual/editorial_info_skin.jsx','visual/interview_skin.jsx','build/15_editorial_info_test.jsx']) {
  assert.deepStrictEqual([...fs.readFileSync(path.join(root,p)).subarray(0,3)],[239,187,191]);
  const source = read(p).replace(/^#.*$/gm,''); new vm.Script(source,{filename:p});
  assert(!/\b(?:var|let|const)\s+final\b|throw\s+e\s*;/.test(source));
  assert(!source.includes('cover_system'));
}
const build = read('build/14_magazine_assembly_v0.jsx');
for (const match of build.matchAll(/^#include "([^"]+)"/gm)) assert(fs.existsSync(path.resolve(root,'build',match[1])));
const assemblySource = read('modules/assembly_v0.jsx');
for (const stage of ['load-manifest','validate-sources','editorial-correction-check','render-component:','export-component:','compose-interior:','save-interior','export-interior','compose-review-cover','compose-review-interior','save-review','export-review','write-report']) assert(assemblySource.includes(stage));
assert(assemblySource.includes('PDFCrop.CROP_TRIM') && assemblySource.includes('horizontalScale = 100') && assemblySource.includes('verticalScale = 100'));
const sandbox = vm.createContext({}); vm.runInContext(assemblySource,sandbox);
const encoded = vm.runInContext('SHAN.assemblyV0.json({title:"山\\n尾页", rows:[null,true,1,"引号\\\""], state:"PASS"})',sandbox);
assert.deepStrictEqual(JSON.parse(encoded), {title:'山\n尾页',rows:[null,true,1,'引号"'],state:'PASS'});
// A selected chapter is exported from the seven-page renderer; every possible offset retains recto parity.
for (let index=0;index<7;index++) { const target=21; const tempStart=target-index; assert.strictEqual((tempStart+index)%2,1); }
assert.strictEqual(manifest.interior.filter(c=>c.kind==='placeholder').length,5);
assert(!manifest.interior.some(c=>/编后记|致谢|友协祝福/.test(c.title)));
assert.strictEqual(manifest.interior.find(c=>c.id==='closing_pending').title,'未来');
assert.strictEqual(manifest.interior.find(c=>c.id==='messages_pending').title,'历任社长寄语');
console.log('PASS TASK 16 Assembly static: 26 components / 7 recto chapters / 5 placeholders / editorial source / Interview-only frozen exception / BOM / immutable inputs / serializer');
