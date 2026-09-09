const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('modules/interview.jsx');
const ctx = vm.createContext({
    ResolveStyleClash: { RESOLVE_CLASH_USE_EXISTING: 'existing' },
    LocationOptions: { AT_END: 'end' },
    PageSideOptions: { LEFT_HAND: 'left' }
});
vm.runInContext(read('core/utils.jsx') + '\n' + read('core/document.jsx') + '\n' + source, ctx);
const interview = ctx.SHAN.interview;
const expected = Object.fromEntries([...read('spec/WORD_STYLE_MAP.md').matchAll(/^(\w+) → (\w+)$/gm)].map(m => [m[1], m[2]]));
assert.deepEqual(Object.keys(interview.styleMap).sort(), ['ArticleTitle','ArticleSubtitle','Author','Metadata','Caption','InterviewQuestion','InterviewAnswer'].sort());
for (const [name, mapped] of Object.entries(interview.styleMap)) { assert.equal(mapped, expected[name]); }
const styles = Object.fromEntries(Object.values(interview.styleMap).map(name => [name, { name, isValid: true }]));
const doc = { paragraphStyles: { itemByName: name => styles[name] || { isValid: false } },
    masterSpreads: { itemByName: name => ({ name, isValid: name === 'B-INTERVIEW' }) },
    objectStyles: { itemByName: name => ({ name, isValid: name === 'O_Text_Main' }) } };
interview.checkStyles(doc);
function story(names) {
    const paragraphs = names.map(name => ({
        appliedParagraphStyle: { name },
        // Misleading punctuation is deliberately irrelevant to classification.
        contents: 'Question? Speaker: Answer',
        applyParagraphStyle(style, clear) { assert.equal(clear, true); this.appliedParagraphStyle = style; }
    }));
    return { contents: 'Original text remains unchanged', paragraphs: { length: paragraphs.length, item: i => paragraphs[i] } };
}
const sample = story(['ArticleTitle', 'ArticleSubtitle', 'Author', 'Metadata', 'InterviewQuestion', 'InterviewAnswer', 'Caption']);
interview.mapStory(doc, sample);
assert.equal(sample.paragraphs.item(4).appliedParagraphStyle.name, 'P_Interview_Q');
assert.equal(sample.paragraphs.item(5).appliedParagraphStyle.name, 'P_Interview_A');
const unknown = story(['ArticleTitle', 'Normal']);
assert.throws(() => interview.mapStory(doc, unknown), /Unknown Word style: Normal/);
assert.equal(unknown.paragraphs.item(0).appliedParagraphStyle.name, 'ArticleTitle');
delete styles.P_Metadata;
assert.throws(() => interview.checkStyles(doc), /Missing InDesign style: P_Metadata/);
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
    if (fail) assert.throws(() => interview.importWord(frame, file), /Native import failure/);
    else assert.equal(interview.importWord(frame, file), sample);
    assert.deepEqual(state, original);
}

// Exercise continuation and its non-progress overset guard, not just source presence.
const originalAdd = interview.addFrame;
for (const stalled of [false, true]) {
    let count = 1;
    const makeFrame = () => ({ insertionPoints: { item(i) { assert.equal(i, -1); return { index: stalled ? 0 : count * 100 }; } } });
    const frames = [makeFrame()];
    const flowDoc = { recompose() {}, pages: { add(at) { assert.equal(at, 'end'); return {}; } } };
    const flowStory = { get overflows() { return stalled || count < 3; } };
    interview.addFrame = () => { count++; const frame = makeFrame(); frames.push(frame); return frame; };
    if (stalled) assert.throws(() => interview.flow(flowDoc, flowStory, frames[0], 'sample'), /overset remains/);
    else {
        assert.equal(interview.flow(flowDoc, flowStory, frames[0], 'sample'), 3);
        assert.equal(frames[0].nextTextFrame, frames[1]); assert.equal(frames[1].nextTextFrame, frames[2]);
    }
}
interview.addFrame = originalAdd;
const page = { side: 'left', bounds: [0,-185*72/25.4,260*72/25.4,0], marginPreferences: {}, textFrames: { add() { return {}; } } };
doc.swatches = { item() { return 'None'; } };
const frame = interview.addFrame(doc, page, 'interview_shao', 2);
assert.equal(page.appliedMaster.name, 'B-INTERVIEW');
assert.equal(frame.appliedObjectStyle.name, 'O_Text_Main');
assert.equal(frame.label, 'SHAN_INTERVIEW:interview_shao:frame:2');
assert.equal(page.marginPreferences.columnCount, 6);
assert.ok(frame.geometricBounds[1] > page.bounds[1] && frame.geometricBounds[3] < 0);
const entry = read('build/03_interview_test.jsx');
assert.equal((entry.match(/\.docx/g) || []).length, 1);
assert.ok(entry.includes('/manuscripts/01_interview_邵珠瑜_贾锦阳.docx'));
assert.doesNotMatch(source + entry, /getFiles\s*\(|\beval\s*\(|\.exportFile\s*\(|\.save\s*\(/);
for (const file of ['modules/interview.jsx', 'build/03_interview_test.jsx']) {
    assert.equal(fs.readFileSync(path.join(root, file)).subarray(0,3).toString('hex'), 'efbbbf');
}
const status = JSON.parse(read('workflow/MODULE_STATUS.json'));
for (const module of ['foundation', 'chapter']) {
    const tag = module + '-v1.0';
    const baseline = JSON.parse(execFileSync('git', ['show', tag + ':workflow/MODULE_STATUS.json'], { cwd: root, encoding: 'utf8' }));
    assert.deepEqual(status[module], baseline[module]);
    for (const file of status[module].scope) {
        const frozen = execFileSync('git', ['show', tag + ':' + file], { cwd: root, encoding: 'utf8' });
        assert.equal(read(file).replace(/\r\n/g,'\n'), frozen.replace(/\r\n/g,'\n'), file);
    }
}
console.log('PASS: Interview mapping/errors, text preservation, import restoration, continuation/stall overset, Parent/grid, single source, BOM, frozen files; mock only.');
