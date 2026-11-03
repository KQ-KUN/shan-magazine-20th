const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const artwork = JSON.parse(read('content/BACK_COVER_MANIFEST.json'));
assert.equal(artwork.digital.status, 'APPROVED_FOR_DIGITAL');
assert.equal(artwork.print_candidate.status, 'PRINT_CANDIDATE_NOT_APPROVED');
for (const key of ['digital', 'print_candidate', 'source']) {
  const item = artwork[key];
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, item.file))).digest('hex'), item.sha256);
}
const host = {scriptPreferences: {}, pdfPlacePreferences: {pdfCrop: 'original', pageNumber: 9}};
let count = 0;
const graphic = {geometricBounds: [0, 0, 737, 524], itemLink: {status: 'normal'}};
const frame = {place: () => [graphic], fit: () => {}};
const context = vm.createContext({SHAN: {assemblyV0: {page: () => ++count === 1 ? {side:'right',pageItems:[],appliedMaster:null,documentOffset:94} : {side:'left',bounds:[0,0,737,524],rectangles:{add:()=>frame},pageItems:[frame],textFrames:[],documentOffset:95}}, printBook: {check: (v, m) => assert.ok(v, m), verify: () => ({})}}, app: host, PageSideOptions:{RIGHT_HAND:'right',LEFT_HAND:'left'}, PDFCrop:{CROP_MEDIA:'media'}, FitOptions:{CENTER_CONTENT:'center'}, LinkStatus:{NORMAL:'normal'}});
vm.runInContext(read('modules/back_cover.jsx'), context);
const doc = {swatches:{itemByName:()=>({})}};
const result = context.SHAN.backCover.append(root, doc, artwork.digital);
assert.equal(result.inside_back_items, 0);
assert.equal(result.back_extra_text_frames, 0);
assert.equal(result.proportional_scale, 100);
assert.equal(host.pdfPlacePreferences.pdfCrop, 'original');
assert.equal(host.pdfPlacePreferences.pageNumber, 9);
assert.throws(() => context.SHAN.backCover.append(root, doc, {...artwork.digital,status:'PRINT_CANDIDATE_NOT_APPROVED'}), /digital approval/);
for (const file of ['modules/back_cover.jsx','modules/publication_compact.jsx','build/62_back_cover_refine.jsx','build/63_back_cover_folios.jsx','build/64_back_cover_assembly.jsx','build/65_back_cover_reader.jsx']) {
  assert.equal(fs.readFileSync(path.join(root,file)).subarray(0,3).toString('hex'),'efbbbf',file);
}
console.log('PASS artwork hashes, digital/print status separation, native placement contract, blank inside back, preference restoration and BOM');
