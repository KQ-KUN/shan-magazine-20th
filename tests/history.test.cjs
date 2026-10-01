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

function File(filename) {
    return { fsName: filename, exists: fs.existsSync(filename), encoding: 'UTF-8',
        open() { return this.exists; }, close() {}, read() { return fs.readFileSync(filename, this.encoding === 'BINARY' ? 'latin1' : 'utf8'); } };
}
const ctx = vm.createContext({ File,
    SHAN: { utils: { pt: n => n * 72 / 25.4, moduleWidthMM: () => 122 / 6 }, spec: { gutterMM: 6 } },
    LinkStatus: { NORMAL: 1 }, FontStatus: { INSTALLED: 1 }, app: { version: 'MOCK_ONLY' } });
// Do not simulate E4X as ordinary objects again: all E4X accesses must fail.
for (const name of ['XML', 'XMLList', 'Namespace', 'QName']) {
    Object.defineProperty(ctx, name, { get() { throw new Error('E4X must not participate in History source reading: ' + name); } });
}
for (const file of ['modules/history_source.jsx', 'modules/history.jsx', 'modules/history_runtime.jsx', 'visual/history_skin.jsx', 'build/13_history_test.jsx']) {
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
assert.deepEqual(Array.from(source.paragraphs), fixture.paragraphs, 'production string parser reads actual locked XML and matches independent Python reader, every paragraph');
assert.equal(source.textboxes[0].text, fixture.textbox);
const wordURI = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const documentXML = body => `<w:document xmlns:w="${wordURI}" xmlns:mc="urn:compat"><w:body>${body}</w:body></w:document>`;
const paragraphs = xml => Array.from(sourceModule.parse(xml).paragraphs);
assert.throws(() => sourceModule.parse(`<w:document xmlns:w="${wordURI}"/>`), /Expected one Word XML body; found 0/);
assert.throws(() => sourceModule.parse(documentXML('<w:p/>').replace('</w:document>', '<w:body/></w:document>')), /body; found 2/);
assert.throws(() => sourceModule.parse(documentXML('<w:p/>').replace('<w:body>', '<w:body xmlns:w="urn:not-word">')),
    /body; found 0; direct children=.*body\{urn:not-word\}/);
assert.throws(() => sourceModule.parse(documentXML('<w:p/>').replace(/w:document/g, 'w:body')), /XML root; found body/);
assert.throws(() => sourceModule.parse(documentXML('<w:p/>').replace(wordURI, 'urn:not-word')), /root namespace/);
assert.deepEqual(paragraphs(documentXML('<x:p xmlns:x="urn:not-word"><x:t>foreign</x:t></x:p><w:p/>')), ['']);
assert.deepEqual(paragraphs(documentXML('<w:p/>').replace(/w:/g, 'z:').replace('xmlns:w=', 'xmlns:z=')), [''], 'prefix spelling does not determine identity');
assert.deepEqual(paragraphs(`<document xmlns="${wordURI}"><body><p><r><t> A——\u200e\t </t></r></p></body></document>`), [' A——\u200e\t ']);
assert.deepEqual(paragraphs(documentXML('<w:p/><w:p><w:r/></w:p>')), ['', ''], 'empty paragraphs survive');
assert.deepEqual(paragraphs(documentXML('<w:p><w:r><w:t xml:space="preserve"> A&amp;lt;&lt;&gt;&quot;&apos;&#9;&#13;&#x1F600;e\u0301 </w:t><w:tab/><w:br/></w:r></w:p>')),
    [' A&lt;<>"\'\t\r😀e\u0301 \t\n'], 'single entity decode, tabs, breaks, supplementary and combining characters unchanged');
assert.deepEqual(paragraphs(documentXML('<w:p><w:r><w:t><![CDATA[ &not-an-entity; < > ]]></w:t></w:r></w:p>')), [' &not-an-entity; < > ']);
assert.deepEqual(paragraphs('<?xml version="1.0"?>\n<!--before--> ' + documentXML('<w:p note="a > b"><!--inside--><w:r><w:t>A</w:t><w:t>B</w:t></w:r></w:p>')), ['AB']);
const floatingXML = documentXML('<w:p><w:r><w:t>main</w:t><mc:AlternateContent><mc:Choice><w:drawing><w:txbxContent><w:p><w:r><w:t>caption</w:t></w:r></w:p></w:txbxContent></w:drawing></mc:Choice><mc:Fallback><w:p><w:r><w:t>duplicate</w:t></w:r></w:p></mc:Fallback></mc:AlternateContent></w:r></w:p><w:p/>');
const floatingParsed = sourceModule.parse(floatingXML);
assert.deepEqual(Array.from(floatingParsed.paragraphs), ['main', '']);
assert.equal(floatingParsed.textboxes.length, 1); assert.equal(floatingParsed.textboxes[0].text, 'caption');
for (const malformed of [documentXML('<w:p>').replace('</w:body>', '</w:p>'),
    documentXML('<w:p>').slice(0, -5), '<!DOCTYPE document [<!ENTITY x "content">]>' + documentXML('<w:p/>'),
    documentXML('<w:p><w:t>&unknown;</w:t></w:p>'), documentXML('<w:p><w:t>&#0;</w:t></w:p>'),
    documentXML('<w:p><w:t>&#xD800;</w:t></w:p>'), documentXML('<w:p><w:t>&#1114112;</w:t></w:p>'),
    documentXML('<unbound:p/>'), documentXML('<w:p key="1" key="2"/>'),
    documentXML('<w:p/>') + documentXML('<w:p/>')]) {
    assert.throws(() => sourceModule.parse(malformed), /XML/);
}
assert.throws(() => sourceModule.wordChildren(undefined, 'body'), /Missing parsed XML children/);
assert.throws(() => sourceModule.wordChildren({ children: [undefined] }, 'body'), /Missing parsed XML child 0/);
assert.ok(!/new\s+(?:XML|Namespace|QName)\b|\.nodeKind\(|\.elements\(/.test(read('modules/history_source.jsx')));
// The screenshot's failing literal must not return, even if Node accepts it.
assert.ok(!read('modules/history_source.jsx').includes('/^<([^\\s/>]+)/'), 'avoid the tag-name literal rejected by the native compiler');
assert.ok(!/\.exec\([^\n]*\)\[/.test(read('modules/history_source.jsx')), 'resolve and validate regex matches before indexing');
const nativeRegExp = vm.runInContext('RegExp', ctx);
for (const failedPattern of ['^<([A-Za-z_][A-Za-z0-9_.:-]*)', '^</([A-Za-z_][A-Za-z0-9_.:-]*)']) {
    ctx.RegExp = function (pattern) {
        return pattern === failedPattern ? { exec: () => null } : new nativeRegExp(pattern);
    };
    try { assert.throws(() => sourceModule.parse(documentXML('<w:p/>')), /Missing XML (opening|closing) tag name at character/); }
    finally { ctx.RegExp = nativeRegExp; }
}
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
history.addFrame = () => ({ insertionPoints: [{ index: 10 }] });
const oversetStory = { overflows: true }, frame = { insertionPoints: [{ index: 10 }] };
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

// Host collections/specifiers can be absent or expire after an anchor insertion.
assert.equal(sourceModule.at(undefined, 0), null);
assert.equal(sourceModule.at({ length: 0 }, -1), null);
assert.equal(sourceModule.at({ length: 1, 0: { id: 1 } }, -2), null);
const nativeCollection = { length: 1, 0: { isValid: true, id: 88 } };
let collectionValidityReads = 0;
Object.defineProperty(nativeCollection, 'isValid', { get() {
    collectionValidityReads++;
    throw Object.assign(new Error("Object does not support the property or method 'isValid'"), { number: 55 });
} });
assert.equal(sourceModule.at(nativeCollection, 0).id, 88);
assert.equal(collectionValidityReads, 0, 'collection lookup must not read unsupported isValid');
assert.equal(history.field({ paragraphs: nativeCollection }, 'paragraphs', 'native story'), nativeCollection);
assert.equal(history.paragraph({ paragraphs: nativeCollection }, 0).id, 88);
assert.throws(() => history.valid({ get isValid() { throw Object.assign(new Error('real host failure'), { number: 54 }); } }, 'DOM member'), /real host failure/);
assert.throws(() => history.paragraph({ paragraphs: [{ isValid: false }] }, 0), /invalid.*paragraph/i);
assert.throws(() => sourceModule.assertParagraphs({ paragraphs: undefined }, source, map), /paragraph/i);
assert.throws(() => history.linePosition({ parentTextFrames: [] }), /line parent frame/);
assert.throws(() => history.linePosition({ parentTextFrames: [{ parentPage: null }] }), /parentPage/);
assert.throws(() => history.yearChecks({ paragraphs: map.paragraph_order.map(() => ({ lines: undefined })) }, map), /lines/);
assert.throws(() => history.graphicsOf({}, 'source paragraph 90'), /source paragraph 90 graphics/);

const runtime = { setStage(name, detail) { this.stage = name; Object.assign(this, detail); } };
history.runtime = runtime;
Object.assign(runtime, { image_index: 7, source_paragraph: 90, anchor: 'paragraph_start' });
const imageContext = /History image 7 \/ source paragraph 90 \/ anchor paragraph_start:/;
assert.throws(() => history.insertion({ contents: 'text\r', insertionPoints: [] }, 'paragraph_start'), error =>
    imageContext.test(error.message) && /missing insertion point/.test(error.message));
const points = Array.from({ length: 6 }, (_, index) => ({ index, parentStory: { id: 456 } }));
points.item = () => { throw new Error('array-like points must use a legal positive bracket index'); };
assert.equal(history.insertion({ contents: 'text\r', insertionPoints: points }, 'after_text').index, 4);
assert.equal(history.insertion({ contents: 'text', insertionPoints: points }, 'after_text').index, 5);
assert.equal(history.insertion({ contents: '\r', insertionPoints: [points[0], points[1]] }, 'after_text').index, 0);
assert.equal(history.insertion({ contents: 'text\r', insertionPoints: points }, 'paragraph_start').index, 0);
assert.throws(() => history.insertion({ contents: '\r', insertionPoints: [points[0]] }, 'after_text'), /before paragraph delimiter/);
const indexedCalls = [];
assert.equal(history.insertion({ contents: 'text\r', insertionPoints: { length: 6, item(index) {
    indexedCalls.push(index); return points[index];
} } }, 'after_text').index, 4);
assert.deepEqual(indexedCalls, [4]);

ctx.FitOptions = { PROPORTIONALLY: 1, CENTER_CONTENT: 2 };
ctx.AnchorPosition = { INLINE_POSITION: 1 };
ctx.Leading = { AUTO: 1635019116 };
function placementDOM() {
    const paragraph = { isValid: true, contents: 'text\r', insertionPoints: points };
    const graphic = { isValid: true }, rect = { isValid: true, allGraphics: [graphic], place() {}, fit() {} };
    rect.anchoredObjectSettings = { insertAnchoredObject(point) { rect.parent = { parentStory: point.parentStory }; } };
    const captionFrame = { isValid: true, textFramePreferences: {}, parentStory: { paragraphs: [{ applyParagraphStyle() {} }] } };
    const page = { rectangles: { add: () => rect }, textFrames: { add: () => captionFrame } };
    const named = { length: 1, 0: {}, itemByName: () => ({ isValid: true }) };
    const doc = { objectStyles: named, paragraphStyles: named, swatches: [{}], groups: { add: () => undefined } };
    return { paragraph, graphic, rect, page, doc, captionFrame };
}
const imageMap = { image_index: 7, source_paragraph: 90, anchor: 'paragraph_start' };
const place = (dom, caption = null) => history.image(dom.doc, dom.page, audit.assets[6], {}, dom.paragraph, imageMap, caption, tokens);
let placement = placementDOM();
assert.equal(place(placement).rect, placement.rect);
assert.equal(placement.rect.parent.leading, ctx.Leading.AUTO, 'generated inline character must reserve image height');
assert.equal(placement.paragraph.contents, 'text\r', 'line-height correction must not insert text controls');
assert.equal(runtime.stage, 'history-create:image-7');
placement = placementDOM(); placement.paragraph.insertionPoints = undefined;
assert.throws(() => place(placement), error => imageContext.test(error.message) && /insertionPoints/.test(error.message));
placement = placementDOM(); placement.rect.allGraphics = undefined;
assert.throws(() => place(placement), error => imageContext.test(error.message) && /graphics/.test(error.message));
placement = placementDOM(); placement.rect.anchoredObjectSettings = undefined;
assert.throws(() => place(placement), error => imageContext.test(error.message) && /anchoredObjectSettings/.test(error.message));
placement = placementDOM();
assert.throws(() => place(placement, 'existing caption'), error => imageContext.test(error.message) && /floating caption group/.test(error.message));
assert.equal(runtime.operation, 'create floating caption group');
placement = placementDOM(); placement.rect.anchoredObjectSettings.insertAnchoredObject = () => { placement.rect.isValid = false; };
assert.throws(() => place(placement), error => imageContext.test(error.message) && /anchored rectangle\/group/.test(error.message));
placement = placementDOM(); placement.rect.anchoredObjectSettings.insertAnchoredObject = () => { placement.rect.parent = {}; };
assert.throws(() => place(placement), error => imageContext.test(error.message) && /parentStory/.test(error.message));
history.runtime = null;

// Execute the real create loop with specifiers that expire on EACH insertion.
// The image double simulates mutation; this does not certify native anchoring.
const savedMethods = Object.fromEntries(['addFrame', 'chapterMarker', 'image', 'flow', 'validate'].map(key => [key, history[key]]));
const currentStory = { id: 999, paragraphs: [] };
function liveParagraph(contents) {
    return { isValid: true, contents, applyParagraphStyle() {},
        insertionPoints: Array.from({ length: contents.length + 1 }, (_, index) => ({ index, parentStory: currentStory })) };
}
const bodyFrame = { parentStory: currentStory };
Object.defineProperty(bodyFrame, 'contents', { set(text) {
    currentStory.paragraphs = text.slice(0, -1).split('\r').map(text => liveParagraph(text + '\r'));
} });
const created = [], stages = [];
const createRuntime = { setStage(name, detail) { this.stage = name; Object.assign(this, detail); stages.push(name); } };
history.addFrame = () => bodyFrame; history.chapterMarker = () => ({});
history.image = (doc, page, asset, file, paragraph, imageMap) => {
    assert.equal(paragraph.isValid, true, `image ${imageMap.image_index} got an expired paragraph`);
    const index = map.paragraph_order.indexOf(imageMap.source_paragraph);
    assert.equal(paragraph, currentStory.paragraphs[index]);
    paragraph.isValid = false;
    paragraph.insertionPoints.forEach(point => { point.isValid = false; });
    currentStory.paragraphs[index] = liveParagraph(paragraph.contents.replace(/\r$/, '\ufffc\r'));
    created.push(imageMap.image_index);
    return { source: imageMap };
};
history.flow = () => [bodyFrame]; history.validate = () => 'mock validation';
const createDoc = { pages: [{ textFrames: [] }], textPreferences: {},
    masterSpreads: { itemByName: () => ({ isValid: true }) }, paragraphStyles: { itemByName: () => ({ isValid: true }) }, insertLabel() {} };
try {
    const result = history.create(createDoc, root, source, map, audit, tokens, {}, { runtime: createRuntime });
    assert.deepEqual(created, Array.from({ length: 24 }, (_, i) => 24 - i));
    assert.equal(result.images.length, 24);
    assert.equal(stages[0], 'history-create:text'); assert.equal(stages[1], 'history-create:styles');
    assert.ok(stages.includes('history-create:image-24') && stages.includes('history-create:image-1'));
    assert.deepEqual(stages.slice(-2), ['history-flow', 'history-validate']);
    sourceModule.assertParagraphs(currentStory, source, map);
} finally { Object.assign(history, savedMethods); history.runtime = null; }

// Run the top-level build in a VM with failure-injected APIs, never InDesign.
// Check original locations survive label/log/focus failures and no rethrow occurs.
const buildCode = read('build/13_history_test.jsx').replace(/^\uFEFF/, '').replace(/^#(?:target|include).*$/gm, '');
function diagnosticRun(failStage, { failLog = false, failCleanup = false, withoutSource = false } = {}) {
    const writes = {}, alerts = [], consoleLines = [], nativeError = new TypeError('undefined is not an object');
    Object.assign(nativeError, { fileName: 'modules/history.jsx', line: 173, source: 'native DOM failure' });
    if (withoutSource) delete nativeError.source;
    const fail = stage => { if (stage === failStage) throw nativeError; };
    let closeCount = 0, focusedPage = null;
    const document = { id: 71, isValid: true, pages: [{ isValid: true, id: 17, name: '1', textFrames: [] }], masterSpreads: [], extractLabel: () => '',
        insertLabel() { if (failCleanup) throw new Error('secondary label failure'); },
        close() { closeCount++; throw new Error('must retain failed document'); } };
    const preferences = { measurementUnit: 19 };
    const window = { parent: document, get activePage() { return focusedPage; }, set activePage(page) { focusedPage = page; } };
    function MockFile(filename) { return { fsName: filename, parent: { parent: { fsName: root } },
        open() { if (failLog) throw new Error('secondary log failure'); return true; },
        write(text) { if (filename.endsWith('HISTORY_RUNTIME_REPORT.txt')) fail('write-report');
            writes[path.basename(filename)] = text; }, close() {} }; }
    const state = vm.createContext({ File: MockFile, Folder: filename => ({ fsName: filename, exists: true }),
        $: { fileName: root + '/build/13_history_test.jsx', stack: 'ORIGINAL MOCK STACK', writeln: text => consoleLines.push(text) },
        alert: text => alerts.push(text), MeasurementUnits: { POINTS: 72 },
        app: { scriptPreferences: preferences, layoutWindows: [1],
            get activeWindow() { if (failCleanup) throw new Error('secondary focus failure'); fail('focus-document-page');
                return window; } },
        SHAN: { chapter: { parseJSON: filename => filename.endsWith('CONTENT_MANIFEST.json') ?
                { sections: [{ id: 'strata', chapter_index: 2, display_index: '贰' }] } : {} },
            historySource: { require: sourceModule.require, at: sourceModule.at, read: file => file.fsName,
                verifySource() { fail('verify-source'); return {}; } },
            visualTokens: { read() { fail('read-json'); return {}; } },
            document: { create(context) { context.document = document; fail('create-document'); return document; } },
            styles: { create() { fail('create-foundation-styles'); } }, parents: { create() { fail('create-parents'); } },
            typography: { apply() { fail('apply-typography'); } }, runningSystem: { apply() { fail('apply-running-system'); } },
            historySkin: { apply() { fail('apply-history-skin'); } },
            history: { create(doc, root, source, map, audit, tokens, section, context) {
                if (['focus-document-page', 'write-report'].includes(failStage)) return { report: 'mock data checks' };
                context.runtime.setStage(failStage, { image_index: 7, source_paragraph: 90, anchor: 'paragraph_start',
                    frame_label: 'SHAN_HISTORY:image:7', operation: 'insert anchored object' });
                throw nativeError;
            } } } });
    vm.runInContext(read('modules/history_runtime.jsx').replace(/^\uFEFF/, ''), state);
    assert.doesNotThrow(() => vm.runInContext(buildCode, state), 'top-level catch must not rethrow original error');
    assert.equal(preferences.measurementUnit, 19);
    assert.equal(closeCount, 0);
    if (failStage === 'create-document' && !failCleanup) assert.equal(focusedPage, document.pages[0], 'retain and focus partially created document');
    assert.equal(alerts.length, 1);
    assert.ok(alerts[0].includes('stage=' + failStage));
    assert.ok(alerts[0].includes('undefined is not an object') && alerts[0].includes('原始行号=173'));
    const diagnostic = writes['HISTORY_RUNTIME_ERROR.txt'] || consoleLines.join('\n');
    for (const expected of ['stage=' + failStage, 'name=TypeError', 'message=undefined is not an object',
        'fileName=modules/history.jsx', 'line=173', '$.stack=ORIGINAL MOCK STACK']) {
        assert.ok(diagnostic.includes(expected), expected);
    }
    if (withoutSource) assert.ok(!/^source=/m.test(diagnostic));
    else assert.ok(diagnostic.includes('source=native DOM failure'));
    if (!failLog) {
        for (const field of ['documentPages=', 'historyStoryExists=false', 'firstPageHistoryTextFrames=0',
            '[focus:finally]', 'activePageAfter=', 'activePageIsParent=']) assert.ok(diagnostic.includes(field), field);
    }
    return { writes, alerts, diagnostic };
}
for (const stage of ['read-json', 'verify-source', 'create-document', 'create-foundation-styles', 'create-parents',
    'apply-typography', 'apply-running-system', 'apply-history-skin', 'history-create:text', 'history-create:styles',
    'history-create:image-7', 'history-flow', 'history-validate', 'write-report']) diagnosticRun(stage);
for (const options of [{}, { failCleanup: true }, { failLog: true, failCleanup: true }, { withoutSource: true }]) {
    const { diagnostic } = diagnosticRun('history-create:image-7', options);
    for (const field of ['image_index=7', 'source_paragraph=90', 'anchor=paragraph_start',
        'frame_label=SHAN_HISTORY:image:7', 'operation=insert anchored object']) assert.ok(diagnostic.includes(field));
}

// Parent-view state is independent of complete, page-local History data.
const runtimeProbe = ctx.SHAN.historyRuntime;
const documentSpread = { id: 801, name: 'document spread' };
const parentSpread = { id: 901, name: 'I-FRONT', pages: [] };
const parentPage = { id: 902, name: 'I', parent: parentSpread };
parentSpread.pages.push(parentPage);
page.name = '1'; page.parent = documentSpread;
story.label = 'SHAN_HISTORY:main';
page.textFrames = [{ label: 'SHAN_HISTORY:body', parentPage: page, parentStory: story }];
doc.id = 71; doc.masterSpreads = [parentSpread];
let firstPageRequests = 0;
doc.pages.item = index => { assert.equal(index, 0); firstPageRequests++; return page; };
for (const collection of [doc.pages, page.textFrames, story.paragraphs, story.allGraphics, doc.fonts, doc.masterSpreads]) {
    Object.defineProperty(collection, 'isValid', { get() { throw new Error('collection does not support isValid'); } });
}
const snapshot = runtimeProbe.snapshot(doc, result, source, map);
assert.equal(snapshot.documentPages, 1); assert.equal(snapshot.firstPageHistoryTextFrames, 1);
assert.equal(snapshot.historyStoryExists, true); assert.ok(snapshot.historyCharacters > 100);
assert.equal(snapshot.historyParagraphs, 216); assert.equal(snapshot.historyTextEquality, 'PASS');
assert.equal(snapshot.historyYears, 21); assert.equal(snapshot.historyImages, 24); assert.equal(snapshot.historyOverset, false);
assert.equal(snapshot.historyFontsInstalled, true); assert.equal(snapshot.historyLinksNormal, true);
assert.equal(snapshot.errors.length, 0);
function makeWindow(mode = 'normal') {
    let visible = parentPage, spread = parentSpread, writes = 0;
    return { parent: doc, get writes() { return writes; }, bringToFront() { ctx.app.activeWindow = this; },
        get activePage() { return visible; }, set activePage(value) {
            writes++; if (mode === 'throw') throw new Error('activePage setter rejected');
            if (mode !== 'stuck') { visible = value; spread = value.parent; }
        }, get activeSpread() { return spread; }, set activeSpread(value) { if (mode !== 'stuck') spread = value; } };
}
let window = makeWindow(); ctx.app.layoutWindows = [window]; ctx.app.activeWindow = window; doc.layoutWindows = [window];
const afterRenderer = runtimeProbe.focusDocumentPage(doc, 'after-renderer', true);
const afterFinally = runtimeProbe.focusDocumentPage(doc, 'finally', true);
assert.equal(afterRenderer.activePageBefore, 'I-FRONT'); assert.equal(afterRenderer.activePageAfter, '1');
assert.equal(afterRenderer.activePageIsParent, false); assert.equal(afterRenderer.focusSucceeded, true);
assert.equal(afterFinally.focusSucceeded, true); assert.ok(window.writes >= 2 && firstPageRequests >= 3);
const focusedReport = runtimeProbe.format(snapshot, [afterRenderer, afterFinally]);
for (const field of ['documentPages=1', 'targetPage=1', 'activePageBefore=I-FRONT', 'activePageAfter=1',
    'activePageIsParent=false', '[focus:after-renderer]', '[focus:finally]', 'historyParagraphs=216', 'historyImages=24']) assert.ok(focusedReport.includes(field));
for (const mode of ['stuck', 'throw']) {
    window = makeWindow(mode); ctx.app.activeWindow = window; ctx.app.layoutWindows = [window]; doc.layoutWindows = [window];
    const view = runtimeProbe.focusDocumentPage(doc, 'after-renderer', true);
    assert.equal(view.focusSucceeded, false); assert.equal(view.activePageIsParent, true); assert.equal(view.activePageAfter, 'I-FRONT');
    assert.ok(view.warnings.includes('WARNING: History rendered, but InDesign view remained on Parent spread.'));
    const completeButParent = runtimeProbe.format(runtimeProbe.snapshot(doc, result, source, map), [view]);
    assert.ok(completeButParent.includes('historyTextEquality=PASS') && completeButParent.includes('historyImages=24'));
    assert.ok(!completeButParent.includes('FAIL'), 'view failure cannot turn complete content into a data failure');
}
window = makeWindow(); doc.layoutWindows = [window];
const otherWindow = { parent: { id: 999 }, activePage: { id: 1000, name: '99' }, activeSpread: { id: 1001 } };
ctx.app.activeWindow = otherWindow; ctx.app.layoutWindows = [otherWindow, window];
const differentDocumentFocus = runtimeProbe.focusDocumentPage(doc, 'after-renderer', true);
assert.equal(differentDocumentFocus.focusSucceeded, true); assert.equal(ctx.app.activeWindow, window);
assert.equal(otherWindow.activePage.name, '99', 'never assign a build page to an unrelated document window');
ctx.app.layoutWindows = [];
const headlessFocus = runtimeProbe.focusDocumentPage(doc, 'finally', true);
assert.equal(headlessFocus.focusSucceeded, false); assert.ok(headlessFocus.warnings.some(text => text.includes('no layout window')));
const emptyData = runtimeProbe.snapshot({ isValid: true, pages: [{ id: 1234, name: '1', textFrames: [] }] }, null, source, map);
assert.equal(emptyData.documentPages, 1); assert.equal(emptyData.historyStoryExists, false); assert.equal(emptyData.historyImages, 0);
assert.equal(emptyData.firstPageHistoryTextFrames, 0, 'empty actual pages are distinguishable from a Parent-only view');
assert.ok(!read('modules/history_runtime.jsx').includes('doc.stories'));

// Exercise the real build's PASS path, both focus calls, and final report rewrite.
story.contents = story.paragraphs.map(paragraph => paragraph.contents).join('');
for (const mode of ['normal', 'stuck', 'throw', 'silent']) {
    const window = makeWindow(mode === 'silent' ? 'normal' : mode), writes = {}, alerts = [];
    doc.layoutWindows = [window];
    const state = vm.createContext({
        File: filename => ({ fsName: filename, parent: { parent: { fsName: root } }, open: () => true, close() {},
            write: text => { writes[path.basename(filename)] = text; } }),
        Folder: filename => ({ fsName: filename, exists: true }),
        $: { fileName: root + '/build/13_history_test.jsx', stack: 'MOCK STACK', writeln() {} },
        alert: text => alerts.push(text), UserInteractionLevels: { NEVER_INTERACT: 0 },
        MeasurementUnits: { POINTS: 72 }, FontStatus: { INSTALLED: 1 }, LinkStatus: { NORMAL: 1 },
        app: { scriptPreferences: { measurementUnit: 19, userInteractionLevel: mode === 'silent' ? 0 : 1 }, layoutWindows: [window], activeWindow: window },
        SHAN: { chapter: { parseJSON: filename => ({
            'HISTORY_TOKENS.json': tokens, 'HISTORY_IMPORT_MAP.json': map, 'HISTORY_SOURCE_AUDIT.json': audit,
            'CONTENT_MANIFEST.json': { sections: [{ id: 'strata', chapter_index: 2, display_index: '贰' }] },
        }[path.basename(filename)]) },
        historySource: { require: sourceModule.require, read: file => file.fsName, verifySource: () => source, paragraphText: sourceModule.paragraphText },
        visualTokens: { read: () => ({}) }, document: { create(context) { context.document = doc; return doc; } },
        styles: { create() {} }, parents: { create() {} }, typography: { apply() {} }, runningSystem: { apply() {} }, historySkin: { apply() {} },
        history: { create() { return { ...result, report: 'PASS History data checks; pages=1; paragraphs=216; entries=21; images=24; overset=false' }; } } } });
    vm.runInContext(read('modules/history_runtime.jsx').replace(/^\uFEFF/, ''), state);
    assert.doesNotThrow(() => vm.runInContext(buildCode, state));
    assert.ok(!writes['HISTORY_RUNTIME_ERROR.txt'], 'focus failure is a WARNING, never a render failure');
    const report = writes['HISTORY_RUNTIME_REPORT.txt'];
    assert.ok(report.startsWith('PASS History data checks'));
    for (const field of ['documentPages=1', 'firstPageHistoryTextFrames=1', 'historyParagraphs=216', 'historyYears=21',
        'historyImages=24', 'historyOverset=false', 'historyTextEquality=PASS', '[focus:after-renderer]', '[focus:finally]']) assert.ok(report.includes(field), field);
    assert.equal(alerts.length, mode === 'silent' ? 0 : 1);
    if (mode !== 'silent') assert.ok(alerts[0].startsWith('PASS'));
    if (mode === 'normal' || mode === 'silent') assert.ok(report.includes('activePageAfter=1') && report.includes('activePageIsParent=false'));
    else assert.ok(report.includes('activePageIsParent=true') && alerts[0].includes('WARNING: History rendered, but InDesign view remained on Parent spread.'));
}

const status = JSON.parse(read('workflow/MODULE_STATUS.json'));
assert.equal(status.history.runtimeTested, false); assert.equal(status.history.frozen, false);
assert.equal(status.history.status, 'IMPLEMENTED_PENDING_IND2026_TEST');
const build = read('build/13_history_test.jsx');
assert.ok(build.includes('focusDocumentPage("after-renderer")'));
assert.ok(build.includes('focusDocumentPage("finally")'));
assert.ok(build.includes('HISTORY_RUNTIME_REPORT.txt'));
assert.ok(build.includes('HISTORY_RUNTIME_ERROR.txt'));
assert.ok(!/throw\s+e\s*;/.test(build), 'no top-level rethrow that masks original location');
assert.ok(!build.includes('.intro') && !build.includes('SHAN.chapter.create'));
assert.ok(!read('modules/history.jsx').includes('doc.stories'));
console.log('PASS History: locked DOCX/XML/24 original image hashes; actual production ES3 parser with E4X globals forbidden; every 216 source paragraphs and blanks; one approved move; 21 years; 5 caption relations; namespace/entity/CDATA/empty/floating/fallback/malformed XML regressions; SHA/Unicode; corruption/reorder/anchor/orphan/overset negative cases; missing/expired DOM and legal insertion indices; re-resolved paragraphs after all 24 anchors; original stage/file/line/context despite diagnostic cleanup failures; page-local data vs Parent view; two focus attempts, final report, stuck/throwing setters and other-document window; focus failure remains WARNING; JSX syntax+BOM; frozen scope checked by Python. Native InDesign/PDF acceptance pending.');
