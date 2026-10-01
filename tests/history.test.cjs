const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fixture = JSON.parse(fs.readFileSync(0, 'utf8'));
const map = JSON.parse(read('content/HISTORY_IMPORT_MAP.json'));
const audit = JSON.parse(read('spec/HISTORY_SOURCE_AUDIT.json'));
const tokens = JSON.parse(read('spec/HISTORY_TOKENS.json'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.deepEqual(map, fixture.map);
assert.deepEqual(audit, fixture.audit);

function list(items) {
    const result = { length: () => items.length };
    items.forEach((value, i) => { result[i] = value; });
    return result;
}
function node(data) {
    const name = data.tag.slice(data.tag.indexOf('}') + 1);
    const uri = data.tag.startsWith('{') ? data.tag.slice(1, data.tag.indexOf('}')) : '';
    return {
        name: () => ({ localName: name, uri }), nodeKind: () => 'element',
        toString: () => data.text || '', children: () => list(data.children.map(node)),
        elements: q => list(data.children.filter(c => c.tag === `{${q.ns.uri}}${q.name}`).map(node)),
    };
}
function XML(text) { assert.equal(text, read(audit.xml_file)); return node(fixture.tree); }
XML.ignoreWhitespace = true;
function File(filename) {
    return { fsName: filename, exists: fs.existsSync(filename), encoding: 'UTF-8',
        open() { return this.exists; }, close() {}, read() { return fs.readFileSync(filename, this.encoding === 'BINARY' ? 'latin1' : 'utf8'); } };
}
const ctx = vm.createContext({ XML, Namespace: function (uri) { this.uri = uri; },
    QName: function (ns, name) { this.ns = ns; this.name = name; }, File,
    SHAN: { utils: { pt: n => n * 72 / 25.4, moduleWidthMM: () => 122 / 6 }, spec: { gutterMM: 6 } },
    LinkStatus: { NORMAL: 1 }, FontStatus: { INSTALLED: 1 }, app: { version: 'MOCK_ONLY' } });
for (const file of ['modules/history_source.jsx', 'modules/history.jsx', 'visual/history_skin.jsx', 'build/13_history_test.jsx']) {
    assert.equal(fs.readFileSync(path.join(root, file)).subarray(0, 3).toString('hex'), 'efbbbf', file);
    const code = read(file).replace(/^\uFEFF/, '').replace(/^#(?:target|include).*$/gm, '');
    new vm.Script(code, { filename: file });
    if (!file.startsWith('build/')) vm.runInContext(code, ctx);
}
const sourceModule = ctx.SHAN.historySource;
const history = ctx.SHAN.history;
for (const bytes of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(63), 'a'.repeat(64), 'a'.repeat(65), '\x00\xff'.repeat(250)]) {
    assert.equal(sourceModule.sha256(bytes), hash(Buffer.from(bytes, 'latin1')));
}
for (const text of [' 山东大学\u200e——\t', '😀', 'e\u0301', '\r\n']) {
    assert.equal(sourceModule.utf8(text), Buffer.from(text).toString('latin1'));
}
const source = sourceModule.verifySource(root, audit);
assert.deepEqual(Array.from(source.paragraphs), fixture.paragraphs, 'E4X projection matches independent Python reader, every paragraph');
assert.equal(source.textboxes[0].text, fixture.textbox);
assert.equal(XML.ignoreWhitespace, true);
sourceModule.validateMap(map, source);
assert.equal(map.years.length, 21);
assert.equal(map.paragraph_order.length, 216);
assert.equal(new Set(map.paragraph_order).size, 216);
assert.deepEqual(map.paragraph_order.slice(147, 151), [149, 150, 148, 151]);
assert.equal(fixture.paragraphs[205], '2025年4月，协办第二届星海邀约征文');
assert.equal(fixture.paragraphs[51], '（资料缺失）');
assert.ok(fixture.paragraphs[88].includes('\u200e'));
const pStyle = i => map.paragraphs[i - 1].style;
for (const p of map.years) assert.equal(pStyle(p), 'P_History_Year');
assert.equal(pStyle(4), 'P_History_Empty');
assert.equal(pStyle(38), 'P_History_Media_Wide');
assert.equal(pStyle(39), 'P_History_Caption_Wide');
for (const p of [28, 189, 192]) assert.equal(pStyle(p), 'P_History_Media_Caption');
for (const p of map.paragraphs) assert.ok(tokens.paragraph_styles[p.style] || ['P_Article_Title', 'P_Metadata'].includes(p.style));

function makeStory() {
    return { paragraphs: map.paragraph_order.map(p => ({ contents: fixture.paragraphs[p - 1] +
        '\ufffc'.repeat(map.images.filter(image => image.source_paragraph === p).length) + '\r' })) };
}
sourceModule.assertParagraphs(makeStory(), source, map);
// Negative tests exercise ALL paragraphs, including blank/image/list paragraphs.
for (let i = 0; i < map.paragraph_order.length; i++) {
    const story = makeStory(); story.paragraphs[i].contents = `X${story.paragraphs[i].contents}`;
    assert.throws(() => sourceModule.assertParagraphs(story, source, map), /Text\/order changed/);
}
for (const change of [m => m.paragraph_order.pop(), m => m.paragraph_order.reverse(), m => { m.images[0].source_paragraph = 7; },
    m => { m.captions[3].image_indices = [17]; }, m => m.years.pop()]) {
    const bad = structuredClone(map); change(bad);
    assert.throws(() => sourceModule.validateMap(bad, source));
}
assert.equal(sourceModule.paragraphText(' A——\u200e\t \r', 0), ' A——\u200e\t ');
assert.equal(sourceModule.paragraphText('\r\r', 0), '\r');
assert.throws(() => sourceModule.paragraphText('text\ufffc\r', 0), /marker count/);
assert.throws(() => sourceModule.assertParagraphs({ paragraphs: makeStory().paragraphs.slice(1) }, source, map), /count mismatch/);
const reordered = makeStory(); [reordered.paragraphs[9], reordered.paragraphs[10]] = [reordered.paragraphs[10], reordered.paragraphs[9]];
assert.throws(() => sourceModule.assertParagraphs(reordered, source, map), /Text\/order changed/);
const arrayLike = Object.assign([{ id: 42 }], { item() { throw new Error('must use bracket access'); } });
assert.equal(sourceModule.at(arrayLike, 0).id, 42);
assert.equal(sourceModule.at({ length: 1, item: () => ({ id: 43 }) }, 0).id, 43);

for (const asset of audit.assets) {
    const size = history.imageSize(asset);
    assert.ok(size.width > 0 && size.height > 0 && size.height < 200);
    assert.ok([2, 3, 6].includes(asset.modules));
    assert.equal(hash(fs.readFileSync(path.join(root, asset.file))), asset.sha256);
    assert.ok(Math.abs(size.height / size.contentWidth - (asset.pixel_height / asset.pixel_width) * (1 - asset.crop.t - asset.crop.b)) < 1e-10);
    if (asset.modules === 2) assert.ok(size.contentWidth <= asset.original_width_mm);
}
assert.equal(audit.assets[0].modules, 2);
assert.equal(audit.assets[2].modules, 6);

const line = (offset, frameId = 2, pageId = 1) => ({ horizontalOffset: offset, parentTextFrames: [{
    id: frameId, isValid: true, parentPage: { id: pageId }, geometricBounds: [0, 0, 500, 438],
    textFramePreferences: { textColumnGutter: 18 } }] });
const yearStory = { paragraphs: map.paragraph_order.map(() => ({ lines: [line(0)] })) };
history.yearChecks(yearStory, map);
const firstYear = map.paragraph_order.indexOf(5);
yearStory.paragraphs[firstYear + 1].lines = [line(228)];
assert.throws(() => history.yearChecks(yearStory, map), /Orphan year/);

const anchoredStory = { id: 123 };
const anchoredImages = Array.from({ length: 24 }, (_, i) => ({ anchor: { parent: { index: i * 20, parentStory: anchoredStory } } }));
history.anchorOrderChecks(anchoredStory, anchoredImages);
[anchoredImages[0], anchoredImages[1]] = [anchoredImages[1], anchoredImages[0]];
assert.throws(() => history.anchorOrderChecks(anchoredStory, anchoredImages), /anchor order mismatch/);
anchoredImages[0].anchor.parent.parentStory = { id: 456 };
assert.throws(() => history.anchorOrderChecks(anchoredStory, anchoredImages), /not anchored/);
yearStory.paragraphs[firstYear + 1].lines = [line(0, 2, 3)];
assert.throws(() => history.yearChecks(yearStory, map), /Orphan year/);

// No-progress and bounded overset guards run with a minimal DOM double.
ctx.LocationOptions = { AT_END: 1 };
const savedAdd = history.addFrame;
history.addFrame = () => ({ insertionPoints: { item: () => ({ index: 10 }) } });
const oversetStory = { overflows: true }, frame = { insertionPoints: { item: () => ({ index: 10 }) } };
const mockDoc = { recompose() {}, pages: { add() { return {}; } } };
assert.throws(() => history.flow(mockDoc, oversetStory, frame, { max_pages: 5 }), /no progress/);
assert.throws(() => history.flow(mockDoc, oversetStory, frame, { max_pages: 1 }), /safety limit/);
history.addFrame = savedAdd;

const pt = n => n * 72 / 25.4;
const page = { id: 1, isValid: true, bounds: [0, 0, pt(260), pt(185)], appliedMaster: { name: 'C-HISTORY' } };
const story = makeStory(); story.id = 456; story.overflows = false; story.contents = 'X'.repeat(3000);
story.paragraphs.forEach((p, i) => { p.lines = [line(0)]; p.allGraphics = []; p.appliedParagraphStyle = { name: pStyle(map.paragraph_order[i]) }; });
const records = map.images.map((image, i) => {
    const graphic = { id: i + 1, isValid: true, itemLink: { isValid: true, status: 1 }, horizontalScale: 100, verticalScale: 100 };
    story.paragraphs[map.paragraph_order.indexOf(image.source_paragraph)].allGraphics.push(graphic);
    return { source: image, graphic, rect: { isValid: true, parentPage: page, itemLayer: { visible: true }, geometricBounds: [10, 10, 100, 100] },
        anchor: { parent: { index: i * 20, parentStory: story } }, captionFrame: i ? null : {
            overflows: false, parentPage: page, parentStory: { paragraphs: [{ contents: fixture.textbox + '\r' }] } } };
});
story.allGraphics = records.map(r => r.graphic);
const docPrefs = { pageWidth: pt(185) + 0.01, pageHeight: pt(260) - 0.01 };
for (const key of ['documentBleedTopOffset', 'documentBleedBottomOffset', 'documentBleedInsideOrLeftOffset', 'documentBleedOutsideOrRightOffset']) docPrefs[key] = pt(3) + 0.01;
const doc = { pages: [page], fonts: [{ status: 1 }], documentPreferences: docPrefs, extractLabel: () => 'approved font' };
const result = { story, images: records, frames: [{ parentPage: page, geometricBounds: [85, 51, 680, 482], itemLayer: { visible: true }, textFramePreferences: { textColumnCount: 2, textColumnGutter: pt(6) + 0.01 } }],
    marker: { parentPage: page, overflows: false } };
assert.match(history.validate(doc, result, source, map, tokens, {}), /pages=1/);
// Estimated page count remains advisory, whereas real data defects fail.
for (const mutation of [
    () => { story.overflows = true; },
    () => { records[1].graphic.itemLink.status = 9; },
    () => { records[2].graphic.horizontalScale = 120; },
    () => { records[0].captionFrame.overflows = true; },
    () => { doc.fonts[0].status = 9; },
]) {
    mutation(); assert.throws(() => history.validate(doc, result, source, map, tokens, {}));
    story.overflows = false; records[1].graphic.itemLink.status = 1;
    records[2].graphic.horizontalScale = 100; records[0].captionFrame.overflows = false; doc.fonts[0].status = 1;
}
assert.throws(() => sourceModule.verifySource(root, { ...audit, source_sha256: 'wrong' }), /identity/);

const status = JSON.parse(read('workflow/MODULE_STATUS.json'));
assert.equal(status.history.runtimeTested, false); assert.equal(status.history.frozen, false);
assert.equal(status.history.status, 'IMPLEMENTED_PENDING_IND2026_TEST');
const build = read('build/13_history_test.jsx');
assert.ok(build.includes('focusDocumentPage();'));
assert.ok(build.includes('HISTORY_RUNTIME_REPORT.txt'));
assert.ok(!build.includes('.intro') && !build.includes('SHAN.chapter.create'));
assert.ok(!read('modules/history.jsx').includes('doc.stories'));
console.log('PASS History: locked DOCX/XML/24 original image hashes; every 216 source paragraphs and blanks; one approved move; 21 years; 5 caption relations; E4X fallback; SHA/Unicode; corruption/reorder/anchor/orphan/overset negative cases; JSX syntax+BOM; frozen scope checked by Python. Native InDesign/PDF acceptance pending.');
