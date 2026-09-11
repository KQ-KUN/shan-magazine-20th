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
        const name = buffer.subarray(at + 46, at + 46 + nameLength).toString('utf8');
        const local = buffer.readUInt32LE(at + 42);
        const data = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
        const compressed = buffer.subarray(data, data + size);
        entries[name] = method === 0 ? compressed : zlib.inflateRawSync(compressed);
        at += 45 + nameLength + extraLength + commentLength;
    }
    return entries;
}
const docx = zipEntries(fs.readFileSync(path.join(root, 'manuscripts', '07_memoir_Gloomy_Biologist_Cry_笠原JunE_CLEAN.docx')));
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
assert.equal(fixture.texts[fixture.roles.indexOf('ArticleTitle')], 'Gloomy Biologist Cry');
assert.equal(fixture.texts[fixture.roles.indexOf('Author')], '文/笠原JunE');
assert.deepEqual(fixture.texts.filter((_, i) => fixture.roles[i] === 'MemoirSection'), [
    '1、青春症候群', '2、熙熙攘攘的科幻', '3、科幻、孤独与蓝色星球', '4、春日幻影', '5、聿日箋秋', '6、In your sci-fi eyes'
]);
assert.equal(fixture.roles.filter(role => role === 'Media').length, 1);
assert.deepEqual(fixture.texts.filter((_, i) => /^(?:Caption|caption)$/.test(fixture.roles[i])), ['茫茫宇宙你不孤单；“8bit poster”']);

const manifest = JSON.parse(read('assets/GLOOMY_MEDIA_MANIFEST.json'));
assert.deepEqual({ article_id: manifest.article_id, file: manifest.file, anchor_position: manifest.anchor_position, placed_graphics: manifest.placed_graphics },
    { article_id: 'memoir_gloomy_biologist_cry', file: 'assets/gloomy_media_strip.png', anchor_position: 'ABOVE_LINE', placed_graphics: 1 });
const media = fs.readFileSync(path.join(root, manifest.file));
assert.equal(media.subarray(1, 4).toString('ascii'), 'PNG');

const ctx = vm.createContext({ ResolveStyleClash: { RESOLVE_CLASH_USE_EXISTING: 'existing' }, LocationOptions: { AT_END: 'end' }, PageSideOptions: { LEFT_HAND: 'left' }, FitOptions: { PROPORTIONALLY: 'proportional', CENTER_CONTENT: 'center' }, AnchorPosition: { ABOVE_LINE: 'above' } });
vm.runInContext(read('modules/memoir.jsx'), ctx);
const memoir = ctx.SHAN.memoir;
ctx.SHAN.utils = { pt: value => value * 72 / 25.4 };
const styles = Object.fromEntries(Object.values(memoir.styleMap).map(name => [name, { name, isValid: true }]));
const paragraphs = fixture.roles.map((name, i) => ({ appliedParagraphStyle: { name }, contents: fixture.texts[i], insertionPoints: { item: () => ({}) }, applyParagraphStyle(style, clear) { assert.equal(clear, true); this.appliedParagraphStyle = style; } }));
const story = { contents: fixture.texts.join('\r'), allGraphics: [], paragraphs: { length: paragraphs.length, item: i => paragraphs[i] } };
const counts = memoir.mapStory({ paragraphStyles: { itemByName: name => styles[name] || { isValid: false } } }, story);
assert.equal(counts.MemoirSection, 6); assert.equal(counts.Media, 1); assert.equal((counts.Caption || 0) + (counts.caption || 0), 1);
assert.equal(story.contents, fixture.texts.join('\r'));

for (const fail of [false, true]) {
    const original = { removeFormatting: true, preserveGraphics: false, useTypographersQuotes: true };
    let state = { ...original };
    const pref = new Proxy({}, { get(_, key) { return key === 'properties' ? { ...state } : state[key]; }, set(_, key, value) { if (key === 'properties') state = value; else state[key] = value; return true; } });
    ctx.app = { wordRTFImportPreferences: pref };
    const frame = { parentStory: story, place(_, show) { assert.equal(show, false); assert.equal(pref.preserveGraphics, false); if (fail) throw new Error('Native import failure'); } };
    if (fail) assert.throws(() => memoir.importWord(frame, {}), /Native import failure/); else assert.equal(memoir.importWord(frame, {}), story);
    assert.deepEqual(state, original);
}

const rect = { anchoredObjectSettings: {}, place(file, show) { assert.equal(file.exists, true); assert.equal(show, false); }, fit(option) { assert.ok(['proportional', 'center'].includes(option)); } };
rect.anchoredObjectSettings.insertAnchoredObject = (_, position) => { assert.equal(position, 'above'); story.contents += '\uFFFC'; story.allGraphics.push({}); };
const mediaDoc = { pages: { item: () => ({ rectangles: { add: () => rect } }) }, swatches: { item: () => 'None' }, recompose() {} };
memoir.placeMedia(mediaDoc, story, { exists: true }, manifest.width_mm, manifest.height_mm);
assert.equal(story.allGraphics.length, 1);
assert.equal(memoir.textOnly(story.contents), fixture.texts.join('\r'));

const skinCtx = vm.createContext({ SpanColumnTypeOptions: { SPAN_COLUMNS: 'span', SINGLE_COLUMN: 'single' } });
vm.runInContext(read('visual/memoir_skin.jsx'), skinCtx);
const collection = { values: { 'P_Article_Title': { name: 'P_Article_Title', isValid: true }, 'P_Author': { name: 'P_Author', isValid: true }, '[No Paragraph Style]': { name: '[No Paragraph Style]', isValid: true } },
    item(i) { return typeof i === 'number' ? this.values['[No Paragraph Style]'] : (this.values[i] || { isValid: false }); },
    itemByName(name) { return this.item(name); },
    add(properties) { const value = { name: properties.name, isValid: true }; this.values[properties.name] = value; return value; } };
const objectStyle = { textFramePreferences: {} };
const doc = { paragraphStyles: collection, objectStyles: { itemByName: () => objectStyle }, extractLabel: () => '', insertLabel() {} };
skinCtx.SHAN.utils = { ensureNamed(c, name) { const found = c.item(name); return found.isValid ? found : c.add({ name }); }, pt: value => value * 72 / 25.4 };
skinCtx.SHAN.typography = { apply(d, defs) { for (const name of Object.keys(defs.paragraph_styles)) assert.equal(d.paragraphStyles.item(name).isValid, true); } };
const tokens = JSON.parse(read('spec/MEMOIR_TOKENS.json'));
skinCtx.SHAN.memoirSkin.apply(doc, tokens, { font_stacks: {} }, {});
assert.equal(objectStyle.textFramePreferences.textColumnCount, 2);
assert.equal(objectStyle.textFramePreferences.textColumnGutter, '6 mm');
for (const name of tokens.span_styles) assert.equal(collection.item(name).spanColumnType, 'span');
assert.equal(collection.item('P_Memoir_Body').spanColumnType, 'single');

for (const file of ['modules/memoir.jsx', 'visual/memoir_skin.jsx', 'build/06_memoir_test.jsx']) assert.equal(fs.readFileSync(path.join(root, file)).subarray(0, 3).toString('hex'), 'efbbbf');
const buildText = read('build/06_memoir_test.jsx');
assert.ok(buildText.includes('/manuscripts/07_memoir_Gloomy_Biologist_Cry_笠原JunE_CLEAN.docx'));
assert.ok(buildText.includes('/assets/GLOOMY_MEDIA_MANIFEST.json'));
const status = JSON.parse(read('workflow/MODULE_STATUS.json'));
assert.deepEqual({ status: status.memoir.status, runtimeTested: status.memoir.runtimeTested, designValuesPending: status.memoir.designValuesPending, frozen: status.memoir.frozen },
    { status: 'IMPLEMENTED_PENDING_IND2026_TEST', runtimeTested: false, designValuesPending: true, frozen: false });
for (const mod of ['foundation', 'chapter', 'interview', 'visual_system', 'fiction']) {
    const tag = mod === 'visual_system' ? 'visual-system-v1.0' : `${mod.replace('_', '-')}-v1.0`;
    execFileSync('git', ['diff', '--exit-code', `${tag}^{}`, '--', ...status[mod].scope], { cwd: root });
}
console.log('PASS Memoir clean media: title/author, 6 sections, caption, clean import preferences, anchored strip, spans/columns, BOM and frozen scopes.');
