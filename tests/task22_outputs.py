"""Combined page exact native/PDF content, source record and physical front order."""
from pathlib import Path
from collections import Counter
import json,hashlib,xml.etree.ElementTree as E
import pdfplumber
from PIL import Image,ImageDraw
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/print_v7'
report=json.loads((OUT/'SHAN_ASSEMBLY_REPORT.json').read_text('utf-8-sig'))
assert report['status']=='PASS' and report['toc_validation']['credits_toc_same_page']
assert report['credits_page']['interior_page']==report['toc_page']['interior_page']==4
assert report['credits_page']['side']==report['toc_page']['side']=='LEFT_HAND'
assert report['toc_page']['page_count']==report['editorial_toc']['page_count']==1
assert report['editorial_toc']['divider'] and not report['editorial_toc']['overset']
assert report['editorial_toc']['editorial_width_mm']==47 and report['editorial_toc']['contents_width_mm']==98
components={c['id']:c for c in report['components']};assert 'editorial_info' not in components and 'toc' not in components
assert components['chapter_origin']['start_page']==5
assert all(c['start_page']%2 for c in report['components'] if c['kind']=='chapter')
assert not any(t['before']=='chapter_origin' for t in report['intentional_transition_pages'])
assert len(report['toc_entries'])==21 and len(report['toc_pending_excluded'])==1
assert report['toc_page_numbers_source']=='CURRENT_ASSEMBLY_RUNTIME_COMPONENT_START_PAGE'
frames={f['label']:f for f in report['toc_rendering']['frames']}
for e in report['toc_entries']:
    assert e['printed_folio']==components[e['component_id']]['start_page']==e['interior_page']
    assert e['review_pdf_page']==e['interior_page']+2
    key='SHAN_TOC:'+e['component_id'];title=(e['display_index']+'　' if e['display_index'] else '')+e['title']
    assert frames[key+':title']['text']==title and frames[key+':page']['text']==str(e['printed_folio'])
    if e['author']:assert frames[key+':author']['text']==e['author']
assert {'feature_monday_cup_backstage','xingyue'}<={e['component_id'] for e in report['toc_entries']}
audit=json.loads((ROOT/'spec/EDITORIAL_INFO_SOURCE_AUDIT.json').read_text('utf-8'))
assert hashlib.sha256((ROOT/audit['source_file']).read_bytes()).hexdigest()==audit['source_sha256']==report['editorial_toc']['source_sha256']
xml=E.fromstring((ROOT/audit['xml_file']).read_text('utf-8'));ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
source=[''.join(t.text or '' for t in p.findall('.//w:t',ns)) for p in xml.findall('.//w:body/w:p',ns)]
display=json.loads((ROOT/'content/EDITORIAL_TOC_DISPLAY.json').read_text('utf-8'))
staff=display['staff_display'];expected=source[:31]
for row in staff:
    assert expected[row['source_paragraph']-1]==row['source_text']
    expected[row['source_paragraph']-1]=row['display_text']
assert frames['SHAN_TOC:editorial']['text'].split('\r')==expected+display['short_copyright']
assert all(not any(c in row['display_text'] for c in '()（）') for row in staff)
assert report['editorial_toc']['unchanged_editorial_paragraphs']==23
assert report['editorial_toc']['staff_display_transforms']==staff

assert report['editorial_toc']['full_copyright']==source[31:]
with pdfplumber.open(OUT/'SHAN_REVIEW_V7.pdf') as pdf:
    page=pdf.pages[5];text=page.extract_text() or ''
    for name in ['谭杨','黄可其','李司煜','袁琦','贾锦阳','于笑涵','黄阳金','SFA10422']:assert name in text
    assert 'CONTENT PENDING' not in text
    assert Counter(ch['text'] for ch in page.chars)==Counter(''.join(f['text'] for f in frames.values()).replace('\r',''))
    assert len(page.lines)>=1
    vertical=[l for l in page.lines if abs(l['x0']-l['x1'])<.05 and l['height']>600];assert len(vertical)==1
    assert all(f['interior_page']==4 and f['lines']>0 and not f['overset'] for f in frames.values())
    page.crop(page.trimbox).to_image(resolution=160).original.save(OUT/'SHAN_EDITORIAL_TOC_PAGE.png')
    images=[p.crop(p.trimbox).to_image(resolution=60).original.convert('RGB') for p in pdf.pages[:7]]
    w,h=images[0].size;sheet=Image.new('RGB',(w*4,h*2+48),'#ddd');draw=ImageDraw.Draw(sheet)
    labels=['Front Cover','C2 blank','1 RIGHT | Prologue','2 LEFT | Front note','3 RIGHT | Profile','4 LEFT | Editorial + Contents','5 RIGHT | Fire opener']
    for i,im in enumerate(images):
        x=i%4*w;y=i//4*(h+24);draw.text((x+5,y+5),labels[i],fill='black');sheet.paste(im,(x,y+24))
    sheet.save(OUT/'SHAN_FRONT_MATTER_CONTACT_SHEET.png')
for name in ['SHAN_INTERIOR_PRINT_V7.pdf','SHAN_REVIEW_V7.pdf']:
    assert PdfReader(OUT/name).metadata['/Subject']=='\n'.join(source[31:])
result={'status':'PASS','combined_page':4,'side':'LEFT_HAND','editorial_width_mm':47,'contents_width_mm':98,
        'toc_entry_count':21,'actual_page_numbers':True,'source_editorial_paragraphs_unchanged':23,'explicit_staff_display_transforms':8,
        'authorized_short_copyright_only':True,'full_copyright_metadata_and_print_record':True,
        'all_names_and_SFA10422':True,'fire_start_page':5,'fire_transition_removed_by_parity':True,
        'all_chapters_recto':True,'overset':False,'one_divider':True,'exact_pdf_character_multiset':True}
(OUT/'EDITORIAL_TOC_PREFLIGHT.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result))

# Current content state and exact XingYue display paragraphs, not keyword-only validation.
assert [c['id'] for c in report['components'] if c['kind']=='placeholder']==['messages_pending']
assert not {'origin_pending','now_pending','closing_pending'} & components.keys()
assert all(e['component_id']!='messages_pending' for e in report['toc_entries'])
xing=json.loads((OUT/'XINGYUE_RUNTIME.json').read_text('utf-8-sig'))
data=json.loads((ROOT/'content/XINGYUE.json').read_text('utf-8'))
assert xing['status']=='PASS' and xing['pages']==components['xingyue']['page_count']==2 and not xing['overset']
actual={p['display_paragraph']:p['text'] for b in xing['blocks'] for p in b['paragraphs']}
assert xing['paragraphs']==len(data['paragraphs'])==sum(len(b['paragraphs']) for b in xing['blocks'])
assert actual=={i+1:p['text'] for i,p in enumerate(data['paragraphs'])}
assert all(not b['overset'] and all(p['lines']>0 for p in b['paragraphs']) for b in xing['blocks'])
images={i['index']:i for i in xing['images']};assert set(images)=={1,2,3}
assert images[2]['column']==1 and images[2]['page']==xing['start_page']
assert images[3]['column']==2 and images[3]['page']==xing['end_page']
assert images[2]['width_mm']>44*1.5 and images[3]['width_mm']>32*2
for image in images.values():assert image['link_normal'] and image['proportional']
assert images[1]['page']==xing['end_page']
assert abs(images[3]['width_mm']/72-1.2)<.002
assert images[2]['height_mm']>150
from PIL import Image
with pdfplumber.open(OUT/'XINGYUE_NATIVE.pdf') as native, pdfplumber.open(OUT/'SHAN_REVIEW_V7.pdf') as final:
    pages=final.pages[xing['start_page']+1:xing['end_page']+2]
    assert len(pages)==2
    assert sum(len(p.images) for p in pages)==3
    for page in pages:
        for image in page.images:
            if pages.index(page)==0:
                # PDF exposes graphic background outside the rectangle clip.
                # Use the actual native rectangle, not its unclipped image matrix.
                image=dict(image)
                image['x0']=max(image['x0'],float(page.trimbox[0])+images[2]['bounds'][1])
                image['x1']=min(image['x1'],float(page.trimbox[0])+images[2]['bounds'][3])
            # Painted text cannot overlap any image; caption spacing is checked
            # by the final PDF bounds as well as native ownership.
            for ch in page.chars:
                if ch['text'].isspace():continue
                overlap_x=min(ch['x1'],image['x1'])-max(ch['x0'],image['x0'])
                overlap_y=min(ch['bottom'],image['bottom'])-max(ch['top'],image['top'])
                assert overlap_x<.1 or overlap_y<.1, 'Text overlaps XingYue image'

    # Explicit frame paragraph equality above preserves spaces. PDF extraction
    # can paint ASCII word spaces as advances; compare every painted glyph to
    # standalone output, while DOM equality supplies all unpainted whitespace.
    assert [Counter(ch['text'] for ch in p.chars) for p in pages]==[Counter(ch['text'] for ch in p.chars) for p in native.pages]
    for i,page in enumerate(pages):
        assert page.chars and page.images
        page.crop(page.trimbox).to_image(resolution=150).original.save(OUT/f'XINGYUE_PAGE_{i+1}.png')
        nimages=native.pages[i].images
        assert len(nimages)==len(page.images)
        for before,after in zip(nimages,page.images):
            assert abs(before['width']-after['width'])<.04 and abs(before['height']-after['height'])<.04
    # The first column is the left half of the live area, irrespective of verso/recto.
    assert min(im['x0'] for im in pages[0].images)<float(pages[0].trimbox[0])+95*72/25.4
    pair=[Image.open(OUT/f'XINGYUE_PAGE_{i+1}.png').convert('RGB').resize((437,614)) for i in range(2)]
    sheet=Image.new('RGB',(890,614),'#ddd');sheet.paste(pair[0],(0,0));sheet.paste(pair[1],(453,0));sheet.save(OUT/'XINGYUE_CONTACT.png')
result.update(only_pending='messages_pending',removed_placeholders=['origin_pending','now_pending','closing_pending'],xingyue_pages=2,xingyue_complete_paragraph_equality=True,xingyue_images=images)
(OUT/'TASK22_PREFLIGHT.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS TASK21 PDF: exact display paragraphs / 3 original images / enlarged portrait and emoji / no cancelled pages / sole Pending excluded from TOC')

import sys,subprocess
sys.path.insert(0,str(ROOT/'tools'))
from task22_source import verify
correction=verify()
name=json.loads((OUT/'INTERVIEW_NAME_RUNTIME.json').read_text('utf-8-sig'))
assert name['status']=='PASS' and name['paragraphs_exact'] and not name['overset']
assert name['paragraphs']==correction['layout_paragraphs']
with pdfplumber.open(ROOT/'exports/print_v6/SHAN_REVIEW_V6.pdf') as before,pdfplumber.open(OUT/'SHAN_REVIEW_V7.pdf') as after:
 assert len(before.pages)==len(after.pages)==72
 assert '邵珠渝' not in ''.join(ch['text'] for p in after.pages for ch in p.chars)
 delta=[]
 for n,(a,b) in enumerate(zip(before.pages,after.pages),1):
  if n in [xing['start_page']+2,xing['end_page']+2]:continue
  assert len(a.chars)==len(b.chars),'Other page glyph count '+str(n)
  # PDF operator order may differ when a folio is rebased. Match by painted
  # position; exact paragraph order is independently checked in native DOM.
  position=lambda ch:(round(ch['top'],3),round(ch['x0'],3))
  for x,y in zip(sorted(a.chars,key=position),sorted(b.chars,key=position)):
   if x['text']!=y['text']:
    assert x['text']=='渝' and y['text']=='瑜' and n==13
    delta.append(n)
   for key in ['x0','x1','top','bottom','size']:
    # The one-character Word re-import can recompose sub-point baselines.
    # Permit <0.1pt (0.036mm) vertically on its three pages only; horizontal
    # placement stays within 0.006pt and font sizes must remain identical.
    tolerance=(.1 if key in ['top','bottom'] else .006) if n in [11,12,13] else .06
    assert abs(x[key]-y[key])<tolerance,'Other page geometry changed '+str((n,key,x['text']))
   assert x['fontname'].split('+')[-1]==y['fontname'].split('+')[-1],'Other page font changed '+str(n)
  assert len(a.images)==len(b.images),'Other page images changed '+str(n)
 assert delta==[13]
 page=after.pages[12];page.crop(page.trimbox).to_image(resolution=150).original.save(OUT/'INTERVIEW_NAME_PAGE.png')
 with pdfplumber.open(ROOT/'exports/print_v6/XINGYUE_NATIVE.pdf') as v6,pdfplumber.open(OUT/'XINGYUE_NATIVE.pdf') as v7:
  assert Counter(ch['text'] for p in v6.pages for ch in p.chars)==Counter(ch['text'] for p in v7.pages for ch in p.chars),'XingYue painted text differs from V6'
result.update(name_correction={'source_paragraph':30,'interior_page':11,'reader_page':13,'count':1,'exact_interview_paragraphs':37,'wrong_name_final_count':0},all_other_page_glyphs_and_geometry_unchanged=True,interview_vertical_recomposition_tolerance_pt=.1,interview_horizontal_tolerance_pt=.006,chapter_intros_v6_unchanged=True,xingyue_copy_v6_unchanged=True,q_image_growth_percent=20,prototype_page=2,portrait_full_height_and_key_region_preserved=True)
(OUT/'TASK22_PREFLIGHT.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS TASK22 PDF: exact one name character; other page glyphs/geometry and chapter intros unchanged; exact V6 XingYue text; moved prototype; +20% Q; no overlap')
