const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function zipEntries(buffer) {
    const entries = {};
    for (let at = 0; at <= buffer.length - 46; at += 1) {
        if (buffer.readUInt32LE(at) !== 0x02014b50) continue;
        const method = buffer.readUInt16LE(at + 10), size = buffer.readUInt32LE(at + 20);
        const nameLength = buffer.readUInt16LE(at + 28), extraLength = buffer.readUInt16LE(at + 30), commentLength = buffer.readUInt16LE(at + 32);
        const name = buffer.subarray(at + 46, at + 46 + nameLength).toString('utf8'), local = buffer.readUInt32LE(at + 42);
        const data = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
        const compressed = buffer.subarray(data, data + size);
        entries[name] = method === 0 ? compressed : zlib.inflateRawSync(compressed);
        at += 45 + nameLength + extraLength + commentLength;
    }
    return entries;
}

const docx = zipEntries(fs.readFileSync(path.join(root, 'manuscripts', '10_feature_宇宙很大，科幻更大_几华里.docx')));
assert.equal(Object.keys(docx).filter(name => /^word\/media\/[^/]+$/.test(name)).length, 0);
const documentXml = docx['word/document.xml'].toString('utf8');
const stylesXml = docx['word/styles.xml'].toString('utf8');
const styleNames = Object.fromEntries([...stylesXml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>[\s\S]*?<w:name\b[^>]*w:val="([^"]+)"/g)].map(m => [m[1], m[2]]));
const decode = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const fixture = { roles: [], texts: [] };
for (const match of documentXml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const xml = match[1], style = xml.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/);
    fixture.roles.push(style ? styleNames[style[1]] : 'DEFAULT');
    fixture.texts.push(decode([...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(value => value[1]).join('')));
}
assert.equal(fixture.texts[fixture.roles.indexOf('ArticleTitle')], '宇宙很大，科幻更大');
assert.equal(fixture.texts[fixture.roles.indexOf('Author')], '文 / 几华里');
assert.equal(fixture.roles.filter(role => role === 'FeatureLead').length, 0);
assert.equal(fixture.roles.filter(role => role === 'FeatureSection').length, 0);
assert.equal(fixture.roles.filter(role => role === 'FeatureMedia').length, 2);
assert.equal(fixture.roles.filter(role => /^(?:Caption|caption)$/.test(role)).length, 2);

const manifest = JSON.parse(read('assets/NOW_MEDIA_MANIFEST.json'));
assert.equal(manifest.article_id, 'feature_universe_is_big');
assert.equal(manifest.source_docx, 'manuscripts/10_feature_宇宙很大，科幻更大_几华里.docx');
assert.deepEqual(manifest.media.map(item => item.slot), ['NOW_MEDIA_01', 'NOW_MEDIA_02']);
assert.deepEqual(manifest.media.map(item => item.file), ['assets/now_01_baituan_booth.jpeg', 'assets/now_02_notes.jpeg']);
for (const item of manifest.media) {
    assert.equal(fixture.texts.filter(text => text.includes(`[[${item.slot}]]`)).length, 1);
    assert.equal(fs.readFileSync(path.join(root, item.file)).subarray(0, 3).toString('hex'), 'ffd8ff');
}

const ctx = vm.createContext({});
vm.runInContext(read('modules/feature.jsx'), ctx);
const feature = ctx.SHAN.feature;
const styles = Object.fromEntries(Object.values(feature.styleMap).map(name => [name, { name, isValid: true }]));
const paragraphs = fixture.roles.map((name, i) => ({ appliedParagraphStyle: { name }, contents: fixture.texts[i], applyParagraphStyle(style, clear) { assert.equal(clear, true); this.appliedParagraphStyle = style; } }));
const story = { contents: fixture.texts.join('\r'), paragraphs: { length: paragraphs.length, item: i => paragraphs[i] } };
const counts = feature.mapStory({ paragraphStyles: { itemByName: name => styles[name] || { isValid: false } } }, story);
assert.equal(counts.FeatureSection || 0, 0); assert.equal(counts.FeatureMedia, 2);
assert.equal((counts.Caption || 0) + (counts.caption || 0), 2);
assert.equal(story.contents, fixture.texts.join('\r'));
let withoutMarkers = feature.withoutMarkers(story.contents, manifest.media);
for (const item of manifest.media) assert.ok(!withoutMarkers.includes(`[[${item.slot}]]`));

const build = fs.readFileSync(path.join(root, 'build', '09_feature_now_test.jsx'));
assert.equal(build.subarray(0, 3).toString('hex'), 'efbbbf');
const buildText = build.toString('utf8');
assert.ok(buildText.includes('/manuscripts/10_feature_宇宙很大，科幻更大_几华里.docx'));
assert.ok(buildText.includes('/assets/NOW_MEDIA_MANIFEST.json'));
assert.ok(buildText.includes('"feature_universe_is_big"'));
for (const shared of ['modules/feature.jsx', 'visual/feature_skin.jsx', 'spec/FEATURE_TOKENS.json']) execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', shared], { cwd: root });
const status = JSON.parse(read('workflow/MODULE_STATUS.json'));
assert.deepEqual({ status: status.feature.status, runtimeTested: status.feature.runtimeTested, frozen: status.feature.frozen }, { status: 'IMPLEMENTED_PENDING_IND2026_TEST', runtimeTested: false, frozen: false });
for (const mod of ['foundation', 'chapter', 'interview', 'visual_system', 'fiction', 'memoir']) {
    const tag = mod === 'visual_system' ? 'visual-system-v1.0' : `${mod.replace('_', '-')}-v1.0`;
    execFileSync('git', ['diff', '--exit-code', `${tag}^{}`, '--', ...status[mod].scope], { cwd: root });
}
console.log('PASS Feature sample 2: title/author, 0 sections, 2 media/captions, marker-only removal, shared Feature and frozen scopes unchanged.');
