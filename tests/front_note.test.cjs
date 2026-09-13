const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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
        const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
        const compressed = buffer.subarray(start, start + size);
        entries[name] = method === 0 ? compressed : zlib.inflateRawSync(compressed);
        at += 45 + nameLength + extraLength + commentLength;
    }
    return entries;
}

const sourcePath = path.join(root, 'manuscripts', '11_front_写在山前_FINAL.docx');
const source = fs.readFileSync(sourcePath);
const copyNote = read('spec/FINAL_COPY_SHA256.txt');
const recordedHash = copyNote.match(/sha256=([0-9a-f]{64})/)[1];
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), recordedHash);
const docx = zipEntries(source);
assert.equal(Object.keys(docx).filter(name => /^word\/media\/[^/]+$/.test(name)).length, 0);
const documentXml = docx['word/document.xml'].toString('utf8');
const decode = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const texts = [...documentXml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map(match =>
    decode([...match[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(value => value[1]).join('')));
assert.equal(texts.length, 9);
assert.equal(texts[0], '写在《山》前');
assert.equal(crypto.createHash('sha256').update(texts.join('\n')).digest('hex'), '9756ca7f409d2130b8317f47600aa04efb42a0a898726a807cfe60230e0da833');
assert.equal((texts.join('\n').match(/因为山无处不在/g) || []).length, 1);

const context = vm.createContext({});
vm.runInContext(read('modules/front_note.jsx'), context);
const frontNote = context.SHAN.frontNote;
const styles = Object.fromEntries(['P_FrontNote_Title', 'P_FrontNote_Body', 'P_FrontNote_Signature'].map(name => [name, { name, isValid: true }]));
const paragraphs = texts.map(text => ({ contents: text, appliedParagraphStyle: null,
    applyParagraphStyle(style, clear) { assert.equal(clear, true); this.appliedParagraphStyle = style; } }));
const story = { contents: texts.join('\r'), paragraphs: { length: paragraphs.length, item: index => paragraphs[index] } };
const counts = frontNote.mapStory({ paragraphStyles: { itemByName: name => styles[name] } }, story, false);
assert.deepEqual(JSON.parse(JSON.stringify(counts)), { title: 1, body: 8, signature: 0 });
assert.equal(paragraphs[0].appliedParagraphStyle.name, 'P_FrontNote_Title');
assert.ok(paragraphs.slice(1).every(paragraph => paragraph.appliedParagraphStyle.name === 'P_FrontNote_Body'));
assert.equal(story.contents, texts.join('\r'));

const mainStory = { id: 7, contents: texts.join('\r'), overflows: false };
const pageBounds = [0, 0, 700, 500];
const frame = { geometricBounds: [90, 80, 620, 420], parentStory: mainStory, itemLayer: { visible: true } };
const mockDoc = { pages: { length: 1, item: () => ({ bounds: pageBounds, textFrames: { length: 1, item: () => frame } }) },
    extractLabel: () => 'article=front_note_shan; pages=1; overset=false; text unchanged=true' };
const rendered = frontNote.assertRendered(mockDoc, { pages: 1, story: mainStory }, texts[0], texts[texts.length - 1]);
assert.equal(rendered.textFrames, 1); assert.ok(rendered.visibleCharacters > 100); assert.equal(rendered.overset, false);

const tokens = JSON.parse(read('spec/FRONT_NOTE_TOKENS.json'));
assert.ok(tokens.text_width_mm >= 112 && tokens.text_width_mm <= 122);
assert.ok(tokens.title.size_pt >= 22 && tokens.title.size_pt <= 26);
assert.ok(tokens.body.size_pt >= 9.5 && tokens.body.size_pt <= 10);
assert.ok(tokens.body.leading_pt >= 15 && tokens.body.leading_pt <= 16);
const moduleText = read('modules/front_note.jsx'), skinText = read('visual/front_note_skin.jsx');
assert.ok(moduleText.includes('itemByName("I-FRONT")'));
assert.ok(moduleText.includes('while (story.overflows)'));
assert.ok(moduleText.includes('overset=" + story.overflows'));
assert.doesNotMatch(moduleText + skinText + JSON.stringify(tokens), /star|nebula|illustration|pull.?quote|星空|星云|插画/i);

for (const file of ['modules/front_note.jsx', 'visual/front_note_skin.jsx', 'build/10_front_note_test.jsx']) {
    assert.equal(fs.readFileSync(path.join(root, file)).subarray(0, 3).toString('hex'), 'efbbbf');
}
const build = read('build/10_front_note_test.jsx');
assert.ok(build.includes('/manuscripts/11_front_写在山前_FINAL.docx'));
assert.ok(build.includes('"front_note_shan"'));
assert.ok(build.includes('{ hasSignature: false }'));
assert.ok(build.includes('SHAN.frontNote.assertRendered'));
assert.ok(build.includes('app.activeWindow.activePage = doc.pages.item(0)'));
const base = JSON.parse(read('spec/VISUAL_TOKENS.json'));
assert.ok(base.running_system.hide_on_parents.includes('I-FRONT'));

const status = JSON.parse(read('workflow/MODULE_STATUS.json'));
assert.deepEqual({ status: status.front_note.status, runtimeTested: status.front_note.runtimeTested,
    designValuesPending: status.front_note.designValuesPending, frozen: status.front_note.frozen },
{ status: 'IMPLEMENTED_PENDING_IND2026_TEST', runtimeTested: false, designValuesPending: true, frozen: false });
for (const mod of ['foundation', 'chapter', 'interview', 'visual_system', 'fiction', 'memoir', 'feature']) {
    const tag = mod === 'visual_system' ? 'visual-system-v1.0' : `${mod.replace('_', '-')}-v1.0`;
    execFileSync('git', ['diff', '--exit-code', `${tag}^{}`, '--', ...status[mod].scope], { cwd: root });
}
console.log('PASS Front Note: locked copy/hash, title + 8 body paragraphs, I-FRONT, one column, token bounds, continuation/overset reporting, BOM and frozen scopes.');
