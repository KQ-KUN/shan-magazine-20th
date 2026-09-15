const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const data = JSON.parse(read('content/ASSOCIATION_PROFILE.json'));
const hashes = JSON.parse(read('spec/INPUT_HASHES.json'));
assert.equal(hash('content/ASSOCIATION_PROFILE.json'), hashes['content/ASSOCIATION_PROFILE.json']);
assert.equal(hash('assets/sdusfa_logo_black_transparent.png'), hashes['assets/sdusfa_logo_black_transparent.png']);
assert.equal(data.copy_status, 'LOCKED_FINAL');
assert.equal(data.title, '山东大学学生科幻协会');
assert.deepEqual(data.fields.map(field => field.label), ['协会名称', '会徽', '创立时间', '现有分会', '微信公众号']);
assert.equal(data.fields.find(field => field.label === '微信公众号').value, 'SFW10422');
assert.equal(data.fields.filter(field => field.type === 'image').length, 1);
assert.equal(data.fields.find(field => field.type === 'image').value, 'assets/sdusfa_logo_black_transparent.png');
assert.equal(data.body.length, 2);
assert.ok(data.body[1].endsWith('开展过不同形式的联动。'));

const png = fs.readFileSync(path.join(root, 'assets', 'sdusfa_logo_black_transparent.png'));
assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
assert.equal(png.readUInt32BE(16), 800); assert.equal(png.readUInt32BE(20), 800);
assert.ok([4, 6].includes(png[25]), 'PNG must contain an alpha channel');

const context = vm.createContext({ SHAN: { utils: { pt: value => value } } });
vm.runInContext(read('modules/association_profile.jsx'), context);
vm.runInContext(read('visual/association_profile_skin.jsx'), context);
vm.runInContext(`var lockedData = ${JSON.stringify(data)};`, context);
const association = context.SHAN.associationProfile;
association.validateData(context.lockedData);
const arrayGraphic = { isValid: true, itemLink: { isValid: true } };
assert.equal(association.getFirstGraphic({ isValid: true, allGraphics: Object.assign([arrayGraphic], { item() { throw new Error('array-like must use bracket access first'); } }) }), arrayGraphic);
const collectionGraphic = { isValid: true, itemLink: { isValid: true } };
assert.equal(association.getFirstGraphic({ isValid: true, allGraphics: { length: 1, item: () => collectionGraphic } }), collectionGraphic);
assert.equal(association.getFirstGraphic({ isValid: true, allGraphics: [], graphics: { length: 1, item: () => collectionGraphic } }), collectionGraphic);
assert.equal(association.getFirstGraphic({ isValid: false }), null);
const expectedVisible = [data.title];
for (const field of data.fields) { expectedVisible.push(field.label); if (field.type === 'text') expectedVisible.push(field.value); }
expectedVisible.push(...data.body);
assert.equal(association.visibleText(context.lockedData), expectedVisible.join('\n'));
assert.ok(association.visibleText(context.lockedData).replace(/\s/g, '').length > 150);

const tokens = JSON.parse(read('spec/ASSOCIATION_PROFILE_TOKENS.json'));
assert.equal(tokens.version, '1.2');
assert.ok(tokens.layout.logo_width_mm >= 24 && tokens.layout.logo_width_mm <= 27);
assert.ok(tokens.layout.logo_width_mm <= tokens.layout.logo_max_width_mm && tokens.layout.logo_max_width_mm === 28);
assert.ok(tokens.body.size_pt >= 9.5 && tokens.body.size_pt <= 10);
assert.ok(tokens.body.leading_pt >= 15 && tokens.body.leading_pt <= 16);
assert.ok(tokens.lead.size_pt > tokens.body.size_pt);
assert.ok(tokens.lead.leading_pt > tokens.body.leading_pt);
assert.ok(tokens.layout.title_top_mm >= 19 && tokens.layout.title_top_mm <= 23);
assert.ok(tokens.title.size_pt >= 28 && tokens.title.size_pt <= 32);
assert.ok(tokens.layout.info_top_mm >= 54 && tokens.layout.info_top_mm <= 62);
assert.ok(tokens.layout.info_top_mm - (tokens.layout.title_top_mm + tokens.layout.title_height_mm) <= 15);
assert.ok(tokens.layout.meta_top_mm <= 102);
assert.equal(tokens.layout.meta_x_mm.length, 3);
assert.equal(tokens.layout.meta_width_mm.length, 3);
assert.ok(tokens.layout.lead_top_mm >= 118 && tokens.layout.lead_top_mm <= 128);
assert.ok(tokens.layout.body_top_mm >= 158 && tokens.layout.body_top_mm <= 168);
assert.ok(tokens.layout.body_width_mm >= 145 && tokens.layout.body_width_mm <= 150);
assert.ok(tokens.layout.accent_length_mm >= 14 && tokens.layout.accent_length_mm <= 18);
assert.ok(tokens.layout.accent_weight_pt >= 0.5 && tokens.layout.accent_weight_pt <= 0.8);
assert.ok(tokens.layout.name_x_mm >= 18 && tokens.layout.name_x_mm <= 21);
assert.ok(tokens.layout.contours.length >= 5 && tokens.layout.contours.length <= 9);
const jsxFiles = ['modules/association_profile.jsx', 'visual/association_profile_skin.jsx', 'build/11_association_profile_test.jsx'];
for (const file of jsxFiles) assert.equal(fs.readFileSync(path.join(root, file)).subarray(0, 3).toString('hex'), 'efbbbf');
const jsx = jsxFiles.map(read).join('\n');
for (const mutable of [data.title, 'SFW10422', '2006年10月14日', '中心 / 兴隆山 / 软件园', '开展过不同形式的联动。']) {
    assert.ok(!jsx.includes(mutable), `mutable JSON value hard-coded in JSX: ${mutable}`);
}
assert.ok(jsx.includes('SHAN.associationProfile.assertRendered'));
assert.ok(jsx.includes('focusDocumentPage(doc, result.page)'));
assert.ok(jsx.includes('getFirstGraphic'));
assert.ok(!jsx.includes('result.logo.allGraphics.item'));
assert.ok(jsx.includes('P_Association_Lead'));
assert.ok(jsx.includes('page.graphicLines.add()'));
for (const guard of ['doc.pages.length !== 1', 'result.textFrames.length < 1', 'visibleCharacters <= 150',
    'text is on a hidden layer', 'logo is missing or hidden', 'logo is outside the document page', 'overset assertion failed']) {
    assert.ok(jsx.includes(guard), `missing runtime guard: ${guard}`);
}
const build = read('build/11_association_profile_test.jsx');
assert.ok(build.includes('/content/ASSOCIATION_PROFILE.json'));
assert.ok(build.includes('/spec/ASSOCIATION_PROFILE_TOKENS.json'));

const status = JSON.parse(read('workflow/MODULE_STATUS.json'));
assert.deepEqual({ status: status.association_profile.status, runtimeTested: status.association_profile.runtimeTested,
    designValuesPending: status.association_profile.designValuesPending, frozen: status.association_profile.frozen },
{ status: 'IMPLEMENTED_PENDING_IND2026_TEST', runtimeTested: false, designValuesPending: true, frozen: false });
for (const mod of ['foundation', 'chapter', 'interview', 'visual_system', 'fiction', 'memoir', 'feature']) {
    const tag = mod === 'visual_system' ? 'visual-system-v1.0' : `${mod.replace('_', '-')}-v1.0`;
    execFileSync('git', ['diff', '--exit-code', `${tag}^{}`, '--', ...status[mod].scope], { cwd: root });
}
console.log('PASS Association Profile v1.2: locked copy, editorial information band, 25 mm alpha logo, lead/body hierarchy, native contours, runtime guards, BOM and frozen scopes.');
