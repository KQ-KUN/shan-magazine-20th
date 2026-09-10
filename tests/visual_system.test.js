const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const files = ['tokens', 'typography', 'running_system', 'chapter_skin', 'interview_skin', 'apply_visual_system'].map(n => 'visual/' + n + '.jsx');
const ctx = vm.createContext({ SpanColumnTypeOptions: { SPAN_COLUMNS: "span", SINGLE_COLUMN: "single" }, FontStatus: { INSTALLED: 'installed' }, ColorModel: { PROCESS: 'process' }, ColorSpace: { RGB: 'RGB' },
    PageSideOptions: { LEFT_HAND: 'left' }, Justification: { LEFT_ALIGN: 'left', RIGHT_ALIGN: 'right' }, SpecialCharacters: { AUTO_PAGE_NUMBER: 'auto' } });
vm.runInContext(['core/utils.jsx','core/document.jsx','modules/chapter.jsx', ...files].map(read).join('\n'), ctx);
const t = ctx.SHAN.chapter.parseJSON(read('spec/VISUAL_TOKENS.json'));
ctx.SHAN.visualTokens.validate(t);
const fonts = [{ name:'Source Han Serif SC\tRegular', fontFamily:'Source Han Serif SC', fontStyleName:'Regular',status:'installed' },
    { name:'Source Han Serif SC\tSemiBold', fontFamily:'Source Han Serif SC', fontStyleName:'SemiBold',status:'installed' },
    { name:'Consolas\tRegular', fontFamily:'Consolas', fontStyleName:'Regular',status:'installed' }];
ctx.app = { fonts: { everyItem: () => ({ getElements: () => fonts }) } };
assert.equal(ctx.SHAN.typography.chooseFont(fonts,t.font_stacks.serif_cn,'SemiBold').font,fonts[1]);
assert.equal(ctx.SHAN.typography.chooseFont(fonts,t.font_stacks.sans_cn),null);
assert.equal(ctx.SHAN.typography.chooseFont(fonts,t.font_stacks.mono).font,fonts[2]);
assert.equal(ctx.SHAN.typography.chooseFont(fonts,t.font_stacks.serif_cn,'Medium').exact,false);
const colors = {}, styles = {}, objectStyle = {isValid:true,textFramePreferences:{}};
for(const key of Object.keys(t.colors)) colors[key]={isValid:true};
for(const key of Object.keys(t.paragraph_styles)) styles[key]={isValid:true};
function page(left) {
 const items=[];
 const collection=(kind)=>({add(){
  const para={}; const item={label:'',kind,textFramePreferences:{},parentStory:{paragraphs:{everyItem:()=>para}},
   remove(){items.splice(items.indexOf(item),1);},sendToBack(){}};
  items.push(item);return item;
 }});
 return {bounds:[0,left?-524.4094488:0,737.007874,left?0:524.4094488],side:left?'left':'right',marginPreferences:{},
  pageItems:{get length(){return items.length;},item:i=>items[i]},textFrames:collection('text'),graphicLines:collection('line'),rectangles:collection('paper'),items};
}
const names=['A-TEXT','B-INTERVIEW','C-HISTORY','D-FICTION','E-MEMOIR','F-GALLERY','G-MESSAGE','H-CHAPTER','I-FRONT'];
const masters=names.map(name=>{const pages=[page(true),page(false)];return{name,isValid:true,pages:{length:2,item:i=>pages[i]}};});
const doc={colors:{itemByName:n=>colors[n]},paragraphStyles:{itemByName:n=>styles[n]},swatches:{item:()=>({name:'None'})},
 objectStyles:{item:()=>({}),itemByName:()=>objectStyle},masterSpreads:{length:9,item:i=>masters[i],itemByName:n=>masters.find(m=>m.name===n)},labels:{},insertLabel(k,v){this.labels[k]=v;}};
const context={warnings:[]};
ctx.SHAN.visualSystem.apply(doc,t,context);
for(const key of Object.keys(t.colors)) {assert.deepEqual(Array.from(colors[key].colorValue),Array.from(t.colors[key].rgb));assert.equal(colors[key].space,'RGB');}
assert.match(colors.C_SDU_RED.label,/PROVISIONAL/);
for(const key of Object.keys(t.paragraph_styles)) {
 const def=t.paragraph_styles[key], style=styles[key];
 assert.equal(style.pointSize,def.size_pt);assert.equal(style.leading,def.leading_pt);
 if(def.tracking!==undefined) assert.equal(style.tracking,def.tracking);
 if(def.space_after_mm!==undefined) assert.equal(style.spaceAfter,def.space_after_mm*72/25.4);
 if(def.first_line_indent_em!==undefined) assert.equal(style.firstLineIndent,def.first_line_indent_em*def.size_pt);
}
assert.equal(styles.P_Interview_Q.ruleAboveLineWeight,t.paragraph_styles.P_Interview_Q.rule_above.weight_pt);
assert.equal(styles.P_Quote.paragraphBorderLeftLineWeight,t.paragraph_styles.P_Quote.left_rule.weight_pt);
assert.equal(objectStyle.textFramePreferences.textColumnCount,t.interview_visual.body_columns);
assert.ok(context.warnings.some(w=>w.includes('批准字体栈不可用')));
function checkRunning(){
 for(const master of masters) for(let i=0;i<2;i++){
  const items=master.pages.item(i).items;
  const hidden=t.running_system.hide_on_parents.includes(master.name),minimal=t.running_system.minimal_on_parents.includes(master.name);
  assert.equal(items.filter(x=>x.label==='SHAN_VISUAL:paper').length,1);
  assert.equal(items.filter(x=>x.label==='SHAN_VISUAL:folio').length,hidden?0:1);
  assert.equal(items.filter(x=>x.label==='SHAN_VISUAL:header_left').length,hidden||minimal?0:1);
  assert.equal(items.filter(x=>x.label==='SHAN_VISUAL:header_rule').length,hidden||minimal?0:1);
 }
}
checkRunning();ctx.SHAN.runningSystem.apply(doc,t);checkRunning();
const manifest=JSON.parse(read('spec/CONTENT_MANIFEST.json'));
const chapterPage=page(false);
// Chapter.addFrame expects everyItem on paragraph collections, already in the fake.
ctx.SHAN.chapterSkin.example(doc,chapterPage,manifest.sections[1],t);
const intro=chapterPage.items.find(x=>x.label.endsWith(':intro'));
assert.equal(intro.contents,manifest.sections[1].intro);
assert.ok(Math.abs((intro.geometricBounds[3]-intro.geometricBounds[1])-ctx.SHAN.utils.pt(ctx.SHAN.utils.moduleWidthMM()*t.chapter_visual.intro_max_width_modules+ctx.SHAN.spec.gutterMM*(t.chapter_visual.intro_max_width_modules-1)))<1e-8);
assert.equal(chapterPage.items.filter(x=>x.kind==='line').length,2);
for(const file of [...files,'build/04_visual_system_test.jsx']) assert.equal(fs.readFileSync(path.join(root,file)).subarray(0,3).toString('hex'),'efbbbf');
const status=JSON.parse(read('workflow/MODULE_STATUS.json'));
for(const mod of ['foundation','chapter','interview']){
 const baseline=JSON.parse(execFileSync('git',['show',mod+'-v1.0:workflow/MODULE_STATUS.json'],{cwd:root,encoding:'utf8'}));
 assert.deepEqual(status[mod],baseline[mod]);
 for(const file of status[mod].scope) assert.equal(read(file).replace(/\r\n/g,'\n'),execFileSync('git',['show',mod+'-v1.0:'+file],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n'));
}
assert.doesNotMatch(files.map(read).join('\n'),/\.ovals\.add|ColorSpace\.CMYK|\.pointSize\s*=\s*[0-9]/);
console.log('PASS: exact tokens, approved font fallback/warnings, RGB, rules, running visibility/idempotence, chapter content/width, BOM, frozen files; mock only.');

const ps=['P_Article_Title','P_Article_Subtitle','P_Author','P_Metadata','P_Interview_Q','P_Interview_A','Unknown'].map(name=>({appliedParagraphStyle:{name}}));
const story={contents:'原文 Q/A 不变',paragraphs:{length:ps.length,item:i=>ps[i]}};
ctx.SHAN.interviewSkin.applyStory(story,t);
assert.equal(story.contents,'原文 Q/A 不变');
for(const p of ps.slice(0,5)){assert.equal(p.spanColumnType,'span');assert.equal(p.spanSplitColumnCount,2);}
assert.equal(ps[5].spanColumnType,'single');assert.equal(ps[6].spanColumnType,undefined);
const off=JSON.parse(JSON.stringify(t));off.interview_visual.question_span_columns=false;
ctx.SHAN.interviewSkin.applyStory(story,off);assert.equal(ps[4].spanColumnType,'single');
for(const [field,key] of [['display_index','number'],['cn','title'],['en','english'],['intro','intro']]){
 const item=chapterPage.items.find(x=>x.label.endsWith(':'+field)),box=t.chapter_visual.layout[key];
 assert.ok(Math.abs(item.geometricBounds[0]-ctx.SHAN.utils.pt(ctx.SHAN.spec.marginsMM.top+box.top_offset_mm))<1e-8);
 assert.ok(Math.abs(item.geometricBounds[1]-ctx.SHAN.utils.pt(ctx.SHAN.spec.marginsMM.inside+box.left_offset_mm))<1e-8);
}
assert.equal(t.paragraph_styles.P_Metadata.family,'sans_cn');
assert.ok(read('build/04_visual_system_test.jsx').includes('doc.extractLabel("SHAN_VISUAL_FONTS")'));
assert.ok(read('visual/apply_visual_system.jsx').includes(', 6, context, tokens)'));
console.log('PASS 04A: style spans, unchanged text, token layout, Metadata sans_cn and font alert.');

// 04B: normalize approved names; exact weight wins before body aliases.
{
 const face=style=>({fontFamily:'  Source Han Sans SC  ',fontStyleName:style,status:'installed'});
 const normal=face('Normal'),regular=face('  REGULAR  '),medium=face(' Medium ');
 const choose=(faces,weight)=>ctx.SHAN.typography.chooseFont(faces,['source han sans sc'],weight);
 assert.equal(choose([normal,medium,regular],'Regular').font,regular);
 assert.equal(choose([normal,medium],'Regular').font,normal);
 assert.equal(choose([normal],'Regular').exact,true);
 assert.equal(choose([normal,regular,medium],'Medium').font,medium);
 assert.equal(choose([normal,regular,medium],'Medium').exact,true);
 assert.equal(choose([normal,regular],'SemiBold').font,regular);
 assert.equal(choose([normal],'SemiBold').exact,false);
 assert.equal(choose([{...regular,fontFamily:'Unapproved'}],'Regular'),null);
 console.log('PASS 04B: normalized Regular, Normal alias, Medium exact and approved-family fallback.');
}
