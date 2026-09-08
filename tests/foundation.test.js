/* Node 内置测试；测试替身仅验证逻辑和契约，不冒充 InDesign 引擎。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const core = ['utils', 'document', 'styles', 'parents'].map(name =>
    fs.readFileSync(path.join(root, 'core', name + '.jsx'), 'utf8')).join('\n');
const entry = fs.readFileSync(path.join(root, 'build/01_foundation.jsx'), 'utf8')
    .replace(/^#.*$/gm, '');
const spec = fs.readFileSync(path.join(root, 'spec/MAGAZINE_SPEC.md'), 'utf8');

function collection(initial = []) {
    const items = initial;
    return {
        get length() { return items.length; },
        item(index) { return items[index]; },
        itemByName(name) { return items.find(x => x.name === name) || { isValid: false }; },
        add(properties) {
            const item = Object.assign({ isValid: true, textFramePreferences: {} }, properties);
            items.push(item);
            return item;
        },
        items
    };
}

function environment(fail = false) {
    const messages = [];
    const made = [];
    const pt = mm => mm * 72 / 25.4;
    function page(left) {
        return {
            side: left ? 'LEFT_HAND' : 'RIGHT_HAND',
            bounds: left ? [0, -pt(185), pt(260), 0] : [0, 0, pt(260), pt(185)],
            marginPreferences: {},
            textFrames: {
                items: [],
                add() {
                    const frame = { textFramePreferences: {},
                        parentStory: { paragraphs: collection([{}]) } };
                    this.items.push(frame);
                    return frame;
                }
            }
        };
    }
    function document() {
        const doc = {
            documentPreferences: {}, viewPreferences: {}, marginPreferences: {},
            pages: collection([page(false)]), colors: collection(),
            swatches: collection([{ name: 'None' }]),
            paragraphStyles: collection([{ name: 'No paragraph style' }]),
            characterStyles: collection([{ name: 'None' }]),
            objectStyles: collection([{ name: 'None' }]), labels: {},
            insertLabel(key, value) { this.labels[key] = value; }
        };
        const masterItems = [];
        doc.masterSpreads = {
            get length() { return masterItems.length; },
            item(i) { return masterItems[i]; },
            add(count) {
                assert.equal(count, 2);
                const parent = { pages: collection([page(true), page(false)]),
                    remove() { masterItems.splice(masterItems.indexOf(this), 1); } };
                masterItems.push(parent);
                return parent;
            },
            items: masterItems
        };
        doc.masterSpreads.add(2).baseName = 'Default';
        if (fail) doc.colors.add = () => { throw new Error('Injected color failure'); };
        return doc;
    }
    const ctx = vm.createContext({
        alert: message => messages.push(message),
        app: {
            activeDocument: Object.freeze({ untouched: true }),
            documents: { add() { const doc = document(); made.push(doc); return doc; } },
            scriptPreferences: { measurementUnit: 'USER_UNIT' }
        },
        MeasurementUnits: { POINTS: 'POINTS', MILLIMETERS: 'MM' },
        PageBindingOptions: { LEFT_TO_RIGHT: 'LTR' },
        RulerOrigin: { SPREAD_ORIGIN: 'SPREAD' },
        PageSideOptions: { LEFT_HAND: 'LEFT_HAND' },
        SpecialCharacters: { AUTO_PAGE_NUMBER: 'AUTO_PAGE_NUMBER' },
        ColorModel: { PROCESS: 'PROCESS' }, ColorSpace: { RGB: 'RGB' },
        Justification: { AWAY_FROM_BINDING_SIDE: 'AWAY' }
    });
    vm.runInContext(core, ctx);
    return { ctx, made, messages };
}

const normal = environment();
vm.runInContext(entry, normal.ctx);
const doc = normal.made[0];
assert.equal(normal.ctx.app.scriptPreferences.measurementUnit, 'USER_UNIT');
assert.equal(doc.documentPreferences.pageWidth, '185 mm');
assert.equal(doc.documentPreferences.pageHeight, '260 mm');
assert.equal(doc.documentPreferences.facingPages, true);
assert.equal(doc.documentPreferences.pagesPerDocument, 1);
for (const property of ['documentBleedTopOffset', 'documentBleedBottomOffset',
    'documentBleedInsideOrLeftOffset', 'documentBleedOutsideOrRightOffset']) {
    assert.equal(doc.documentPreferences[property], '3 mm');
}
assert.equal(doc.masterSpreads.length, 9);
assert.equal(doc.pages.item(0).appliedMaster, doc.masterSpreads.item(0));
const expectedParents = [...spec.matchAll(/^([A-I]-[A-Z]+)：/gm)].map(m => m[1]);
assert.deepEqual(doc.masterSpreads.items.map(p => p.namePrefix + '-' + p.baseName), expectedParents);
const checkMargins = prefs => {
    assert.equal(prefs.top, '17 mm'); assert.equal(prefs.bottom, '20 mm');
    assert.equal(prefs.left, '18 mm'); assert.equal(prefs.right, '15 mm');
    assert.equal(prefs.columnCount, 6); assert.equal(prefs.columnGutter, '6 mm');
};
checkMargins(doc.marginPreferences);
checkMargins(doc.pages.item(0).marginPreferences);
let folios = 0;
for (const parent of doc.masterSpreads.items) {
    for (const page of parent.pages.items) {
        checkMargins(page.marginPreferences);
        assert.equal(page.textFrames.items.length, parent.namePrefix === 'H' ? 0 : 1);
        for (const frame of page.textFrames.items) {
            folios += 1;
            assert.equal(frame.contents, 'AUTO_PAGE_NUMBER');
            assert.equal(frame.parentStory.paragraphs.item(0).appliedParagraphStyle.name, 'P_Page_Folio');
            const b = frame.geometricBounds;
            const mid = (page.bounds[1] + page.bounds[3]) / 2;
            assert.ok(b[0] >= page.bounds[2] - 20 * 72 / 25.4 - 0.001);
            assert.ok(b[2] <= page.bounds[2]);
            assert.ok(page.side === 'LEFT_HAND' ? b[3] < mid : b[1] > mid);
        }
    }
}
assert.equal(folios, 16);
assert.equal(doc.pages.item(0).textFrames.items.length, 0);
for (const [prefix, collectionName] of [['P_', 'paragraphStyles'], ['C_', 'characterStyles'], ['O_', 'objectStyles']]) {
    let section = spec;
    if (prefix === 'C_') section = spec.split('# CHARACTER STYLES')[1].split('# OBJECT STYLES')[0];
    const names = [...section.matchAll(new RegExp('^(' + prefix + '[A-Za-z0-9_]+)$', 'gm'))].map(m => m[1]);
    assert.deepEqual(doc[collectionName].items.slice(1).map(x => x.name), names);
}
assert.equal(doc.colors.length, 7);
assert.deepEqual(Array.from(doc.colors.itemByName('C_SPECIAL_BLUE').colorValue), [129, 199, 212]);
for (const color of doc.colors.items.filter(x => x.name !== 'C_SPECIAL_BLUE')) {
    assert.equal(Object.hasOwn(color, 'colorValue'), false);
    assert.match(color.label, /UNRESOLVED_COLOR/);
}
assert.equal(doc.paragraphStyles.itemByName('P_Body_CN').pointSize, 9.5);
assert.equal(doc.paragraphStyles.itemByName('P_Body_CN').leading, 15);
assert.equal(doc.objectStyles.itemByName('O_Text_Main').textFramePreferences.textColumnCount, 2);
assert.equal(doc.objectStyles.itemByName('O_Text_Main').textFramePreferences.textColumnGutter, '6 mm');
assert.ok(Math.abs(normal.ctx.SHAN.utils.moduleWidthMM() * 3 + 12 - 73) < 1e-9);
vm.runInContext(entry, normal.ctx);
assert.equal(normal.made.length, 2);
assert.equal(doc.masterSpreads.length, 9);
assert.equal(normal.made[1].masterSpreads.length, 9);
const failed = environment(true);
assert.throws(() => vm.runInContext(entry, failed.ctx), /Injected color failure/);
assert.equal(failed.ctx.app.scriptPreferences.measurementUnit, 'USER_UNIT');
assert.match(failed.messages[0], /未完成/);
assert.doesNotMatch(core + entry, /\.place\s*\(|\.exportFile\s*\(|\.save\s*\(|\beval\s*\(/);
console.log('PASS: spec names, geometry, 16 auto folios, new-document isolation, failure restoration; mock only.');
