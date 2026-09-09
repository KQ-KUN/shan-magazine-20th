/* Node logic/integration test; no claim of InDesign runtime acceptance. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const manifestText = read('spec/CONTENT_MANIFEST.json');
const manifest = JSON.parse(manifestText);
const moduleSource = read('modules/chapter.jsx');
// Node accepts BOM-less UTF-8, but the native ExtendScript include loader does not
// reliably detect this module's encoding. The native companion test proves it.
assert.equal(fs.readFileSync(path.join(root, 'modules/chapter.jsx')).subarray(0, 3).toString('hex'), 'efbbbf');
const entry = read('build/02_chapters.jsx').replace(/^#.*$/gm, '');

// Reuse the existing test fixture without editing the Foundation test file.
const fixtureSource = read('tests/foundation.test.js').split('const normal = environment();')[0];
assert.ok(fixtureSource.includes('function environment('));
const fixture = vm.createContext({ require, __dirname });
vm.runInContext(fixtureSource + '\nthis.makeEnvironment = environment;', fixture);
function setup(text = manifestText) {
    const env = fixture.makeEnvironment();
    const ctx = env.ctx;
    ctx.LocationOptions = { AT_END: 'AT_END' };
    ctx.$ = { fileName: path.join(root, 'build/02_chapters.jsx') };
    env.closed = 0;
    ctx.File = function (name) {
        return { fsName: name, exists: true,
            parent: { parent: { fsName: root } },
            open(mode) { assert.equal(mode, 'r'); return true; },
            read() { assert.equal(path.resolve(name), path.join(root, 'spec/CONTENT_MANIFEST.json')); return text; },
            close() { env.closed++; } };
    };
    const addDoc = ctx.app.documents.add;
    ctx.app.documents.add = function () {
        const doc = addDoc();
        function enhance(page) {
            Object.defineProperty(page.textFrames, 'length', { get() { return this.items.length; } });
            const add = page.textFrames.add;
            page.textFrames.add = function () {
                const frame = add.call(this);
                frame.parentStory.paragraphs.everyItem = () => frame.parentStory.paragraphs.item(0);
                return frame;
            };
            return page;
        }
        enhance(doc.pages.item(0));
        const addMaster = doc.masterSpreads.add;
        doc.masterSpreads.add = function (count) {
            const master = addMaster(count);
            master.isValid = true;
            return master;
        };
        doc.masterSpreads.itemByName = name => doc.masterSpreads.items.find(p => p.namePrefix + '-' + p.baseName === name) || { isValid: false };
        doc.pages.add = function (where) {
            assert.equal(where, 'AT_END');
            const left = doc.pages.length % 2 === 1;
            // Borrow the fixture page factory through a temporary mock document only.
            const fresh = fixture.makeEnvironment().ctx.app.documents.add().pages.item(0);
            fresh.side = left ? 'LEFT_HAND' : 'RIGHT_HAND';
            if (left) { fresh.bounds[1] = -fresh.bounds[3]; fresh.bounds[3] = 0; }
            doc.pages.items.push(enhance(fresh));
            return fresh;
        };
        return doc;
    };
    vm.runInContext(moduleSource, ctx);
    return env;
}
const env = setup();
vm.runInContext(entry, env.ctx);
const doc = env.made[0];
assert.equal(env.closed, 1);
assert.equal(doc.pages.length, 7);
assert.equal(doc.masterSpreads.length, 9);
assert.equal(env.ctx.app.scriptPreferences.measurementUnit, 'USER_UNIT');
assert.deepEqual(manifest.sections.map(s => s.cn), ['山口', '火种', '地层', '越岭', '星图', '此刻', '山外']);
const styles = { chapter_index: 'P_Chapter_Number', cn: 'P_Section_Title_CN', en: 'P_Section_Title_EN', intro: 'P_Chapter_Intro' };
const labels = new Set();
for (const [i, section] of manifest.sections.entries()) {
    const page = doc.pages.item(i);
    assert.equal(page.label, 'SHAN_CHAPTER:' + section.id);
    assert.equal(page.appliedMaster, doc.masterSpreads.itemByName('H-CHAPTER'));
    assert.equal(page.textFrames.length, i === 0 ? 3 : 4);
    const fields = i === 0 ? ['cn', 'en', 'intro'] : ['chapter_index', 'cn', 'en', 'intro'];
    assert.equal(section.chapter_index, i === 0 ? null : i);
    for (const [j, field] of fields.entries()) {
        const frame = page.textFrames.items[j];
        assert.equal(frame.label, 'SHAN_CHAPTER:' + section.id + ':' + field);
        assert.ok(!labels.has(frame.label)); labels.add(frame.label);
        assert.equal(frame.contents, String(section[field]));
        assert.equal(frame.parentStory.paragraphs.item(0).appliedParagraphStyle.name, styles[field]);
        const [y1, x1, y2, x2] = frame.geometricBounds;
        assert.ok(y1 >= page.bounds[0] && y2 <= page.bounds[2] && y2 > y1);
        assert.ok(x1 >= page.bounds[1] && x2 <= page.bounds[3] && x2 > x1);
        assert.equal(frame.textFramePreferences.textColumnCount, 1);
    }
}
for (const page of doc.masterSpreads.itemByName('H-CHAPTER').pages.items) { assert.equal(page.textFrames.items.length, 0); }
const snapshot = JSON.stringify(doc);
vm.runInContext(entry, env.ctx);
assert.equal(env.made.length, 2);
assert.equal(env.made[1].pages.length, 7);
assert.equal(JSON.stringify(doc), snapshot);
for (const field of ['id', 'chapter_index', 'cn', 'en', 'intro']) {
    const bad = JSON.parse(manifestText); delete bad.sections[3][field];
    const failed = setup(JSON.stringify(bad));
    assert.throws(() => vm.runInContext(entry, failed.ctx), /missing\/invalid|chapter_index/);
    assert.equal(failed.made.length, 0);
    assert.equal(failed.ctx.app.scriptPreferences.measurementUnit, 'USER_UNIT');
}
for (const mutate of [m => m.sections.pop(), m => m.sections[2].id = m.sections[1].id, m => m.sections[1].chapter_index = '1']) {
    const bad = JSON.parse(manifestText); mutate(bad);
    assert.throws(() => vm.runInContext(entry, setup(JSON.stringify(bad)).ctx));
}
for (const invalid of ['{"x":1,}', '[1,]', '{"x":1,"x":2}', '{"__proto__":{}}', '01', '1e999', '{};alert(1)', '"\\q"', '"\n"']) {
    assert.throws(() => env.ctx.SHAN.chapter.parseJSON(invalid));
}
const escaped = JSON.stringify({ text: '山\n\t"\\', values: [null, true, false, -1.25e-3] });
assert.equal(JSON.stringify(env.ctx.SHAN.chapter.parseJSON(escaped)), escaped);
assert.deepEqual(JSON.parse(JSON.stringify(env.ctx.SHAN.chapter.parseJSON('\uFEFF' + manifestText))), manifest);
assert.doesNotMatch(moduleSource + entry, /\beval\s*\(|\.place\s*\(|\.exportFile\s*\(|\.save\s*\(/);
const status = JSON.parse(read('workflow/MODULE_STATUS.json'));
for (const file of status.foundation.scope) {
    const frozen = execFileSync('git', ['show', 'foundation-v1.0:' + file], { cwd: root });
    assert.equal(read(file).replace(/\r\n/g, '\n'), frozen.toString('utf8').replace(/\r\n/g, '\n'), file + ' changed');
}
const frozenStatus = JSON.parse(execFileSync('git', ['show', 'foundation-v1.0:workflow/MODULE_STATUS.json'], { cwd: root, encoding: 'utf8' }));
assert.deepEqual(status.foundation, frozenStatus.foundation);
console.log('PASS: 7 manifest-driven chapter pages, labels/styles/content, no folios/article pages, validation, JSON, isolation, frozen Foundation; mock only.');
