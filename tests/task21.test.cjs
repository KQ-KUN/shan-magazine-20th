const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),baseline='e5adb124c748a94476ce47c226769b99b714b4bf';
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''),json=p=>JSON.parse(read(p));
const git=(...a)=>cp.execFileSync('git',a,{cwd:root}),old=p=>JSON.parse(git('show',baseline+':'+p));
const current=json('content/ASSEMBLY_V0_MANIFEST.json'),expected=old('content/ASSEMBLY_V0_MANIFEST.json');
const removed=['origin_pending','now_pending','closing_pending'];expected.interior=expected.interior.filter(c=>!removed.includes(c.id));
assert.deepStrictEqual(current,expected,'Only the three cancelled components may leave the current plan');
assert.deepStrictEqual(current.interior.filter(c=>c.kind==='placeholder').map(c=>c.id),['messages_pending']);
const copy=json('content/TASK21_APPROVED_XINGYUE_COPY.json'),data=json('content/XINGYUE.json'),prior=old('content/XINGYUE.json');
assert.strictEqual(crypto.createHash('sha256').update(copy.story.join('\r')).digest('hex'),'2886d56298f2292f08021fc485d42915cab6433e1e3df22744d604c41ec99baa','User-approved story byte integrity');
assert.strictEqual(copy.story.length,8);assert.strictEqual(copy.story[7],'“简单来说，就是信号串台啦。”');
assert.deepStrictEqual(data.paragraphs.filter(p=>['Body','Quote'].includes(p.role)).slice(0,8).map(p=>p.text),copy.story);
const settings=prior.paragraphs.slice(10,23).filter(p=>!p.image && p.role!=='Caption');
assert.deepStrictEqual(copy.settings,settings);
assert.deepStrictEqual(data.paragraphs.slice(data.paragraphs.findIndex(p=>p.text==='设定解释')).filter(p=>!p.image && p.role!=='Caption').map(({block,...p})=>p),settings);
assert(!data.paragraphs.some(p=>p.text==='配图说明'));
assert.deepStrictEqual(data.paragraphs.filter(p=>p.image).map(p=>p.image),[2,1,3]);
assert.strictEqual(data.blocks.find(b=>b.id==='portrait').column,1);
assert.strictEqual(data.blocks.find(b=>b.id==='story').column,2);
const t=json('spec/XINGYUE_TOKENS.json');assert.strictEqual(t.page_count,2);
assert(t.image_widths_mm['2']>=70 && t.image_widths_mm['2']<=73);assert(t.image_widths_mm['3']>=70 && t.image_widths_mm['3']<=73);
assert(t.styles.P_XingYue_Body.size_pt>=9.2 && t.styles.P_XingYue_Body.leading_pt>=14.5);
const staff=json('content/EDITORIAL_TOC_DISPLAY.json').staff_display;
assert.deepStrictEqual(staff.map(r=>r.source_paragraph),[4,5,6,7,8,9,10,11]);
assert.deepStrictEqual(staff.map(r=>r.display_text),['指导老师 / 谭杨','主　　编 / 黄可其','执行主编 / 李司煜','编　　辑 / 袁琦','责任编辑 / 贾锦阳','美术编辑 / 于笑涵','文字校对 / 黄阳金','摄影提供 / 历届社员及资料提供者']);
assert(staff.every(r=>!/[()（）]/.test(r.display_text)));
assert.deepStrictEqual(json('content/EDITORIAL_TOC_DISPLAY.json').short_copyright,old('content/EDITORIAL_TOC_DISPLAY.json').short_copyright);
const audit=json('spec/TASK16_SOURCE_AUDIT.json');for(const a of audit.images){assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,a.file))).digest('hex'),a.sha256);}
let frozen=0;for(const m of Object.values(json('workflow/MODULE_STATUS.json')))if(m.frozen)for(const f of m.scope){assert.strictEqual(git('diff',baseline,'--',f).length,0,'Frozen changed '+f);frozen++;}
for(const f of ['manuscripts','assets','modules/history.jsx','visual/history_skin.jsx','spec/HISTORY_TOKENS.json','content/HISTORY_IMPORT_MAP.json','spec/VISUAL_TOKENS.json','spec/CONTENT_MANIFEST.json','content/PRINT_BOOK_BASELINE.json','spec/EDITORIAL_TOC_TOKENS.json','modules/assembly_v0.jsx','modules/print_book.jsx'])assert.strictEqual(git('diff',baseline,'--',f).length,0,'Unrelated source/body changed '+f);
for(const f of ['modules/xingyue.jsx','visual/xingyue_skin.jsx','modules/editorial_toc.jsx','build/32_xingyue_test.jsx','build/33_print_book_v6_test.jsx','build/34_print_v6_folios.jsx','build/35_print_v6_postflight.jsx']){
 assert.strictEqual(fs.readFileSync(path.join(root,f)).subarray(0,3).toString('hex'),'efbbbf');new vm.Script(read(f).replace(/^#.*$/gm,''));assert(!/throw\s+e\s*;|\bvar\s+final\b/.test(read(f)));
}
const allowed=new Set(["content/ASSEMBLY_V0_MANIFEST.json", "content/EDITORIAL_TOC_DISPLAY.json", "content/TOC_MANIFEST.json", "content/XINGYUE.json", "content/PRINT_BOOK_V6_MANIFEST.json", "content/TASK21_APPROVED_XINGYUE_COPY.json", "modules/editorial_toc.jsx", "modules/xingyue.jsx", "spec/XINGYUE_TOKENS.json", "visual/xingyue_skin.jsx", "build/32_xingyue_test.jsx", "build/33_print_book_v6_test.jsx", "build/34_print_v6_folios.jsx", "build/35_print_v6_postflight.jsx", "tests/print_book.test.cjs", "tests/print_book_outputs.py", "tests/task16.test.cjs", "tests/task18.test.cjs", "tests/task20.test.cjs", "tests/task21.test.cjs", "tests/task21_outputs.py", "tools/finish_print_pdfs.py", "tools/prepare_print_components.py", "tools/run_print_book.ps1", "tools/resolve_print_v6.py", "tools/run_print_v6.ps1", "tasks/TASK_21_CONTENT_STATUS_AND_XINGYUE.md"]);
for(const f of git("diff","--name-only",baseline).toString("utf8").trim().split("\n").filter(Boolean))assert(allowed.has(f),"Outside TASK21 scope "+f);
require('./task16.test.cjs');require('./task20.test.cjs');
console.log('PASS TASK21: exact three removals / sole messages pending / exact authorized copy and unchanged settings / 3 original images / 8 explicit staff display transforms / '+frozen+' frozen files unchanged');
