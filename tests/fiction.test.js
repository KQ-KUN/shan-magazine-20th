const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('modules/fiction.jsx');
const ctx = vm.createContext({
    ResolveStyleClash: { RESOLVE_CLASH_USE_EXISTING: 'existing' },
    LocationOptions: { AT_END: 'end' },
    PageSideOptions: { LEFT_HAND: 'left' }
});
vm.runInContext(read('core/utils.jsx') + '\n' + read('core/document.jsx') + '\n' + source, ctx);
const fiction = ctx.SHAN.fiction;
const styles = Object.fromEntries(Object.values(fiction.styleMap).map(name => [name, { name, isValid: true }]));
const doc = { paragraphStyles: { itemByName: name => styles[name] || { isValid: false } },
    masterSpreads: { itemByName: name => ({ name, isValid: name === 'D-FICTION' }) },
    objectStyles: { itemByName: name => ({ name, isValid: name === 'O_Text_Main' }) } };
fiction.checkStyles(doc);
function story(names) {
    const paragraphs = names.map(name => ({
        appliedParagraphStyle: { name },
        // Misleading punctuation is deliberately irrelevant to classification.
        contents: 'Question? Speaker: Answer',
        applyParagraphStyle(style, clear) { assert.equal(clear, true); this.appliedParagraphStyle = style; }
    }));
    return { contents: 'Original text remains unchanged', paragraphs: { length: paragraphs.length, item: i => paragraphs[i] } };
}
const sample=story(['ArticleTitle','Author','FictionChapter','Body']);
fiction.mapStory(doc,sample);
assert.equal(sample.paragraphs.item(2).appliedParagraphStyle.name,'P_Fiction_Chapter');
const unknown = story(['ArticleTitle', 'Normal']);
assert.throws(() => fiction.mapStory(doc, unknown), /Unknown Word style: Normal/);
assert.equal(unknown.paragraphs.item(0).appliedParagraphStyle.name, 'ArticleTitle');
delete styles.P_Metadata;
assert.throws(() => fiction.checkStyles(doc), /Missing InDesign style: P_Metadata/);
styles.P_Metadata = { name: 'P_Metadata', isValid: true };

// Import preference restoration on both success and native placement failure.
for (const fail of [false, true]) {
    const original = { removeFormatting: true, preserveGraphics: true, useTypographersQuotes: true };
    let state = { ...original };
    const pref = new Proxy({}, {
        get(_, key) { return key === 'properties' ? { ...state } : state[key]; },
        set(_, key, value) { if (key === 'properties') state = value; else state[key] = value; return true; }
    });
    ctx.app = { wordRTFImportPreferences: pref };
    const file = {};
    const frame = { parentStory: sample, place(actual, show) {
        assert.equal(actual, file); assert.equal(show, false);
        assert.equal(pref.removeFormatting, false); assert.equal(pref.preserveGraphics, false);
        assert.equal(pref.useTypographersQuotes, false);
        if (fail) throw new Error('Native import failure');
    } };
    if (fail) assert.throws(() => fiction.importWord(frame, file), /Native import failure/);
    else assert.equal(fiction.importWord(frame, file), sample);
    assert.deepEqual(state, original);
}

// Exercise continuation and its non-progress overset guard, not just source presence.
const originalAdd = fiction.addFrame;
for (const stalled of [false, true]) {
    let count = 1;
    const makeFrame = () => ({ insertionPoints: { item(i) { assert.equal(i, -1); return { index: stalled ? 0 : count * 100 }; } } });
    const frames = [makeFrame()];
    const flowDoc = { recompose() {}, pages: { add(at) { assert.equal(at, 'end'); return {}; } } };
    const flowStory = { get overflows() { return stalled || count < 3; } };
    fiction.addFrame = () => { count++; const frame = makeFrame(); frames.push(frame); return frame; };
    if (stalled) assert.throws(() => fiction.flow(flowDoc, flowStory, frames[0], 'sample'), /overset remains/);
    else {
        assert.equal(fiction.flow(flowDoc, flowStory, frames[0], 'sample'), 3);
        assert.equal(frames[0].nextTextFrame, frames[1]); assert.equal(frames[1].nextTextFrame, frames[2]);
    }
}
fiction.addFrame = originalAdd;
const page = { side: 'left', bounds: [0,-185*72/25.4,260*72/25.4,0], marginPreferences: {}, textFrames: { add() { return {}; } } };
doc.swatches = { item() { return 'None'; } };
const frame = fiction.addFrame(doc, page, 'fiction_shao', 2);
assert.equal(page.appliedMaster.name, 'D-FICTION');
assert.equal(frame.appliedObjectStyle.name, 'O_Text_Main');
assert.equal(frame.label, 'SHAN_FICTION:fiction_shao:frame:2');
assert.equal(page.marginPreferences.columnCount, 6);
assert.ok(frame.geometricBounds[1] > page.bounds[1] && frame.geometricBounds[3] < 0);
const entry=read('build/05_fiction_test.jsx'),skin=read('visual/fiction_skin.jsx');
assert.equal((entry.match(/\.docx/g)||[]).length,1);
assert.ok(entry.includes('/manuscripts/04_fiction_四叠半_笠原JunE.docx'));
assert.doesNotMatch(source+skin+entry,/getFiles\s*\(|\beval\s*\(|C_SPECIAL_BLUE|fourfold_skin/);
ctx.SpanColumnTypeOptions={SPAN_COLUMNS:'span',SINGLE_COLUMN:'single'};
vm.runInContext(skin,ctx);
let chapterDef;
ctx.SHAN.typography={apply(d,t){chapterDef=t.paragraph_styles.P_Fiction_Chapter;}};
const objectStyle={textFramePreferences:{}};
doc.objectStyles.itemByName=()=>objectStyle;doc.extractLabel=()=>'';doc.insertLabel=()=>{};
const t=JSON.parse(read('spec/FICTION_TOKENS.json'));
ctx.SHAN.fictionSkin.apply(doc,t,{font_stacks:{}},{});
assert.equal(chapterDef.size_pt,13.5);
assert.equal(objectStyle.textFramePreferences.textColumnCount,2);
assert.equal(objectStyle.textFramePreferences.textColumnGutter,'6 mm');
for(const n of ['P_Article_Title','P_Author','P_Metadata','P_Fiction_Chapter']) {assert.equal(styles[n].spanColumnType,'span');assert.equal(styles[n].spanSplitColumnCount,2);}
assert.equal(styles.P_Body_CN.spanColumnType,'single');
const fixture=JSON.parse(fs.readFileSync(0,'utf8'));
assert.equal(fixture.roles.filter(x=>x==='FictionChapter').length,6);
assert.equal(fixture.texts[fixture.roles.indexOf('Author')],'笠原JunE');
const real=story(fixture.roles);const counts=fiction.mapStory(doc,real);assert.equal(counts.FictionChapter,6);assert.equal(counts.Body,154);
for(const file of ['modules/fiction.jsx','visual/fiction_skin.jsx','build/05_fiction_test.jsx']) assert.equal(fs.readFileSync(path.join(root,file)).subarray(0,3).toString('hex'),'efbbbf');
const status=JSON.parse(read('workflow/MODULE_STATUS.json'));
for(const mod of ['foundation','chapter','interview','visual_system']){
 const tag=mod==='visual_system'?'visual-system-v1.0':mod+'-v1.0';
 const baseline=JSON.parse(execFileSync('git',['show',tag+':workflow/MODULE_STATUS.json'],{cwd:root,encoding:'utf8'}));
 assert.deepEqual(status[mod],baseline[mod]);
 for(const file of status[mod].scope) assert.equal(read(file).replace(/\r\n/g,'\n'),execFileSync('git',['show',tag+':'+file],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n'));
}
assert.equal(status.fiction.frozen,false);
console.log('PASS Fiction: source/author/6 chapters, mapping/errors, import restoration, flow/stall, D-FICTION, spans/columns, BOM and frozen modules.');
