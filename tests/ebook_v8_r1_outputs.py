"""Real InDesign/PDF checks for the two V8 corrections, with exact V8 protection."""
from pathlib import Path
from collections import Counter
import hashlib,json,math
import pdfplumber
from pypdf import PdfReader
from PIL import Image,ImageChops,ImageDraw

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/ebook_v8_r1';MM=25.4/72
def read(p):return json.loads((ROOT/p).read_text('utf-8-sig'))
def write(name,v):(OUT/name).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def body(p):return [c for c in p.chars if p.trimbox[1]+16.5/MM<=c['top']<p.trimbox[1]+247/MM]
def signatures(chars):return Counter((c['text'],round(c['size'],3),c['fontname'].split('+')[-1]) for c in chars)
native=read('exports/ebook_v8_r1/STANDALONE_RUNTIME.json');old_native=read('exports/ebook_v8/STANDALONE_RUNTIME.json');report=read('exports/ebook_v8_r1/FINAL_PRINT_REPORT.json');plan=read('exports/ebook_v8_r1/RESOLVED_BOOK_PLAN.json');fixture=read('exports/ebook_v8_r1/SOURCE_FIXTURE.json')
assert native['status']==report['status']=='PASS' and report['final_links_verified'] and len(report['finished_native_documents'])==2
assert not report['overset'] and not report['missing_links'] and not report['focus']['active_page_is_parent']
assert report['pdf_finishing']['color_conversion']=='NONE'
old_records={c['id']:c for c in old_native['components']};records={c['id']:c for c in native['components']}
assert set(records)=={'memoir_pancake','xingyue'}
for p,h in read('exports/ebook_v8_r1/PROTECTED_HASHES.json').items():assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h,'Protected '+p
for c in records.values():
 assert c['status']=='PASS' and c['pages']==2 and not c['overset'] and c['links_normal'] and c['fonts_installed']
 assert c['paragraphs']==old_records[c['id']]['paragraphs'],'Changed DOM paragraphs '+c['id']
 if c['id'] in fixture['paragraphs']:assert c['paragraph_equality'] and c['paragraphs']==fixture['paragraphs'][c['id']]
 assert not c['focus']['active_page_is_parent']
pancake=records['memoir_pancake'];xing=records['xingyue'];old_xing=old_records['xingyue']['xingyue'];xr=xing['xingyue'];assert xr['paragraphs']==28 and len(xr['images'])==3
for b in xr['blocks']:
 before=next(z for z in old_xing['blocks'] if z['id']==b['id']);assert b['paragraphs']==before['paragraphs'] and not b['overset']
 delta=(b['bounds'][0]-before['bounds'][0])*MM
 assert abs(delta-(15 if b['id']=='story' else 0))<.01,'Unexpected XingYue block movement '+b['id']
 assert all(abs(b['bounds'][j]-before['bounds'][j])<.01 for j in (1,2,3)),'XingYue width/bottom changed'
for image in xr['images']:
 before=next(z for z in old_xing['images'] if z['index']==image['index']);assert image['source_sha256']==before['source_sha256'] and image['proportional'] and image['link_normal']
 assert all(abs(a-b)<.01 for a,b in zip(image['bounds'],before['bounds'])),'XingYue image moved'
 assert image['caption']==before['caption']

media=read('assets/PANCAKE_MEDIA_MANIFEST.json');src=read('spec/TASK16_SOURCE_AUDIT.json')['pancake_original'];original=Image.open(ROOT/src['file'])
assert original.mode=='RGB' and original.size==(257,350) and original.getbbox()==(0,0,257,350)
assert media['file']==src['file'] and hashlib.sha256((ROOT/src['file']).read_bytes()).hexdigest()==src['sha256']
book=pancake['images'][0];assert len(pancake['images'])==1 and Path(book['file']).name=='pancake-original.png' and book['proportional']
assert abs(book['width_mm']-60)<.01 and abs(book['height_mm']-60*350/257)<.01 and book['page']==pancake['start_page']
book_native=PdfReader(ROOT/pancake['file']);assert len(book_native.pages[0].images)==1
decoded=book_native.pages[0].images[0].image.convert('RGB');assert decoded.size==original.size and decoded.tobytes()==original.tobytes(),'Book pixels changed'
for cid in records:
 with pdfplumber.open(ROOT/records[cid]['file']) as doc,pdfplumber.open(ROOT/old_records[cid]['file']) as old:
  assert signatures([c for p in doc.pages for c in body(p)])==signatures([c for p in old.pages for c in body(p)]),'Article PDF text/font/size mismatch '+cid

final=PdfReader(OUT/'SHAN_EBOOK_V8_R1.pdf');baseline=PdfReader(ROOT/'exports/ebook_v8/SHAN_EBOOK_V8.pdf')
assert len(final.pages)==70 and final.page_layout=='/TwoPageRight'
assert len(final.pages)==report['total_reader_pdf_pages']==70 and report['interior_pages']==68
assert report['toc_validation']['actual_runtime_start_pages'] and report['toc_validation']['entry_count']==21
old_report=read('exports/ebook_v8/FINAL_PRINT_REPORT.json');assert report['toc_entries']==old_report['toc_entries'],'TOC ranges changed'
assert [(c['id'],c['start_page'],c['end_page']) for c in report['components']]==[(c['id'],c['start_page'],c['end_page']) for c in old_report['components']]
assert all(c['start_page']%2==1 for c in report['components'] if c['kind']=='chapter')
for p in final.pages:
 assert abs(float(p.trimbox.width)*MM-185)<.1 and abs(float(p.trimbox.height)*MM-260)<.1 and list(p.cropbox)==list(p.trimbox)
for i,p in enumerate(final.pages):
 if i not in (60,61,66):assert p.get_contents().get_data()==baseline.pages[i].get_contents().get_data(),'Unrelated stream page '+str(i+1)
seen_fonts=set()
def embedded(resources):
 if not resources:return
 r=resources.get_object()
 for ref in r.get('/Font',{}).values():
  f=ref.get_object();seen_fonts.add(str(f.get('/BaseFont','Type3')))
  for child in f.get('/DescendantFonts',[f]):
   child=child.get_object()
   if child.get('/Subtype')=='/Type3':continue
   d=child.get('/FontDescriptor');assert d and any(k in d.get_object() for k in ('/FontFile','/FontFile2','/FontFile3')),'Unembedded font'
 for ref in r.get('/XObject',{}).values():
  obj=ref.get_object()
  if obj.get('/Subtype')=='/Form':embedded(obj.get('/Resources'))
for p in final.pages:embedded(p.get('/Resources'))

thumb=OUT/'pages';thumb.mkdir(exist_ok=True);images=[];old_targets={};pixel_protected=[]
with pdfplumber.open(OUT/'SHAN_EBOOK_V8_R1.pdf') as pdf,pdfplumber.open(ROOT/'exports/ebook_v8/SHAN_EBOOK_V8.pdf') as old:
 for i,p in enumerate(pdf.pages):
  image=p.crop(p.trimbox).to_image(resolution=100).original.convert('RGB');before=old.pages[i].crop(old.pages[i].trimbox).to_image(resolution=100).original.convert('RGB');image.save(thumb/f'page-{i+1:03}.png');images.append(image)
  if i not in (60,61,66):assert ImageChops.difference(image,before).getbbox() is None,'Unrelated rendered page '+str(i+1);pixel_protected.append(i+1)
  else:old_targets[i+1]=before
  if i!=1:assert ImageChops.difference(image,Image.new('RGB',image.size,image.getpixel((5,5)))).getbbox(),'Unexpected blank '+str(i+1)
 # The exact same right-column glyphs move 15mm; left artwork/title/caption stay.
 right_old=[c for c in body(old.pages[66]) if (c['x0']-old.pages[66].trimbox[0])*MM>94]
 right_new=[c for c in body(pdf.pages[66]) if (c['x0']-pdf.pages[66].trimbox[0])*MM>94]
 assert len(right_new)==len(right_old)
 for a,b in zip(right_new,right_old):
  assert a['text']==b['text'] and abs(a['size']-b['size'])<.01
  assert abs(a['x0']-b['x0'])<.01 and abs((a['top']-b['top'])*MM-15)<.01,'Story not translated as a unit'
 left=int(images[66].width*94/185);assert ImageChops.difference(images[66].crop((0,0,left,images[66].height)),old_targets[67].crop((0,0,left,images[66].height))).getbbox() is None,'XingYue left region changed'
 p=pdf.pages[60];assert len(p.images)==1;visible=p.images[0]
 assert abs(visible['width']*MM-60)<.01 and abs(visible['height']*MM-60*350/257)<.01
 for c in body(p):
  cx=(c['x0']+c['x1'])/2;cy=(c['top']+c['bottom'])/2
  assert not (visible['x0']<cx<visible['x1'] and visible['top']<cy<visible['bottom']),'Book covers body text'
 text=p.extract_text(layout=False);assert '△《生物中心主义》' in text
 cap=[c for c in body(p) if c['text']=='△'];assert len(cap)==1 and cap[0]['top']>visible['bottom'] and (cap[0]['top']-visible['bottom'])*MM<4,'Caption not immediately below book'
 footer=[c for c in p.chars if (c['top']-p.trimbox[1])*MM>248]
 assert footer and (min(c['top'] for c in footer)-max(c['bottom'] for c in body(p)))*MM>1.5,'Opener body too near folio'

def contact(items,name,columns=4,width=235):
 height=round(width*260/185);sheet=Image.new('RGB',(columns*(width+8),math.ceil(len(items)/columns)*(height+26)),'#ddd');draw=ImageDraw.Draw(sheet)
 for i,(label,img) in enumerate(items):x=i%columns*(width+8);y=i//columns*(height+26);sheet.paste(img.resize((width,height)),(x,y+22));draw.text((x+4,y+4),label,fill='black')
 sheet.save(OUT/name)
for i in range(0,70,12):contact([(f'V8 R1 page {j+1}',images[j]) for j in range(i,min(70,i+12))],f'REVIEW_CONTACT_{i//12+1:02}.png')
for page,name in ((67,'SHAN_XINGYUE_P67_BEFORE_AFTER.png'),(61,'SHAN_PANCAKE_P61_BEFORE_AFTER.png')):
 a=old_targets[page];b=images[page-1];joined=Image.new('RGB',(a.width+b.width,a.height+26),'white');draw=ImageDraw.Draw(joined);draw.text((8,6),f'V8 BEFORE / PDF {page}',fill='black');draw.text((a.width+8,6),f'V8 R1 AFTER / PDF {page}',fill='black');joined.paste(a,(0,26));joined.paste(b,(a.width,26));joined.save(OUT/name)
result={'status':'PASS','native_version':native['native_version'],'native_components':['memoir_pancake','xingyue'],'reader_pages':70,'interior_pages':68,'pancake_pages':2,'xingyue_pages':2,'source_dom_paragraphs_exact':True,'pdf_text_fonts_sizes_exact':True,'opaque_original_book_pixels_exact':True,'book_width_mm':book['width_mm'],'book_height_mm':book['height_mm'],'book_visible_area_ratio_to_v8':(book['width_mm']/old_records['memoir_pancake']['images'][0]['width_mm'])**2,'story_translation_mm':15,'xingyue_left_and_page68_unchanged':True,'all_other_67_pages_pixel_identical':pixel_protected,'gloomy_history_cover_intro_untouched':True,'toc_and_chapter_parity_unchanged':True,'no_overset_missing_link_or_font':True,'fonts_embedded':len(seen_fonts),'color_conversion':'NONE','visual_review':'RENDERED; AGENT MUST INSPECT TWO TARGET COMPARISONS AND PANCAKE CONTINUATION'}
write('EBOOK_V8_R1_PDF_VALIDATION.json',result)
scope=read('workflow/TASK24_SCOPE.json')
lines=['# 《山》电子版 V8 R1 定向修复','',
 '## 根因与修复','',
 '星岳：story 文本框和左侧标题框同为17mm起始，右侧层级过高。本轮仅把 story.top_mm 改为32mm，标题及全文实际下移15mm；左侧立绘、全部字号/行距/栏宽、28段文字与第二页均保留。','',
 '煎饼：旧 PANCAKE_MEDIA_MANIFEST 仍写146×74mm透明画布，但V8经过TASK16覆盖后实际已使用25×34.05mm原始竖图。剩余留白是小图在 ABOVE_LINE 的整行占位中只占25mm，约73mm栏宽的其余部分无法排字。','',
 '本轮 manifest 直接指向原始RGB竖图，原稿内257×350px图片字节及PDF解码像素均未改变，未裁切、重绘、拉伸或生成新内容。',
 '第一页使用86mm文字栏 + 6mm栏距 + 60mm右栏，文本框连续串接，图片和图注仍在原文中的 Media/Caption 段落位置。60×81.71mm书封占满右栏；ABOVE_LINE只在此单栏内使用，不再有146mm画布或跨栏占位。',
 '第一页文本框底部由240mm延至244mm，复用4mm页脚上方空间；实际PDF文字至页码仍留足净距。第二页恢复既有73/73mm双栏。正文仍为9.4pt/16.5pt，原文、作者及“△《生物中心主义》”逐段完整。','',
 '## 实际结果','',
 'InDesign 2026 / 21.5.1.73：两个 standalone、Assembly、最终链接/字体/无溢出/正文页焦点均PASS。',
 '煎饼仍为两页（PDF61—62）；星岳仍为两页（PDF67—68）；整刊70页阅读PDF / 68内页，目录21项和章节recto不变。',
 '70页全部渲染。除61、62、67页外，全部67页渲染像素与V8完全一致，包含Gloomy、会史、封面、章节intro及星岳第68页。',
 '静态精确范围、28个FROZEN文件和源稿哈希全部通过；没有修改共享Memoir renderer/skin/tokens。未做CMYK转换。','',
 '## 精确修改文件','']+['- `'+p+'`' for p in scope['allowed']]+['',
 '## 交付','',
 '- `SHAN_EBOOK_V8_R1.pdf`',
 '- `SHAN_XINGYUE_P67_BEFORE_AFTER.png`',
 '- `SHAN_PANCAKE_P61_BEFORE_AFTER.png`',
 '- `EBOOK_V8_R1_PDF_VALIDATION.json`','',
 '复跑：`powershell -NoProfile -ExecutionPolicy Bypass -File tools/run_ebook_v8_r1.ps1 -Phase all`。原V8输出和两个既有Memoir probes原样保留。','']
(OUT/'SHAN_V8_R1_CHANGE_LIST.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
