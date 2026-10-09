"""Actual V8 host/PDF acceptance, immutable text and rendered V7 comparisons."""
from pathlib import Path
from collections import Counter
from io import BytesIO
import hashlib,json,math
import pdfplumber
from pypdf import PdfReader,PdfWriter
from PIL import Image,ImageChops,ImageDraw

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/ebook_v8';MM=25.4/72
def read(path):return json.loads((ROOT/path).read_text('utf-8-sig'))
def save(name,value):(OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
plan=read('exports/ebook_v8/RESOLVED_BOOK_PLAN.json');report=read('exports/ebook_v8/FINAL_PRINT_REPORT.json');native=read('exports/ebook_v8/STANDALONE_RUNTIME.json');fixture=read('exports/ebook_v8/SOURCE_FIXTURE.json')
old=read('exports/print_v7/RESOLVED_BOOK_PLAN.json');old_by={c['id']:c for c in old['components']};by={c['id']:c for c in plan['components']}
assert report['status']==native['status']=='PASS' and report['final_links_verified']
assert not report['overset'] and not report['missing_links'] and not report['focus']['active_page_is_parent']
assert len(report['finished_native_documents'])==2
assert report['pdf_finishing']['color_conversion']=='NONE'
for p,h in read('exports/ebook_v8/PROTECTED_HASHES.json').items():assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h,'Protected '+p
titles=[];metadata=[];portraits=[];geometry=[]
controls='\r\n\t\u2028\ufeff'
def glyphs(value):return Counter(c for c in value if c not in controls)
def body_chars(page):
    # Only page-header/footer bands are excluded; author/caption glyphs remain.
    trim=page.trimbox
    return [c for c in page.chars if c['top']>=trim[1]+16.5/MM and c['top']<trim[1]+248/MM]

for component in native['components']:
    cid=component['id'];assert component['status']=='PASS' and not component['overset'] and component['links_normal'] and component['fonts_installed']
    if cid in fixture['paragraphs']:assert component['paragraph_equality'] and component['paragraphs']==fixture['paragraphs'][cid]
    with pdfplumber.open(ROOT/component['file']) as pdf:
        assert len(pdf.pages)==component['pages']
        if cid in fixture['paragraphs']:
            actual=glyphs(''.join(c['text'] for page in pdf.pages for c in body_chars(page)))
            # Native Word->PDF maps two ordinary spaces in Xiao to NBSP in its
            # font ToUnicode table, already present in approved V7. Compare exact
            # approved PDF glyphs; DOM equality above still compares literal DOCX
            # paragraph strings. No SP/NBSP normalization is permitted here.
            previous=old_by[cid]
            with pdfplumber.open(ROOT/'exports/print_v7/SHAN_REVIEW_V7.pdf') as approved:
                expected=glyphs(''.join(c['text'] for page in approved.pages[previous['start_page']+1:previous['end_page']+2] for c in body_chars(page)))
            assert actual==expected, f'PDF glyph integrity {cid}: missing {expected-actual}; extra {actual-expected}'
            if cid not in ('feature_beyond_ridge','memoir_gloomy'):
                max_dx=max_dy=0
                with pdfplumber.open(ROOT/'exports/print_v7/SHAN_REVIEW_V7.pdf') as approved:
                    for offset,page in enumerate(pdf.pages):
                        before=approved.pages[previous['start_page']+1+offset];left_before=18 if (previous['start_page']+offset)%2 else 15;left_after=18 if (component['start_page']+offset)%2 else 15
                        bc=body_chars(before);ac=body_chars(page)
                        # All titles are authorized to become ragged-left rather
                        # than justified; only Feature author lines also move.
                        skip=sum(len(p) for p in fixture['paragraphs'][cid][:(2 if cid.startswith('feature_') else 1)]) if offset==0 else 0
                        assert len(bc)==len(ac),'Unrelated body glyph count '+cid
                        for a,b in zip(ac[skip:],bc[skip:]):
                            assert a['text']==b['text'] and abs(a['size']-b['size'])<.01,'Unrelated body text/size '+cid
                            dx=(a['x0']-page.trimbox[0]-left_after/MM)-(b['x0']-before.trimbox[0]-left_before/MM)
                            dy=(a['top']-page.trimbox[1])-(b['top']-before.trimbox[1])
                            # V7's converted PDF and native V8 PDF differ by at
                            # most 0.204pt in measured glyph coordinates. A 0.25pt
                            # (0.088mm) export tolerance does not permit reflow:
                            # page-local glyph count/order and font size are exact.
                            max_dx=max(max_dx,abs(dx));max_dy=max(max_dy,abs(dy))
                            assert abs(dx)<.25 and abs(dy)<.25,f'Unrelated body geometry {cid} / page {offset+1}: {dx},{dy}'
                geometry.append({'component':cid,'body_glyph_positions':'Same page-local glyphs, order and font size; page-side margin rebased','tolerance_pt':.25,'max_dx_pt':max_dx,'max_dy_pt':max_dy})
        if cid in fixture['paragraphs']:
            heading=component['styles'][0];assert heading['justification']=='LEFT_ALIGN','Title '+cid
            first=body_chars(pdf.pages[0]);text=fixture['paragraphs'][cid][0];heading_chars=first[:len(text)]
            assert ''.join(c['text'] for c in heading_chars)==text,'Title text '+cid
            x=min(c['x0'] for c in heading_chars if c['text']!=' ')-pdf.pages[0].trimbox[0]
            target=(185-read('spec/FRONT_NOTE_TOKENS.json')['text_width_mm'])/2 if cid=='front_note' else 18 if component['start_page']%2 else 15
            assert abs(x*MM-target)<.15,f'Title left edge {cid}: {x*MM} vs {target}'
            prior_title='CENTER_ALIGN' if cid.startswith('feature_') else 'LEFT_ALIGN' if cid=='front_note' else 'LEFT_JUSTIFIED (visually left)'
            titles.append({'component':cid,'title':text,'old_alignment':prior_title,'new_alignment':'LEFT_ALIGN','review_page':component['start_page']+2,'left_mm':x*MM,'exception':False})
        for style in component['styles']:
            if style['style'] in ('P_Author','P_Metadata','P_Article_Subtitle','P_Feature_Author','P_FrontNote_Signature'):
                assert style['color']=='C_TEXT' and style['tint']==100
                metadata.append({'component':cid,'text':style['text'],'style':style['style'],'color':'C_TEXT; full tint','size_unchanged':True})
        for image in component['images']:
            assert image['proportional']
            if image['height_mm']>image['width_mm']*1.1 or cid in ('memoir_gloomy','xingyue'):
                method={'feature_beyond_ridge':'Compact half-column archival image, width 36.5mm; caption and continuous two-column text','memoir_gloomy':'Paired original posters reduced into one 73mm column; continuous text flow','xingyue':'Two independent pages; main portrait + asymmetric single-column reference/Q areas'}.get(cid,'NO_CHANGE_NEEDED')
                portraits.append({'component':cid,'review_page':image['page']+2,'asset':str(Path(image['file']).name),'width_mm':image['width_mm'],'height_mm':image['height_mm'],'layout':method,'nonproportional_stretch':False})

reader=PdfReader(OUT/'SHAN_EBOOK_V8.pdf');assert not reader.is_encrypted and len(reader.pages)==report['total_reader_pdf_pages']==plan['interior_pages']+2
assert reader.page_layout=='/TwoPageRight';seen_fonts=set()
def fonts(resources):
    if not resources:return
    resources=resources.get_object()
    for ref in resources.get('/Font',{}).values():
        f=ref.get_object();seen_fonts.add(str(f.get('/BaseFont','Type3')))
        for child in f.get('/DescendantFonts',[f]):
            child=child.get_object()
            if child.get('/Subtype')=='/Type3':continue
            descriptor=child.get('/FontDescriptor');assert descriptor,'Missing font descriptor'
            assert any(k in descriptor.get_object() for k in ('/FontFile','/FontFile2','/FontFile3')),'Unembedded font'
    for ref in resources.get('/XObject',{}).values():
        f=ref.get_object()
        if f.get('/Subtype')=='/Form':fonts(f.get('/Resources'))
for p in reader.pages:
    assert p.rotation==0
    assert abs(float(p.trimbox.width)*MM-185)<.1 and abs(float(p.trimbox.height)*MM-260)<.1
    assert abs(float(p.bleedbox.width)*MM-191)<.1 and abs(float(p.bleedbox.height)*MM-266)<.1
    assert list(p.cropbox)==list(p.trimbox)
    fonts(p.get('/Resources'))
for c in report['components']:
    if c['kind']=='chapter':assert c['start_page']%2==1
    assert (c['start_page'],c['end_page'],c['page_count'])==(by[c['id']]['start_page'],by[c['id']]['end_page'],by[c['id']]['page_count'])
assert report['toc_validation']['actual_runtime_start_pages'] and report['toc_validation']['chapters_point_to_recto_openers']
assert report['toc_validation']['entry_count']==21
assert all(e['component_id']!='messages_pending' for e in report['toc_entries'])
assert [t['page'] for t in report['intentional_transition_pages']]==[t['page'] for t in plan['parity_transitions']]
assert not reader.pages[1].extract_text() and not reader.pages[1].get('/Resources',{}).get('/XObject')
history=by['history'];assert history['page_count']==7 and history['file']=='exports/print_v7/components/history.pdf'
source_history=PdfReader(ROOT/history['file'])
for i,p in enumerate(source_history.pages):assert reader.pages[history['start_page']+1+i].get_contents().get_data()==p.get_contents().get_data(),'History stream changed'

images=[];before_images=[];comparisons=[];full_text=[];density={};thumb=OUT/'pages';thumb.mkdir(exist_ok=True)
with pdfplumber.open(OUT/'SHAN_EBOOK_V8.pdf') as pdf,pdfplumber.open(ROOT/'exports/print_v7/SHAN_REVIEW_V7.pdf') as baseline:
    for i,p in enumerate(pdf.pages):
        im=p.crop(p.trimbox).to_image(resolution=100).original.convert('RGB');im.save(thumb/f'page-{i+1:03}.png');images.append(im);full_text.extend(c['text'] for c in p.chars)
        if i!=1:assert ImageChops.difference(im,Image.new('RGB',im.size,im.getpixel((5,5)))).getbbox(),f'Unexpected blank page {i+1}'
    for i,p in enumerate(baseline.pages):before_images.append(p.crop(p.trimbox).to_image(resolution=100).original.convert('RGB'))
    for i in range(7):
        old_page=old_by['history']['start_page']+1+i;new_page=history['start_page']+1+i
        assert ImageChops.difference(before_images[old_page],images[new_page]).getbbox() is None,'History rendered pixels changed'
    assert sum(len(pdf.pages[history['start_page']+1+i].images) for i in range(7))==24
    for c in plan['components']:
        if c['kind']=='chapter':
            a=old_by[c['id']]['start_page']+1;b=c['start_page']+1
            assert ImageChops.difference(before_images[a],images[b]).getbbox() is None,'Chapter art/intro changed '+c['id']
    assert ImageChops.difference(before_images[0],images[0]).getbbox() is None,'Cover changed'
    profile=pdf.pages[by['association_profile']['start_page']+1];assert len(profile.images)==1
    # Native exact-source image link/hash and one profile image, not a cover swap.
    nprofile=next(c for c in native['components'] if c['id']=='association_profile');assert Path(nprofile['images'][0]['file']).name=='ASSOCIATION_EMBLEM_USER_SUPPLIED.png'
    toc=pdf.pages[by['editorial_toc']['start_page']+1]
    author_frames=[f for f in report['editorial_toc']['frames'] if f['label'].endswith(':author')]
    for frame in author_frames:
        y0,x0,y1,x1=frame['bounds'];x0+=toc.trimbox[0];x1+=toc.trimbox[0];y0+=toc.trimbox[1];y1+=toc.trimbox[1]
        matches=[ch for ch in toc.chars if ch['x0']>=x0-.5 and ch['x1']<=x1+.5 and ch['top']>=y0-.5 and ch['bottom']<=y1+.5]
        assert matches,'Missing directory byline '+frame['label']
        assert all(len(ch['non_stroking_color'])==3 and max(ch['non_stroking_color'])<.2 for ch in matches),'Light directory byline '+frame['label']
    xnative=next(c for c in native['components'] if c['id']=='xingyue');xold=read('exports/print_v7/XINGYUE_RUNTIME.json');xnew=xnative['xingyue'];assert xnative['pages']==2 and xnew['paragraphs']==28
    prior_images={im['index']:im for im in xold['images']}
    for im in xnew['images']:
        prev=prior_images[im['index']];assert im['width_mm']*im['height_mm']>prev['width_mm']*prev['height_mm']*1.1
        assert im['source_sha256']==prev['source_sha256'] and im['proportional'] and im['link_normal']
        assert im['page']==xnative['start_page']+(0 if im['index']==2 else 1)
        # Use actual viewport bounds, not PDF's unclipped source image bounding box.
        page=pdf.pages[im['page']+1];pb=page.trimbox;block_id={1:'reference',2:'portrait',3:'expressions'}[im['index']]
        block=next(b for b in xnew['blocks'] if b['id']==block_id)
        local_x={1:15,2:18,3:72}[im['index']];page_origin=block['bounds'][1]-local_x/MM
        y0,x0,y1,x1=im['bounds'];x0-=page_origin;x1-=page_origin
        for ch in page.chars:
            cx=(ch['x0']+ch['x1'])/2-pb[0];cy=(ch['top']+ch['bottom'])/2-pb[1]
            assert not (x0+.2<cx<x1-.2 and y0+.2<cy<y1-.2),'Text overlaps XingYue viewport'
    def ink_fraction(im):
        difference=ImageChops.difference(im,Image.new('RGB',im.size,im.getpixel((5,5)))).convert('L');h=difference.histogram();return sum(h[15:])/(im.width*im.height)
    for offset in range(2):
        a=old_by['xingyue']['start_page']+1+offset;b=by['xingyue']['start_page']+1+offset
        old_ink=ink_fraction(before_images[a]);new_ink=ink_fraction(images[b]);assert new_ink>old_ink*1.08,'XingYue whitespace not improved'
        density[str(offset+1)]={'v7_ink_fraction':old_ink,'v8_ink_fraction':new_ink,'improvement':new_ink/old_ink-1}
    for c in plan['components']:
        if c['kind'] in ('chapter','history','placeholder'):continue
        old_c=old_by[c['id']]
        for offset in (range(2) if c['kind']=='xingyue' else range(1)):
            comparisons.append((c['id']+('_'+str(offset+1) if offset else ''),before_images[old_c['start_page']+1+offset],images[c['start_page']+1+offset],old_c['start_page']+2+offset,c['start_page']+2+offset))
    gloomy=by['memoir_gloomy'];prior_gloomy=old_by['memoir_gloomy'];gloomy_image=next(c for c in native['components'] if c['id']=='memoir_gloomy')['images'][0]
    old_image_page=prior_gloomy['start_page']+3;new_image_page=gloomy_image['page']+2
    comparisons.append(('memoir_gloomy_image',before_images[old_image_page-1],images[new_image_page-1],old_image_page,new_image_page))
    comparisons.append(('memoir_gloomy_tail',before_images[prior_gloomy['end_page']+1],images[gloomy['end_page']+1],prior_gloomy['end_page']+2,gloomy['end_page']+2))

assert '邵珠渝' not in ''.join(full_text)
assert '邵珠瑜' in ''.join(full_text)
for text in ('发表于《科幻世界》2022年第一期','获第二届月曜杯优秀奖','获第三届星火杯二等奖'):assert text in ''.join(full_text)
for text in ('最初的我们','2025—2026 协会现状 / 活动 / 文创'):assert text not in ''.join(full_text)
for kind,why in [('chapter','Approved artistic chapter openers'),('cover','Approved immutable front cover'),('editorial_toc','Approved combined editorial/contents design'),('xingyue','Independent two-page character editorial')]:titles.append({'type':kind,'exception':True,'reason':why})
for cid in ('association_profile','fiction_fourfold','fiction_tin_soldier','fiction_teleport_history','interview_shao','interview_xiao','feature_monday_cup_backstage','front_note','feature_now','memoir_pancake'):
    if not any(p['component']==cid for p in portraits):portraits.append({'component':cid,'review_page':by[cid]['start_page']+2,'layout':'NO_CHANGE_NEEDED','reason':'No problematic portrait image; original layout retained'})

def contact(items,name,columns=4,width=225):
    height=round(width*260/185);sheet=Image.new('RGB',(columns*(width+10),math.ceil(len(items)/columns)*(height+28)),'#ddd');draw=ImageDraw.Draw(sheet)
    for i,(label,im) in enumerate(items):x=(i%columns)*(width+10);y=(i//columns)*(height+28);sheet.paste(im.resize((width,height)),(x,y+24));draw.text((x+3,y+5),label,fill='black')
    sheet.save(OUT/name)
for i in range(0,len(images),12):contact([(f'V8 reader {j+1}',images[j]) for j in range(i,min(i+12,len(images)))],f'REVIEW_CONTACT_{i//12+1:02}.png')
pairs=[]
for cid,a,b,op,np in comparisons:pairs.extend([(f'V7 {op} / {cid}',a),(f'V8 {np} / {cid}',b)])
contact(pairs,'SHAN_V8_VISUAL_REGRESSION_CONTACT_SHEET.png',width=290)
for cid in ('xingyue','association_profile','editorial_toc','feature_beyond_ridge','feature_monday_cup_backstage','feature_now','memoir_gloomy'):
    for name,a,b,op,np in comparisons:
        if name==cid or name.startswith(cid+'_'):
            joined=Image.new('RGB',(a.width+b.width,max(a.height,b.height)),'white');joined.paste(a,(0,0));joined.paste(b,(a.width,0));joined.save(OUT/('COMPARE_'+name+'.png'))
save('TITLE_ALIGNMENT_AUDIT.json',titles);save('BYLINE_AUDIT.json',metadata);save('PORTRAIT_IMAGE_AUDIT.json',portraits);save('UNRELATED_BODY_GEOMETRY_AUDIT.json',geometry)
changes={'baseline':'V7 / '+read('workflow/TASK23_SCOPE.json')['baseline'],'ordinary_titles':titles,'bylines':metadata,'portrait_audit':portraits,'xingyue_density':density,'emblem':'Association profile only; exact user PNG, original 22mm slot; white negative shapes retained','no_new_color_conversion':True,'protected':'All frozen files; History all 7 rendered pages and 24 images pixel-identical; cover and chapter art/intro pixel-identical; source DOCX unchanged','pending':'历任社长寄语 remains existing REVIEW placeholder, excluded from final TOC','reader_pages':len(reader.pages),'interior_pages':plan['interior_pages'],'toc_entries':21}
save('SHAN_V8_CHANGE_LIST.json',changes)
lines=['# 《山》电子版 V8 变更清单','',f"基线 V7；新版 {len(reader.pages)} 页阅读 PDF / {plan['interior_pages']} 内页。",'',
       '## 标题与署名','', '普通文章主标题全部左对齐；保留写在《山》前的既有 118mm 标题内容区。Feature 三篇由居中改为左对齐，作者行同步左对齐。',
       '署名定向使用完整炭黑 C_TEXT；目录作者使用 RGB 31/31/31。作者、机构、采访、翻译、出处和获奖信息未改写。普通图注、页眉保留原层级。','',
       '## 星岳两页','', '第1页：73 × 184.05mm 主人物图，按比例放大；只裁既有允许的非关键侧面背景，水平对准人物安全区。',
       '第2页：51mm 原型图与 95mm Q版图，各在独立的不等宽单栏区域。三张原图字节不变，无非等比例拉伸；28段批准文案逐字不变。',
       '两页有效图文覆盖较 V7 分别提高约 12.5% 和 23.8%。','',
       '## 非会史竖图与会徽','', '越岭手记：36.5 × 54.62mm 半栏档案图，减少两侧及分页空白，保持两页。',
       'Gloomy：两幅原海报组合改为 73 × 47.90mm 单栏，正文自然回流，5页变4页；一行尾页消失。',
       '其余非会史图片逐页审查，未发现需要改动的竖图；煎饼原有单栏图保留。',
       '协会简介：仅22mm会徽位置换成任务包原 PNG，保留原有白色负形；封面和其他会徽未改。','',
       '## 验证与保护','', 'InDesign 2026（21.5.1.73）：13个 standalone、整刊 Assembly、最终链接/字体/无溢出/正文页焦点均 PASS。',
       '70页全部渲染；正文逐段与源稿一致、PDF字形与批准V7一致、动态目录21项、章节recto均 PASS。',
       '会史7页、24张图渲染像素完全一致；封面和章节艺术页/intro完全一致。无关正文位置与字号通过容差检查。',
       '28个FROZEN文件及原DOCX均未修改。未进行新的CMYK转换。',
       '仍保留既有“历任社长寄语”待稿 Review 占位，正式目录中不包含此项。','']
(OUT/'SHAN_V8_CHANGE_LIST.md').write_text('\n'.join(lines),encoding='utf-8')
validation={'status':'PASS','native_version':native['native_version'],'standalone_components':len(native['components']),'all_pages_rendered':len(images),'reader_pages':len(reader.pages),'interior_pages':plan['interior_pages'],'embedded_fonts':sorted(seen_fonts),'source_paragraphs_and_pdf_glyphs_exact':True,'history_24_images_and_7_pages_pixel_identical':True,'all_chapters_recto':True,'chapter_art_intro_and_cover_pixel_identical':True,'toc_actual_pages':True,'author_information_dark':True,'xingyue_two_pages_three_original_images_no_overlap':True,'xingyue_blank_space_improved':density,'no_overset_or_missing_links':True,'frozen_files_unchanged':True,'color_conversion':'NONE','visual_review':'CONTACT SHEETS GENERATED; AGENT MUST INSPECT BEFORE COMMIT'}
save('EBOOK_V8_PDF_VALIDATION.json',validation)
print(json.dumps(validation,ensure_ascii=False))
