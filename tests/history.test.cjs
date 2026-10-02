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
const display = JSON.parse(read('content/HISTORY_DISPLAY_MAP.json'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.deepEqual(map, fixture.map);
assert.deepEqual(audit, fixture.audit);

function File(filename) {
    return { fsName: filename, exists: fs.existsSync(filename), encoding: 'UTF-8',
        open() { return this.exists; }, close() {}, read() { return fs.readFileSync(filename, this.encoding === 'BINARY' ? 'latin1' : 'utf8'); } };
}
const ctx = vm.createContext({ File,
    SHAN: { chapter: { parseJSON: JSON.parse }, utils: { pt: n => n * 72 / 25.4, moduleWidthMM: () => 122 / 6 }, spec: { gutterMM: 6 } },
    LinkStatus: { NORMAL: 1 }, FontStatus: { INSTALLED: 1 }, app: { version: 'MOCK_ONLY' } });
// Do not simulate E4X as ordinary objects again: all E4X accesses must fail.
for (const name of ['XML', 'XMLList', 'Namespace', 'QName']) {
    Object.defineProperty(ctx, name, { get() { throw new Error('E4X must not participate in History source reading: ' + name); } });
}
// Node accepts ES3 future-reserved identifiers such as final; ExtendScript rejects them.
// This conservative token scan ignores comments/quoted strings, but is not a native compiler.
const es3FutureReserved = new Set(('abstract boolean byte char class const double enum export extends final float goto ' +
    'implements import int interface long native package private protected public short static super synchronized throws transient volatile').split(' '));
function assertNoES3ReservedIdentifiers(code, filename) {
    const stripped = code.replace(/\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g,
        match => match.replace(/[^\r\n]/g, ' '));
    for (const match of stripped.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
        assert.ok(!es3FutureReserved.has(match[0]), `${filename}: ES3 reserved identifier '${match[0]}' at line ${stripped.slice(0, match.index).split('\n').length}`);
    }
}
for (const word of es3FutureReserved) {
    assert.throws(() => assertNoES3ReservedIdentifiers(`var first, ${word};`, 'negative.jsx'), /ES3 reserved identifier/);
}
assert.throws(() => assertNoES3ReservedIdentifiers('var log = [], i, j, frame, bounds, lines, line, position, bottom, ends, final;', 'screenshot.jsx'),
    /reserved identifier 'final' at line 1/);
assert.doesNotThrow(() => assertNoES3ReservedIdentifiers('var isEndOfStory, finalReportError; // final\n/* native */ var text = "final"; var other = \'private\';', 'valid.jsx'));
for (const file of ['modules/history_source.jsx', 'modules/history.jsx', 'modules/history_runtime.jsx', 'visual/history_skin.jsx', 'build/13_history_test.jsx']) {
    assert.equal(fs.readFileSync(path.join(root, file)).subarray(0, 3).toString('hex'), 'efbbbf', file);
    const code = read(file).replace(/^\uFEFF/, '').replace(/^#(?:target|include).*$/gm, '');
    assertNoES3ReservedIdentifiers(code, file);
    new vm.Script(code, { filename: file });
    if (!file.startsWith('build/')) vm.runInContext(code, ctx);
}
const sourceModule = ctx.SHAN.historySource;
const history = ctx.SHAN.history;
// Execute the real History skin with a small style DOM, not only a syntax check.
const skinStyles = [{name:'[No Paragraph Style]'}];
skinStyles.itemByName = name => skinStyles.find(s=>s.name===name);
ctx.SHAN.utils.ensureNamed = (styles,name) => {
    let style=styles.itemByName(name); if(!style){style={name};styles.push(style);} return style;
};
for (const name of ['P_Article_Title','P_Metadata']) ctx.SHAN.utils.ensureNamed(skinStyles,name);
ctx.SHAN.typography = { apply(doc,settings) {
    for (const [name,definition] of Object.entries(settings.paragraph_styles)) {
        const style=doc.paragraphStyles.itemByName(name); style.spaceAfter=definition.space_after_mm*72/25.4;
    }
} };
ctx.SpanColumnTypeOptions={SINGLE_COLUMN:1,SPAN_COLUMNS:2};ctx.Justification={LEFT_ALIGN:1,CENTER_ALIGN:2};
ctx.SHAN.historySkin.apply({paragraphStyles:skinStyles,extractLabel:()=>'',insertLabel(){}},tokens,{font_stacks:{}},{});
for(const name of ['P_History_Media','P_History_Media_Wide']) {
    const style=skinStyles.itemByName(name); assert.equal(style.justification,2);
    assert.equal(style.keepAllLinesTogether,false);assert.equal(style.keepFirstLines,1);assert.equal(style.keepLastLines,1);
}
for(const name of ['P_History_Media_Caption','P_History_Media_Wide_Caption']) {
    const style=skinStyles.itemByName(name);assert.equal(style.keepAllLinesTogether,true);assert.equal(style.keepWithNext,1);
}
for(const name of Object.keys(tokens.paragraph_styles)) assert.equal(skinStyles.itemByName(name).spanColumnType,1,'all History-specific styles are single-column');
assert.equal(skinStyles.itemByName('P_History_Event_Image').keepAllLinesTogether,false,'archive no longer locks the entire preceding source paragraph');
assert.equal(skinStyles.itemByName('P_History_Caption').keepWithNext,0,'caption never locks a following year');
assert.equal(skinStyles.itemByName('P_History_Roster').justification,1);
assert.equal(tokens.paragraph_styles.P_History_Roster.family,'sans_cn');
for (const bytes of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(63), 'a'.repeat(64), 'a'.repeat(65), '\x00\xff'.repeat(250)]) {
    assert.equal(sourceModule.sha256(bytes), hash(Buffer.from(bytes, 'latin1')));
}
for (const text of [' 山东大学\u200e——\t', '😀', 'e\u0301', '\r\n']) {
    assert.equal(sourceModule.utf8(text), Buffer.from(text).toString('latin1'));
}
const source = sourceModule.verifySource(root, audit);
sourceModule.validateDisplay(display, source, map);
map.history_display = display;
const rosterRanges = [[10,15],[19,27],[41,48],[55,55],[58,59],[64,69],[72,75],[78,84],[97,103],[108,113],
    [118,119],[124,128],[132,136],[140,144],[156,165],[173,173],[175,177],[180,184],[195,204]];
assert.deepEqual(display.roster_paragraphs, rosterRanges.flatMap(([a,b]) => Array.from({ length: b-a+1 }, (_,i) => a+i)));
assert.deepEqual(display.roster_tail_paragraphs, [166]);
const splitPrefixes = new Map([[12,'副秘书长'],[13,'事务部副部长'],[24,'事务部副部长'],[26,'秘书处副部长']]);
assert.deepEqual(display.transforms.filter(t => t.kind === 'roster_split').map(t => t.source_paragraph), [12,13,24,26]);
for (const transform of display.transforms.filter(t => t.kind === 'roster_split')) {
    assert.deepEqual(transform.insert_lf_offsets_utf16, [fixture.paragraphs[transform.source_paragraph-1].indexOf(splitPrefixes.get(transform.source_paragraph))]);
}
assert.deepEqual(display.transforms.filter(t => t.kind === 'media_block').map(t => [t.source_paragraph,t.insert_lf_offsets_utf16]),
    [[6,[fixture.paragraphs[5].length]],[90,[0]],[115,[0]],[189,[0]],[210,[0]]]);
assert.deepEqual(display.roster_activity_gaps.map(g => [g.last_roster,g.activity_paragraph,g.empty_paragraphs]),
    [[27,28,[]],[48,49,[]],[55,56,[]],[59,60,[]],[84,86,[85]],[103,104,[]],[113,114,[]],[119,120,[]],
        [128,129,[]],[136,137,[]],[144,146,[145]],[166,168,[167]],[184,186,[185]],[204,206,[205]]]);
for (let p = 1; p <= 216; p++) {
    const original = fixture.paragraphs[p-1], rendered = sourceModule.displayText(original,p,display);
    assert.equal(sourceModule.restoreDisplayText(rendered,p,display), original, `P${p} full reversible equality`);
    assert.equal(rendered.includes('\r'), original.includes('\r'), 'no new paragraph delimiters');
    assert.notEqual(sourceModule.restoreDisplayText(rendered+'\n',p,display), original, 'unrecorded LF must survive and fail equality');
    if (![6,12,13,24,26,90,115,189,210].includes(p)) assert.equal(rendered, original, `P${p} untouched`);
}
assert.equal(sourceModule.displayText(fixture.paragraphs[73],74,display), '学术部&兴隆山财务：张承奇', 'explicit shared-role exception stays intact');
for (const p of [20,99,113,162]) assert.equal(sourceModule.displayText(fixture.paragraphs[p-1],p,display), fixture.paragraphs[p-1], 'name lists and nested colons do not split');
for (const transform of display.transforms) {
    const p = transform.source_paragraph, rendered = sourceModule.displayText(fixture.paragraphs[p-1],p,display);
    const offset = transform.insert_lf_offsets_utf16[0];
    assert.throws(() => sourceModule.restoreDisplayText(rendered.slice(0,offset)+rendered.slice(offset+1),p,display), /display break/);
}
for (const mutate of [d => { d.source_sha256='wrong'; }, d => { d.transforms[0].insert_lf_offsets_utf16=[9999]; },
    d => { d.image_layouts[0].year_paragraph=7; }, d => { d.image_layouts[6].display_line=0; },
    d => { d.roster_activity_gaps[4].empty_paragraphs=[86]; }, d => { d.image_layouts.pop(); }]) {
    const bad = structuredClone(display); mutate(bad); assert.throws(() => sourceModule.validateDisplay(bad,source,map));
}
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
    return { paragraphs: map.paragraph_order.map(p => {
        let contents = sourceModule.displayText(fixture.paragraphs[p - 1], p, display) + '\r';
        for (const image of map.images.filter(image => image.source_paragraph === p).reverse()) {
            const layout = display.image_layouts[image.image_index - 1];
            let offset = image.anchor === 'after_text' ? contents.length - 1 : 0;
            if (image.anchor !== 'after_text') for (let i = 0; i < layout.display_line; i++) offset = contents.indexOf('\n', offset) + 1;
            contents = contents.slice(0, offset) + '\ufffc' + contents.slice(offset);
        }
        return { contents };
    }) };
}
sourceModule.assertParagraphs(makeStory(), source, map);
for (let i = 0; i < 216; i++) {
    const candidate = makeStory(); candidate.paragraphs[i].contents = candidate.paragraphs[i].contents.replace(/\r$/, '\n\r');
    assert.throws(() => sourceModule.assertParagraphs(candidate, source, map), /Text\/order changed|display break/, `P${map.paragraph_order[i]} unauthorized LF`);
}
// Negative tests exercise ALL paragraphs, including blank/image/list paragraphs.
for (let i = 0; i < map.paragraph_order.length; i++) {
    const story = makeStory(); story.paragraphs[i].contents = `X${story.paragraphs[i].contents}`;
    assert.throws(() => sourceModule.assertParagraphs(story, source, map), /Text\/order changed|display break/);
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

for (const [i, asset] of audit.assets.entries()) {
    const size = history.imageSize(asset, tokens.image_policy.preferences[i], tokens.image_policy);
    assert.ok(size.width > 0 && size.height > 0 && size.height < 200);
    assert.ok([2, 3, 6].includes(asset.modules));
    assert.equal(hash(fs.readFileSync(path.join(root, asset.file))), asset.sha256);
    assert.ok(Math.abs(size.height / size.contentWidth - (asset.pixel_height / asset.pixel_width) * (1 - asset.crop.t - asset.crop.b)) < 1e-10);
    assert.ok(asset.pixel_width * 25.4 / size.contentWidth >= 145 - 1e-9);
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
let storyOffset = 0;
story.paragraphs.forEach((p, i) => {
    let lineOffset = storyOffset;
    p.lines = p.contents.split('\n').map(text => {
        const composed = { ...line(0), insertionPoints: [{ index: lineOffset }] }; lineOffset += text.length + 1; return composed;
    }); p.allGraphics = [];
    const name = history.styleName(map.paragraph_order[i], map, tokens);
    p.appliedParagraphStyle = { name, spaceAfter: pt(tokens.paragraph_styles[name]?.space_after_mm || 0) };
    p.spanColumnType=1;
    p.spaceAfter = p.appliedParagraphStyle.spaceAfter;
    p.insertionPoints = [{ index: storyOffset }]; storyOffset += p.contents.length;
});
story.characters = [];
for (const paragraph of story.paragraphs) {
    let visualLine=0;
    for (const char of paragraph.contents) {
        story.characters.push({index:story.characters.length,contents:char,parentStory:story,lines:[paragraph.lines[visualLine]]});
        if(char==='\n')visualLine++;
    }
}
const records = map.images.map((image, i) => {
    const graphic = { id: i + 1, isValid: true, itemLink: { isValid: true, status: 1 }, horizontalScale: 100, verticalScale: 100, effectivePpi: [180,180] };
    const paragraph = story.paragraphs[map.paragraph_order.indexOf(image.source_paragraph)];
    paragraph.allGraphics.push(graphic);
    const previous = map.images.slice(0, i).filter(im => im.source_paragraph === image.source_paragraph).length;
    let local = -1; for (let j = 0; j <= previous; j++) local = paragraph.contents.indexOf('\ufffc', local + 1);
    return { source: image, layout: display.image_layouts[i], graphic, rect: { isValid: true, parentPage: page, itemLayer: { visible: true }, geometricBounds: [10 + i * 20, 10, 20 + i * 20, 20] },
        anchor: { parent: story.characters[paragraph.insertionPoints[0].index + local] }, captionFrame: i ? null : {
            geometricBounds:[20,10,30,20],overflows: false, parentPage: page, parentStory: { paragraphs: [{ contents: fixture.textbox + '\r' }] } } };
});
story.allGraphics = records.map(r => r.graphic);
const docPrefs = { pageWidth: pt(185) + 0.01, pageHeight: pt(260) - 0.01 };
for (const key of ['documentBleedTopOffset', 'documentBleedBottomOffset', 'documentBleedInsideOrLeftOffset', 'documentBleedOutsideOrRightOffset']) docPrefs[key] = pt(3) + 0.01;
const doc = { pages: [page], fonts: [{ status: 1 }], documentPreferences: docPrefs, extractLabel: () => 'approved font' };
const result = { story, images: records, frames: [{ contents:story.paragraphs.map(p=>p.contents).join(''),allGraphics:story.allGraphics,
    parentPage: page, geometricBounds: [85, 51, 680, 482], itemLayer: { visible: true }, textFramePreferences: { textColumnCount: 2, textColumnGutter: pt(6) + 0.01 } }],
    marker: { parentPage: page, overflows: false } };
assert.match(history.validate(doc, result, source, map, tokens, {}), /pages=1/);
assert.equal(history.styleName(38,map,tokens), 'P_History_Media_Caption');
assert.equal(history.styleName(39,map,tokens), 'P_History_Caption');
for (const p of [153,213]) assert.equal(history.styleName(p,map,tokens), 'P_History_Media');
for(const p of map.paragraph_order) assert.ok(!history.styleName(p,map,tokens).includes('Wide'),'no source paragraph uses a legacy spanning style');
for (const p of [15,69,75,173,177]) assert.equal(history.styleName(p,map,tokens), 'P_History_Roster', 'roster-only year has no forced activity gap');
assert.equal(tokens.paragraph_styles.P_History_Roster.space_after_mm,0);
assert.equal(tokens.paragraph_styles.P_History_Roster_Last.space_after_mm,5);
assert.equal(tokens.paragraph_styles.P_History_Empty_Roster_Gap.leading_pt,0.1);
assert.equal(tokens.paragraph_styles.P_History_Media_Wide.keep_with_next,0);
assert.equal(tokens.paragraph_styles.P_History_Media_Wide_Caption.keep_with_next,1);
assert.ok(tokens.image_policy.preferences.every(p=>p.span_columns===1));
assert.deepEqual(tokens.advisory_pages,[6,7],'page count stays advisory');
assert.equal(tokens.image_policy.double_column_max_mm,undefined);
for (const [i,pref] of tokens.image_policy.preferences.entries()) {
    assert.equal(pref.image_index,i+1);assert.ok(pref.width_mm<=70);
    assert.ok(pref.min_width_mm>0&&pref.min_width_mm<=pref.width_mm);
    assert.ok(history.imageSize(audit.assets[i],pref,tokens.image_policy).width<=70+0.01);
}
for (const asset of audit.assets) {
    const size = history.imageSize({ ...asset, original_width_mm:1 }, tokens.image_policy.preferences[0], tokens.image_policy);
    assert.ok(size.width>1,'Word physical width is no longer the image display limit');
}
const lowRes = history.imageSize({pixel_width:200,pixel_height:300,crop:{l:0,r:0,t:0,b:0}},
    {width_mm:73,span_columns:1},tokens.image_policy);
assert.ok(Math.abs(lowRes.width-200*25.4/145)<1e-9,'low-resolution display capped by source pixels');
const cropped = history.imageSize({pixel_width:600,pixel_height:900,crop:{l:0.1,r:0.2,t:0.1,b:0.05}},
    {width_mm:58,span_columns:1},tokens.image_policy);
assert.ok(Math.abs(cropped.width/cropped.contentWidth-0.7)<1e-9);
assert.ok(Math.abs(cropped.height/cropped.fullHeight-0.85)<1e-9,'only original crop preserved');
const checkDisplay = () => history.displayChecks(story,records,map,tokens,[]);
const firstRoster = story.paragraphs[map.paragraph_order.indexOf(12)];
const originalLines = firstRoster.lines; firstRoster.lines=[line(0)];
assert.throws(checkDisplay,/roles still share/); firstRoster.lines=originalLines;
const oldRoleIndex=firstRoster.lines[1].insertionPoints[0].index;
firstRoster.lines[1].insertionPoints[0].index-=1;
assert.throws(checkDisplay,/role does not start/); firstRoster.lines[1].insertionPoints[0].index=oldRoleIndex;
const lastRoster = story.paragraphs[map.paragraph_order.indexOf(204)];
const priorSpace=lastRoster.spaceAfter; lastRoster.spaceAfter=0;
assert.throws(checkDisplay,/spacing overridden/); lastRoster.spaceAfter=priorSpace;
const archiveParagraph=story.paragraphs[map.paragraph_order.indexOf(6)];
const archiveText=archiveParagraph.contents;
archiveParagraph.contents=archiveText.replace('\n','X');
assert.throws(checkDisplay,/interrupts a sentence/); archiveParagraph.contents=archiveText;
const priorBounds=records[1].rect.geometricBounds;
records[1].rect.geometricBounds=records[0].rect.geometricBounds;
assert.throws(checkDisplay,/blocks overlap/); records[1].rect.geometricBounds=priorBounds;
records[1].rect.geometricBounds=[30,0,40,pt(71)];
assert.throws(checkDisplay,/compact single-column maximum/);records[1].rect.geometricBounds=priorBounds;
records[1].rect.geometricBounds=[30,pt(72),40,pt(80)];
assert.throws(checkDisplay,/escapes its single body column/);records[1].rect.geometricBounds=priorBounds;
const imageParagraph=story.paragraphs[map.paragraph_order.indexOf(28)];
imageParagraph.spanColumnType=2;assert.throws(checkDisplay,/spans multiple/);imageParagraph.spanColumnType=1;
const frameContents=result.frames[0].contents;result.frames[0].contents='\r\n';result.frames[0].allGraphics=[];
assert.throws(()=>history.validate(doc,result,source,map,tokens,{}),/Empty generated History page/);
result.frames[0].contents=frameContents;result.frames[0].allGraphics=story.allGraphics;
const originalPpi=records[6].graphic.effectivePpi; records[6].graphic.effectivePpi=[80,80];
const visualWarnings=[]; history.displayChecks(story,records,map,tokens,visualWarnings);
assert.ok(visualWarnings.some(w=>w.includes('image 7 effective ppi')),'ppi preference is advisory, not fatal');
records[6].graphic.effectivePpi=originalPpi;
checkDisplay();
// Run the real bounded fit/resize code against a composition model. This verifies
// decisions and source preservation, not InDesign's actual recomposition behavior.
function compactModel(threshold=58,baselineMM=150) {
    const frame={id:88,parentPage:{id:1},geometricBounds:[0,0,pt(200),pt(152)],textFramePreferences:{textColumnGutter:pt(6)}};
    const previous={baseline:pt(baselineMM),horizontalOffset:0,parentTextFrames:[frame]};
    const next={baseline:pt(20),horizontalOffset:pt(79),parentTextFrames:[frame]};
    const rect={geometricBounds:[0,0,pt(64*545/818),pt(64)],label:'SHAN_HISTORY:image:15'};
    const graphic={geometricBounds:rect.geometricBounds.slice()};
    const content='活动正文\n\ufffc\r', compactStory={contents:content,characters:[]};
    const character={index:1,parentStory:compactStory,get lines(){return [(rect.geometricBounds[3]-rect.geometricBounds[1])/pt(1)<=threshold+0.001?previous:next];}};
    compactStory.characters=[{index:0,lines:[previous]},character];
    const record={source:map.images[14],asset:audit.assets[14],rect,graphic,anchor:{parent:character}};
    let recomposes=0;const doc={recompose(){recomposes++;}};
    return {doc,story:compactStory,record,content,get recomposes(){return recomposes;}};
}
let fit=compactModel();
const fitLog=history.compactImages(fit.doc,fit.story,[fit.record],{captions:[]},tokens);
assert.ok(fitLog.some(line=>line.includes('preceding_column_fit=true')));
assert.ok(Math.abs(fit.record.rect.geometricBounds[3]/pt(1)-58)<0.001);
assert.equal(fit.story.contents,fit.content,'fit never changes source controls/text');
assert.ok(fit.recomposes<=4,'bounded fit cannot add infinite pages or retries');
const g=fit.record.graphic.geometricBounds;
assert.ok(Math.abs((g[2]-g[0])/(g[3]-g[1])-545/818)<1e-9,'fit preserves pixel aspect ratio');
fit=compactModel(50);
assert.equal(history.compactImages(fit.doc,fit.story,[fit.record],{captions:[]},tokens).length,0);
assert.ok(Math.abs(fit.record.rect.geometricBounds[3]/pt(1)-64)<0.001,'failed fit restores the small preferred size and leaves flow in next column');
assert.ok(fit.recomposes<=6);assert.equal(fit.story.contents,fit.content);
fit=compactModel(58,198);
assert.equal(history.compactImages(fit.doc,fit.story,[fit.record],{captions:[]},tokens).length,0);
assert.equal(fit.recomposes,0,'do not attempt impossible minimum-height fit');
assert.throws(()=>history.compactImages(fit.doc,fit.story,[fit.record],{captions:[]},
    {...tokens,image_policy:{...tokens.image_policy,fit_step_mm:0}}),/bounded compact-fit/);
fit=compactModel();fit.record.captionFrame={geometricBounds:[1,2,3,4]};
history.resizeImage(fit.record,55,tokens);
assert.ok(Math.abs((fit.record.captionFrame.geometricBounds[3]-fit.record.captionFrame.geometricBounds[1])/pt(1)-55)<0.001);
assert.ok(Math.abs((fit.record.captionFrame.geometricBounds[2]-fit.record.captionFrame.geometricBounds[0])/pt(1)-6)<0.001,'floating caption box gets compact geometry without font scaling');
// A shared original caption follows BOTH small images as a single bounded unit.
const pairPolicy=structuredClone(tokens);pairPolicy.image_policy.preferences[0].width_mm=44;pairPolicy.image_policy.preferences[0].min_width_mm=40;
pairPolicy.image_policy.preferences[1].width_mm=54;pairPolicy.image_policy.preferences[1].min_width_mm=45;
const pairFrame={id:89,parentPage:{id:2},geometricBounds:[0,0,pt(200),pt(152)],textFramePreferences:{textColumnGutter:pt(6)}};
const pairPrevious={baseline:pt(150),horizontalOffset:0,parentTextFrames:[pairFrame]},pairNext={baseline:pt(30),horizontalOffset:pt(79),parentTextFrames:[pairFrame]};
const pairAsset={pixel_width:500,pixel_height:100,crop:{t:0,b:0,l:0,r:0}};
const pairStory={contents:'原文\r\ufffc\n\ufffc\r原图注\r',characters:[],paragraphs:[]};
const pairRecords=[44,54].map((w,i)=>{
    const rect={geometricBounds:[0,0,pt(w/5),pt(w)],label:'SHAN_HISTORY:image:'+(i+1)},graphic={};
    const parent={index:i===0?1:3,parentStory:pairStory,get lines(){return [rect.geometricBounds[3]/pt(1)<=(i===0?41:51)+0.001?pairPrevious:pairNext];}};
    return {source:{image_index:i+1,source_paragraph:1,anchor:'paragraph_start'},asset:pairAsset,rect,graphic,anchor:{parent}};
});
pairStory.characters=[{lines:[pairPrevious]},pairRecords[0].anchor.parent,{get lines(){return pairRecords[0].anchor.parent.lines;}},pairRecords[1].anchor.parent];
pairStory.paragraphs=[{get lines(){return pairRecords.every((r,i)=>r.rect.geometricBounds[3]/pt(1)<=(i===0?41:51)+0.001)?[pairPrevious]:[pairNext];}}];
const pairBefore=pairStory.contents;
assert.equal(history.compactImages({recompose(){}},pairStory,pairRecords,{paragraph_order:[1],captions:[{},
    {image_indices:[1,2],source_paragraph:1}]},pairPolicy).length,1);
assert.ok(Math.abs(pairRecords[0].rect.geometricBounds[3]/pt(1)-41)<0.001);
assert.ok(Math.abs(pairRecords[1].rect.geometricBounds[3]/pt(1)-51)<0.001);
assert.equal(pairStory.contents,pairBefore);
// Actual ending code, with recomposition models: these are not host/visual acceptance.
ctx.StartParagraph={NEXT_COLUMN:77,NEXT_PAGE:78};
assert.deepEqual(tokens.advisory_pages,[6,7]);
assert.deepEqual(tokens.ending_layout.shrink_factors,[0.9,0.8]);
function endingModel(threshold=0.91) {
    const pages=Array.from({length:7},(_,i)=>({id:i+1,name:String(i+1)}));
    const frames=pages.map((page,i)=>({id:200+i,label:'SHAN_HISTORY:body',parentPage:page,
        contents:i===6?'尾部文字\ufffc':'页面'+i,allGraphics:[],geometricBounds:[0,0,pt(200),pt(152)]}));
    const images=Array.from({length:24},(_,i)=>{
        const asset=audit.assets[i],w=tokens.image_policy.preferences[i].width_mm;
        const rect={parentPage:pages[i<15?0:i===15?4:5],label:'SHAN_HISTORY:image:'+(i+1),
            geometricBounds:[0,0,pt(w*asset.pixel_height/asset.pixel_width),pt(w)]};
        return {source:map.images[i],asset,rect,graphic:{geometricBounds:rect.geometricBounds.slice()},anchor:{}};
    });
    images[23].rect.parentPage=pages[6];
    const before='不变的全部正文\r\ufffc\r',story={contents:before,overflows:false};
    let recomposes=0;
    const doc={pages,recompose(){
        recomposes++;
        if(images[23].rect.geometricBounds[3]/pt(1)<=44*threshold+0.001)frames[6].contents='\r';
    }};
    return {doc,story,frames,images,before,get recomposes(){return recomposes;}};
}
let ending=endingModel();const earlyBounds=ending.images.slice(0,16).map(r=>r.rect.geometricBounds.slice());
let endingLog=history.refineEnding(ending.doc,ending.story,ending.frames,ending.images,map,tokens);
assert.ok(endingLog.some(s=>s.includes('shrink_factor=0.9')));
assert.ok(!endingLog.some(s=>s.includes('shrink_factor=0.8')),'stop after sufficient 10 percent shrink');
assert.ok(Math.abs(ending.images[23].rect.geometricBounds[3]/pt(1)-39.6)<0.001);
assert.deepEqual(ending.images.slice(0,16).map(r=>r.rect.geometricBounds),earlyBounds,'actual pages 1-5 images untouched, including requested image 16 if it landed there');
assert.equal(ending.story.contents,ending.before);
ending=endingModel(0.81);history.refineEnding(ending.doc,ending.story,ending.frames,ending.images,map,tokens);
assert.ok(Math.abs(ending.images[23].rect.geometricBounds[3]/pt(1)-35.2)<0.001,'20 percent is relative to original, not cumulative 28 percent');
assert.equal(ending.recomposes,2);
ending=endingModel();ending.frames[6].contents='\r';
assert.match(history.refineEnding(ending.doc,ending.story,ending.frames,ending.images,map,tokens)[0],/already fits/);
assert.equal(ending.recomposes,0,'already six pages remains unchanged');
ending=endingModel();const normalCompose=ending.doc.recompose;
ending.doc.recompose=()=>{normalCompose();ending.frames[0].contents='changed';};
assert.throws(()=>history.refineEnding(ending.doc,ending.story,ending.frames,ending.images,map,tokens),/earlier protected page/);
ending=endingModel();ending.doc.recompose=()=>{ending.images[0].rect.geometricBounds[0]+=pt(1);};
assert.throws(()=>history.refineEnding(ending.doc,ending.story,ending.frames,ending.images,map,tokens),/earlier protected image/);
ending=endingModel();ending.doc.recompose=()=>{ending.story.contents='changed source';ending.frames[6].contents='\r';};
assert.throws(()=>history.refineEnding(ending.doc,ending.story,ending.frames,ending.images,map,tokens),/changed source story/);
ending=endingModel(0.72);
endingLog=history.refineEnding(ending.doc,ending.story,ending.frames,ending.images,map,tokens);
assert.ok(endingLog.some(s=>s.includes('remaining_tail_fit_pass=')),'few remaining archives get smaller bounded sizes before fallback');
assert.equal(history.lastContentPage(ending.doc,ending.frames),6);
assert.ok(ending.images[23].rect.geometricBounds[3]/pt(1)>=30-0.001);
// Preserve earlier frames when arranging B; event local overrides change no characters.
function closingModel({overflowUntil=0.65,emptyRight=false,noBoundary=false,marchOnPrevious=false,marchAlreadyRight=false,eventsOnPrevious=false,depthMM=112,gapOverset=false}={}) {
    const page6={id:6},page7={id:7};
    const body={id:77,label:'SHAN_HISTORY:body',parentPage:page7,contents:'迎新\ufffc2026年3月\ufffc2026年4月\ufffc',allGraphics:[],
        geometricBounds:[0,0,pt(200),pt(152)],textFramePreferences:{textColumnGutter:pt(6)}};
    const previous={id:76,parentPage:page6,contents:'第6页原样',geometricBounds:[0,0,pt(200),pt(152)],textFramePreferences:{textColumnGutter:pt(6)}};
    const mkLine=(column,baseline,contents='正文')=>({baseline:pt(baseline),descent:0,contents,horizontalOffset:pt(column?79:0),parentTextFrames:[body]});
    body.lines=[mkLine(0,50),mkLine(1,112,emptyRight?'\r':'\ufffc')];
    const story={contents:'原稿与所有控制字符完全一致',overflows:false,paragraphs:[],characters:[]};
    const p212={contents:'2026年3月份…\r',lines:[mkLine(0,60)],insertionPoints:[{index:1}],startParagraph:0,keepWithNext:0};
    const p215={contents:'2026年4月…\r',lines:[mkLine(1,90)],insertionPoints:[{index:2}],startParagraph:0,keepWithNext:0};
    const poster={contents:'\ufffc\r',spaceBefore:0,lines:[mkLine(1,112,'\ufffc')]};
    if(marchAlreadyRight)p212.lines=[mkLine(1,60)];
    if(noBoundary)p212.lines=p215.lines=[];
    if(marchOnPrevious)p212.lines=[{...mkLine(0,160),parentTextFrames:[previous]}];
    if(eventsOnPrevious){p212.lines=[{...mkLine(0,170),parentTextFrames:[previous]}];p215.lines=[{...mkLine(1,185),parentTextFrames:[previous]}];}
    story.paragraphs=[p212,p215,poster];story.characters=[{lines:[mkLine(0,50)]},{lines:[mkLine(1,80)]}];
    const records=[21,22,23,24].map(index=>{
        const asset=audit.assets[index-1],width=44;
        const rect={parentPage:index===21?page6:page7,label:'SHAN_HISTORY:image:'+index,geometricBounds:[0,0,pt(35),pt(width)]};
        return {source:map.images[index-1],asset,rect,graphic:{},anchor:{}};
    });
    let recomposes=0;
    const doc={pages:Array.from({length:5},(_,i)=>({id:i+1})).concat(page6,page7),recompose(){
        recomposes++;
        body.lines[1].baseline=pt(depthMM+Math.max(0,poster.spaceBefore/pt(1)-12));
        story.overflows=(body.geometricBounds[2]/pt(1)/200)<overflowUntil-0.001 || (gapOverset&&poster.spaceBefore>pt(12)+0.01);
    }};
    return {doc,story,frames:[previous,body],images:records,body,poster,p212,p215,map:{paragraph_order:[212,215,216]},get recomposes(){return recomposes;}};
}
let closing=closingModel();const closingCopy=closing.story.contents;
const protectedPhoto=closing.images[0].rect.geometricBounds.slice();
const closingLog=history.designEndingTail(closing.doc,closing.story,closing.frames,closing.images,closing.map,tokens);
assert.ok(closingLog[0].includes('ending_plan=B')&&closingLog[0].includes('column_start_source=212'));
assert.equal(closing.p212.startParagraph,77);assert.equal(closing.p212.keepWithNext,1);
assert.deepEqual(closing.images[0].rect.geometricBounds,protectedPhoto,'never resize page6 image in fallback');
assert.ok(Math.abs(closing.images[1].rect.geometricBounds[3]/pt(1)-54)<0.001);
assert.ok(Math.abs(closing.images[3].rect.geometricBounds[3]/pt(1)-40)<0.001);
assert.equal(closing.body.geometricBounds[2],pt(130));assert.equal(closing.story.contents,closingCopy);
assert.equal(closing.story.overflows,false);assert.equal(closing.poster.spaceBefore,pt(12));
closing=closingModel({marchOnPrevious:true});
assert.ok(history.designEndingTail(closing.doc,closing.story,closing.frames,closing.images,closing.map,tokens)[0].includes('column_start_source=215'));
assert.equal(closing.p212.startParagraph,0,'March text already on page6 stays there');
closing=closingModel({marchAlreadyRight:true});
history.designEndingTail(closing.doc,closing.story,closing.frames,closing.images,closing.map,tokens);
assert.equal(closing.p212.startParagraph,0,'do not push an already-right-column event into an eighth page');
closing=closingModel({overflowUntil:0.8});
assert.ok(history.designEndingTail(closing.doc,closing.story,closing.frames,closing.images,closing.map,tokens).some(s=>s.includes('WARNING:')));
assert.equal(closing.story.overflows,false);assert.ok(closing.recomposes<=8,'bounded tail height retries');
closing=closingModel({depthMM:100});
history.designEndingTail(closing.doc,closing.story,closing.frames,closing.images,closing.map,tokens);
assert.ok(Math.abs(closing.poster.spaceBefore/pt(1)-22)<0.001,'poster shifts down within the bounded closing gap to reach 55 percent depth');
assert.equal(closing.story.overflows,false);
closing=closingModel({depthMM:100,gapOverset:true});
assert.ok(history.designEndingTail(closing.doc,closing.story,closing.frames,closing.images,closing.map,tokens).some(s=>s.includes('WARNING:')));
assert.ok(Math.abs(closing.poster.spaceBefore/pt(1)-12)<0.001,'failed density adjustment restores the safe gap');
assert.equal(closing.story.overflows,false);
closing=closingModel({emptyRight:true});
assert.throws(()=>history.designEndingTail(closing.doc,closing.story,closing.frames,closing.images,closing.map,tokens),/empty column/);
closing=closingModel({eventsOnPrevious:true});
history.designEndingTail(closing.doc,closing.story,closing.frames,closing.images,closing.map,tokens);
assert.equal(closing.p212.startParagraph,78,'poster-only fallback moves the original complete 2026 closing block at its boundary');
assert.equal(closing.p215.startParagraph,77);assert.equal(closing.story.contents,closingCopy);
closing=closingModel({noBoundary:true});
assert.throws(()=>history.designEndingTail(closing.doc,closing.story,closing.frames,closing.images,closing.map,tokens),/event boundary/);
closing=closingModel({overflowUntil:1.1});
assert.throws(()=>history.designEndingTail(closing.doc,closing.story,closing.frames,closing.images,closing.map,tokens),/without overset/);
const savedTail=history.designEndingTail;
ending=endingModel(0.6);let fallbackCalls=0;
history.designEndingTail=()=>{fallbackCalls++;return ['ending_plan=B'];};
try { assert.ok(history.refineEnding(ending.doc,ending.story,ending.frames,ending.images,map,tokens).includes('ending_plan=B'));assert.equal(fallbackCalls,1); }
finally { history.designEndingTail=savedTail;history.runtime=null; }
function tailModel({text='',graphics=[],extraItem=false,unthreaded=false,overflow=false,loseText=false}={}) {
    const before='完整首段\r\ufffc完整末段\r';let shrinkCount=0;
    const story={contents:before,overflows:false};
    const page1={id:1,pageItems:[]},page2={id:2,pageItems:[]};
    const first={id:11,label:'SHAN_HISTORY:body',parentPage:page1,contents:'完整正文\ufffc',allGraphics:[{}]};
    const tail={id:12,label:'SHAN_HISTORY:body',parentPage:page2,contents:text,allGraphics:graphics};
    const frames=unthreaded?[first]:[first,tail];page2.pageItems=unthreaded?[]:[tail];
    if(extraItem)page2.pageItems.push({id:99,label:'unrelated artwork'});
    const doc={pages:[page1,page2],recompose(){}};
    page2.remove=()=>{doc.pages.pop();if(loseText)story.contents='lost source';if(overflow)story.overflows=true;};
    const asset=audit.assets[23],w=tokens.image_policy.preferences[23].width_mm;
    const last={source:map.images[23],asset,rect:{label:'SHAN_HISTORY:image:24',geometricBounds:[0,0,pt(w*asset.pixel_height/asset.pixel_width),pt(w)]},graphic:{},anchor:{}};
    doc.recompose=()=>{if(story.overflows&&last.rect.geometricBounds[3]/pt(1)<=41+0.001){story.overflows=false;shrinkCount++;}};
    return {doc,story,frames,images:[...Array(23).fill({}),last],before,get shrinkCount(){return shrinkCount;}};
}
for(const options of [{},{text:'\r\n\t '},{unthreaded:true},{overflow:true}]) {
    const tail=tailModel(options);assert.equal(history.trimEmptyTail(tail.doc,tail.story,tail.frames,tail.images,tokens),1);
    assert.equal(tail.doc.pages.length,1);assert.equal(tail.frames.length,1);
    assert.equal(tail.story.contents,tail.before);assert.equal(tail.story.overflows,false);
    if(options.overflow)assert.equal(tail.shrinkCount,1,'terminal controls are fitted by shrinking the last image, never deleted');
}
for(const options of [{text:'正文'},{text:'\ufffc'},{graphics:[{}]},{extraItem:true}]) {
    const tail=tailModel(options);assert.equal(history.trimEmptyTail(tail.doc,tail.story,tail.frames,tail.images,tokens),0);
    assert.equal(tail.doc.pages.length,2,'do not delete content, images or non-History objects');
}
let tail=tailModel({loseText:true});assert.throws(()=>history.trimEmptyTail(tail.doc,tail.story,tail.frames,tail.images,tokens),/changed source story/);
tail=tailModel();tail.doc.pages[1].remove=()=>{};
assert.throws(()=>history.trimEmptyTail(tail.doc,tail.story,tail.frames,tail.images,tokens),/removal made no progress/);
tail=tailModel({overflow:true});tail.doc.recompose=()=>{};
assert.throws(()=>history.trimEmptyTail(tail.doc,tail.story,tail.frames,tail.images,tokens),/overset controls at minimum/,'a cleanup cannot silently pass with missing/overset text');
const densityFrame={id:20,parentPage:{id:1,name:'1'},geometricBounds:[0,0,pt(200),pt(152)],textFramePreferences:{textColumnGutter:pt(6)}};
densityFrame.lines=[{baseline:pt(80),descent:0,horizontalOffset:0,parentTextFrames:[densityFrame]},
    {baseline:pt(190),descent:0,horizontalOffset:pt(79),parentTextFrames:[densityFrame]}];
const density=history.columnDiagnostics([densityFrame]);
assert.ok(density.some(line=>line.includes('unused_tail_mm=120.0')));
assert.ok(density.some(line=>line.includes('WARNING: Half-column')),'layout density remains an explicit visual warning, not a guessed visual PASS');
densityFrame.lines.pop();
assert.ok(!history.columnDiagnostics([densityFrame]).some(line=>line.includes('WARNING:')),'natural EOF whitespace is distinguished from continuing-flow gaps');
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
// Actual block insertion coordinates, both before and after other reverse anchors.
const blockParagraph = contents => ({contents,insertionPoints:Array.from({length:contents.length+1},(_,index)=>({index}))});
assert.equal(history.insertion(blockParagraph('\n\r'),'paragraph_start',{display_line:1}).index,1);
assert.equal(history.insertion(blockParagraph('\n\ufffc\r'),'paragraph_start',{display_line:0}).index,0);
assert.equal(history.insertion(blockParagraph('\ufffc\n\ufffc\r'),'paragraph_start',{display_line:1}).index,2);
assert.equal(history.insertion(blockParagraph(fixture.paragraphs[5]+'\n\r'),'after_text',display.image_layouts[0]).index,fixture.paragraphs[5].length+1);
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
const savedMethods = Object.fromEntries(['addFrame', 'chapterMarker', 'image', 'flow', 'compactImages', 'refineEnding', 'trimEmptyTail', 'columnDiagnostics', 'validate'].map(key => [key, history[key]]));
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
history.image = (doc, page, asset, file, paragraph, imageMap, caption, tokens, layout) => {
    assert.equal(paragraph.isValid, true, `image ${imageMap.image_index} got an expired paragraph`);
    const index = map.paragraph_order.indexOf(imageMap.source_paragraph);
    assert.equal(paragraph, currentStory.paragraphs[index]);
    const insertion = history.insertion(paragraph, imageMap.anchor, layout).index;
    paragraph.isValid = false;
    paragraph.insertionPoints.forEach(point => { point.isValid = false; });
    currentStory.paragraphs[index] = liveParagraph(paragraph.contents.slice(0, insertion) + '\ufffc' + paragraph.contents.slice(insertion));
    created.push(imageMap.image_index);
    return { source: imageMap };
};
history.flow = () => [bodyFrame]; history.validate = () => 'mock validation';
history.compactImages = () => ['mock compact']; history.refineEnding = () => ['mock ending'];history.trimEmptyTail = () => 0;
history.columnDiagnostics=()=>['mock column diagnostics'];
const createDoc = { pages: [{ textFrames: [] }], textPreferences: {},
    masterSpreads: { itemByName: () => ({ isValid: true }) }, paragraphStyles: { itemByName: () => ({ isValid: true }) }, insertLabel() {} };
try {
    const result = history.create(createDoc, root, source, map, audit, tokens, {}, { runtime: createRuntime });
    assert.deepEqual(created, Array.from({ length: 24 }, (_, i) => 24 - i));
    assert.equal(result.images.length, 24);
    assert.equal(stages[0], 'history-create:text'); assert.equal(stages[1], 'history-create:display-map'); assert.equal(stages[2], 'history-create:styles');
    assert.ok(stages.includes('history-create:image-24') && stages.includes('history-create:image-1'));
    assert.deepEqual(stages.slice(-7), ['history-flow', 'history-compact-images', 'history-trim-empty-tail', 'history-ending-compact', 'history-trim-empty-tail', 'history-column-diagnostics', 'history-validate']);
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
    'history-create:image-7', 'history-flow', 'history-compact-images', 'history-ending-compact', 'history-ending-tail', 'history-trim-empty-tail', 'history-column-diagnostics', 'history-validate', 'write-report']) diagnosticRun(stage);
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
        historySource: { require: sourceModule.require, read: file => file.fsName, verifySource: () => source,
            paragraphText: sourceModule.paragraphText, restoreDisplayText: sourceModule.restoreDisplayText, displayTransform: sourceModule.displayTransform },
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
console.log('PASS History v3: all 216 source paragraphs reconstructed exactly; unauthorized text/LF negatives for all 216; 21 years, 24 original images, 5 captions; source SHA/BOM/ES3 reserved-word/parser/DOM/diagnostic/focus regressions; roster splits and 5mm gaps unchanged; all History media/caption styles single-column with no Wide mapping; max70mm + column geometry tolerance; no stretching/new crop; bounded previous-column fit, failed-fit restore, shared-caption unit; empty-tail deletion, control-only overset shrink, no deletion of content/images/unrelated items, no-progress/text-loss failures; density WARNING vs natural EOF; 6–7 pages advisory; ending-only 10/20-percent passes + source/prefix guard + two-column fallback regressions; frozen scope PASS. InDesign/PDF v3 acceptance pending; host not launched.');
