const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
function zipEntry(buffer, wanted) {
    for (let at = 0; at <= buffer.length - 46; at += 1) {
        if (buffer.readUInt32LE(at) !== 0x02014b50) continue;
        const method = buffer.readUInt16LE(at + 10);
        const size = buffer.readUInt32LE(at + 20);
        const nameLength = buffer.readUInt16LE(at + 28);
        const extraLength = buffer.readUInt16LE(at + 30);
        const commentLength = buffer.readUInt16LE(at + 32);
        const name = buffer.subarray(at + 46, at + 46 + nameLength).toString('utf8');
        if (name === wanted) {
            const local = buffer.readUInt32LE(at + 42);
            const data = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
            const compressed = buffer.subarray(data, data + size);
            return method === 0 ? compressed : zlib.inflateRawSync(compressed);
        }
        at += 45 + nameLength + extraLength + commentLength;
    }
    throw new Error(`Missing DOCX entry: ${wanted}`);
}
const docx = fs.readFileSync(path.join(root, 'manuscripts', '06_fiction_传送科技逸史_田李昊.docx'));
const documentXml = zipEntry(docx, 'word/document.xml').toString('utf8');
const stylesXml = zipEntry(docx, 'word/styles.xml').toString('utf8');
const styleNames = Object.fromEntries([...stylesXml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>[\s\S]*?<w:name\b[^>]*w:val="([^"]+)"/g)]
    .map(match => [match[1], match[2]]));
const decode = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const fixture = { roles: [], texts: [] };
for (const match of documentXml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const xml = match[1];
    const style = xml.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/);
    fixture.roles.push(style ? styleNames[style[1]] : 'DEFAULT');
    fixture.texts.push(decode([...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(value => value[1]).join('')));
}
const expectedChapters = [
    '一 The Jaunt 跳特',
    '二 Spriteleporter 精神浪游者',
    "三 Childhood's End 童年的终结",
    '四 The Names Of Nine Billion Gods 九十亿个神的名字',
    '五 Hell Is the Presence Of Too Many Gods 地狱是神太多的地方',
    '六 Mostly Harmless 基本无害',
    '七 Brave New World 美丽新世界',
    '八 The Last Question 最后的问题',
    '九 Flowers for NEURON 献给柳珑的花束',
    "∞ The Hitchhiker's Guide to the Aries 白羊座漫游指南"
];
assert.equal(fixture.texts[fixture.roles.indexOf('ArticleTitle')], '传送科技逸史');
const authorAt = fixture.roles.indexOf('Author');
assert.equal(fixture.texts[authorAt], '田李昊');
assert.equal(fixture.roles.slice(authorAt + 1).find((role, i) => fixture.texts[authorAt + 1 + i].length > 0), 'Body');
assert.deepEqual(fixture.texts.filter((_, i) => fixture.roles[i] === 'FictionChapter'), expectedChapters);

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'modules', 'fiction.jsx'), 'utf8'), ctx);
const styles = Object.fromEntries(Object.values(ctx.SHAN.fiction.styleMap).map(name => [name, { name, isValid: true }]));
const story = { contents: fixture.texts.join('\r'), paragraphs: { length: fixture.roles.length,
    item: i => ({ appliedParagraphStyle: { name: fixture.roles[i] }, applyParagraphStyle(style) { this.appliedParagraphStyle = style; } }) } };
const counts = ctx.SHAN.fiction.mapStory({ paragraphStyles: { itemByName: name => styles[name] || { isValid: false } } }, story);
assert.equal(counts.FictionChapter, 10);
assert.equal(story.contents, fixture.texts.join('\r'));

const build = fs.readFileSync(path.join(root, 'build', '05c_fiction_transfer_test.jsx'));
assert.equal(build.subarray(0, 3).toString('hex'), 'efbbbf');
const buildText = build.toString('utf8');
assert.ok(buildText.includes('/manuscripts/06_fiction_传送科技逸史_田李昊.docx'));
assert.ok(buildText.includes('"fiction_teleport_history"'));
execFileSync('git', ['diff', '--exit-code', 'fiction-v1.0^{}', '--', 'workflow/MODULE_STATUS.json', 'modules/fiction.jsx', 'visual/fiction_skin.jsx', 'spec/FICTION_TOKENS.json'], { cwd: root });
console.log('PASS Fiction Transfer: author, 10 chapters, opening Body, unchanged text, thin build, BOM, Fiction v1.0 unchanged.');
