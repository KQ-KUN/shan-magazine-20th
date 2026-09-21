const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const data = JSON.parse(read('content/COVER_COPY.json'));
const tokens = JSON.parse(read('spec/COVER_SYSTEM_TOKENS.json'));
const hashes = JSON.parse(read('spec/INPUT_HASHES.json'));

assert.equal(hash('content/COVER_COPY.json'), hashes['content/COVER_COPY.json']);
assert.equal(hash('spec/COVER_SYSTEM_PHASE_A_DESIGN.md'), hashes['spec/COVER_SYSTEM_PHASE_A_DESIGN.md']);
assert.equal(hash('assets/sdusfa_logo_black_transparent.png'), hashes['assets/sdusfa_logo_black_transparent.png']);
assert.equal(data.front.title_cn, '山');
assert.equal(data.front.subtitle_cn, '山东大学学生科幻协会二十周年纪念刊');
assert.equal(data.front.years, '2006—2026');
assert.equal(data.back.organization, '山东大学学生科幻协会');
assert.equal(data.back.wechat, 'SFW10422');
assert.equal(data.back.qr_status, 'RESERVED_NOT_RENDERED');
assert.deepEqual(data.spine.preferred_text, ['山', '山东大学学生科幻协会二十周年纪念刊', '2006—2026']);
assert.equal(data.spine.status, 'WIDTH_PENDING');

const context = vm.createContext({ SHAN: { utils: { pt: value => value } } });
vm.runInContext(read('modules/cover_system.jsx'), context);
vm.runInContext(read('visual/cover_system_skin.jsx'), context);
vm.runInContext(`var coverData = ${JSON.stringify(data)};`, context);
const cover = context.SHAN.coverSystem;
cover.validateData(context.coverData);
const spine = cover.spineRule(context.coverData);
assert.equal(spine.status, 'WIDTH_PENDING');
assert.equal(spine.physicalWidthMM, null);
assert.deepEqual(Array.from(spine.preferredText), data.spine.preferred_text);
assert.equal(cover.normalizeText('山\r\n '), '山');
const graphic = { isValid: true, itemLink: { isValid: true } };
assert.equal(cover.getFirstGraphic({ isValid: true, allGraphics: Object.assign([graphic], { item() { throw new Error('array-like must use bracket access first'); } }) }), graphic);
assert.equal(cover.getFirstGraphic({ isValid: true, allGraphics: { length: 1, item: () => graphic } }), graphic);

assert.equal(tokens.page.width_mm, 185);
assert.equal(tokens.page.height_mm, 260);
assert.equal(tokens.page.bleed_mm, 3);
assert.equal(tokens.page.critical_safe_mm, 15);
assert.ok(tokens.front.title.size_pt >= 92 && tokens.front.title.size_pt <= 118);
assert.ok(tokens.front.subtitle.size_pt >= 11 && tokens.front.subtitle.size_pt <= 15);
assert.ok(tokens.front.years.size_pt >= 12 && tokens.front.years.size_pt <= 18);
assert.ok(tokens.back.layout.logo_width_mm >= 20 && tokens.back.layout.logo_width_mm <= 28);
assert.equal(tokens.spine.render_physical_spine, false);
assert.equal('width_mm' in tokens.spine, false);
assert.equal(tokens.render_english_mark, false);

const jsxFiles = ['modules/cover_system.jsx', 'visual/cover_system_skin.jsx', 'build/12_cover_system_test.jsx'];
for (const file of jsxFiles) assert.equal(fs.readFileSync(path.join(root, file)).subarray(0, 3).toString('hex'), 'efbbbf');
const jsx = jsxFiles.map(read).join('\n');
for (const copy of [data.front.title_cn, data.front.subtitle_cn, data.front.years, data.back.organization, data.back.wechat]) {
    assert.ok(!jsx.includes(copy), `Cover copy hard-coded in JSX: ${copy}`);
}
for (const forbidden of ['二维码', 'ISBN', '条码', '星空', '星云', '行星', '宇航员']) {
    assert.ok(!jsx.includes(forbidden), `Forbidden Cover System element in JSX: ${forbidden}`);
}
for (const guard of ['doc.pages.length !== 2', 'result.frontFrames.length !== 3', 'result.backFrames.length !== 2',
    'frame.parentPage.id === page.id', 'frameWithinSafeArea', 'itemWithinBleed', 'getFirstGraphic',
    'prefs.pageWidth - expectedWidth', 'prefs.pageHeight - expectedHeight', 'prefs.documentBleedTopOffset - expectedBleed',
    'prefs.documentBleedBottomOffset - expectedBleed', 'prefs.documentBleedInsideOrLeftOffset - expectedBleed',
    'prefs.documentBleedOutsideOrRightOffset - expectedBleed', 'result.spine.physicalWidthMM !== null',
    'overset=false', 'focusDocumentPage(doc, result.frontPage)']) {
    assert.ok(jsx.includes(guard), `Missing Cover System guardrail: ${guard}`);
}
assert.ok(!jsx.includes('doc.stories'));
assert.ok(!jsx.includes('allGraphics.item('));
assert.ok(!jsx.includes('SHAN.parents.create'));

const status = JSON.parse(read('workflow/MODULE_STATUS.json'));
assert.deepEqual({ status: status.cover_system.status, runtimeTested: status.cover_system.runtimeTested,
    designValuesPending: status.cover_system.designValuesPending, frozen: status.cover_system.frozen },
{ status: 'PARTIAL_APPROVED_EXTERNAL_ARTWORK', runtimeTested: false, designValuesPending: true, frozen: false });
assert.deepEqual(status.cover_system.frontCover, {
    status: 'APPROVED', sourceType: 'EXTERNAL_ARTWORK', asset: 'assets/cover/SHAN_FRONT_COVER_FINAL.pdf',
    assemblyMode: 'DIRECT_PDF_LINK', jsxStatus: 'SUPERSEDED_BY_EXTERNAL_ARTWORK'
});
assert.equal(status.cover_system.backCover.status, 'PENDING');
assert.equal(status.cover_system.spine.status, 'WIDTH_PENDING');
for (const mod of ['foundation', 'chapter', 'interview', 'visual_system', 'fiction', 'memoir', 'feature', 'association_profile']) {
    const tag = mod === 'visual_system' ? 'visual-system-v1.0' : `${mod.replace('_', '-')}-v1.0`;
    execFileSync('git', ['diff', '--exit-code', `${tag}^{}`, '--', ...status[mod].scope], { cwd: root });
}
console.log('PASS Cover System Phase A: locked copy, 2x 185x260 mm pages, 3 mm bleed, local assertions, spine width pending, BOM and frozen scopes.');
