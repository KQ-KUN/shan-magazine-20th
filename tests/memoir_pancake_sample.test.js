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
const docx = zipEntries(fs.readFileSync(path.join(root, 'manuscripts', '08_memoir_煎饼回忆录_奶牛煎饼_CLEAN.docx')));
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
assert.equal(fixture.texts[fixture.roles.indexOf('ArticleTitle')], '煎饼回忆录');
assert.equal(fixture.texts[fixture.roles.indexOf('Author')], '文 / 奶牛煎饼（山东大学，2005 年生）');
assert.equal(fixture.roles.filter(role => role === 'MemoirSection').length, 0);
assert.equal(fixture.roles.filter(role => role === 'Media').length, 1);
assert.deepEqual(fixture.texts.filter((_, i) => /^(?:Caption|caption)$/.test(fixture.roles[i])), ['△《生物中心主义》']);

const ctx = vm.createContext({});
vm.runInContext(read('modules/memoir.jsx'), ctx);
const styles = Object.fromEntries(Object.values(ctx.SHAN.memoir.styleMap).map(name => [name, { name, isValid: true }]));
const paragraphs = fixture.roles.map((name, i) => ({ appliedParagraphStyle: { name }, contents: fixture.texts[i], applyParagraphStyle(style, clear) { assert.equal(clear, true); this.appliedParagraphStyle = style; } }));
const story = { contents: fixture.texts.join('\r'), paragraphs: { length: paragraphs.length, item: i => paragraphs[i] } };
const counts = ctx.SHAN.memoir.mapStory({ paragraphStyles: { itemByName: name => styles[name] || { isValid: false } } }, story);
assert.equal(counts.MemoirSection || 0, 0); assert.equal(counts.Media, 1);
assert.equal((counts.Caption || 0) + (counts.caption || 0), 1);
assert.equal(story.contents, fixture.texts.join('\r'));

const manifest = JSON.parse(read('assets/PANCAKE_MEDIA_MANIFEST.json'));
assert.deepEqual({ article_id: manifest.article_id, file: manifest.file, anchor_position: manifest.anchor_position, placed_graphics: manifest.placed_graphics },
    { article_id: 'memoir_pancake', file: 'assets/pancake_media_canvas.png', anchor_position: 'ABOVE_LINE', placed_graphics: 1 });
const media = fs.readFileSync(path.join(root, manifest.file));
assert.equal(media.subarray(1, 4).toString('ascii'), 'PNG');
const build = fs.readFileSync(path.join(root, 'build', '06b_memoir_pancake_test.jsx'));
assert.equal(build.subarray(0, 3).toString('hex'), 'efbbbf');
const buildText = build.toString('utf8');
assert.ok(buildText.includes('/manuscripts/08_memoir_煎饼回忆录_奶牛煎饼_CLEAN.docx'));
assert.ok(buildText.includes('/assets/PANCAKE_MEDIA_MANIFEST.json'));
assert.ok(buildText.includes('"memoir_pancake"'));
execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', 'modules/memoir.jsx', 'visual/memoir_skin.jsx', 'spec/MEMOIR_TOKENS.json'], { cwd: root });
const status = JSON.parse(read('workflow/MODULE_STATUS.json'));
for (const mod of ['foundation', 'chapter', 'interview', 'visual_system', 'fiction']) {
    const tag = mod === 'visual_system' ? 'visual-system-v1.0' : `${mod.replace('_', '-')}-v1.0`;
    execFileSync('git', ['diff', '--exit-code', `${tag}^{}`, '--', ...status[mod].scope], { cwd: root });
}
console.log('PASS Memoir Pancake: title/author, 0 sections, one Media, caption, unchanged text, canvas/manifest, BOM, shared Memoir and frozen scopes unchanged.');
