"""Combined page exact native/PDF content, source record and physical front order."""
from pathlib import Path
from collections import Counter
import json,hashlib,xml.etree.ElementTree as E
import pdfplumber
from PIL import Image,ImageDraw
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/print_v5'
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
assert len(report['toc_entries'])==21 and len(report['toc_pending_excluded'])==4
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
assert frames['SHAN_TOC:editorial']['text'].split('\r')==source[:31]+display['short_copyright']
assert report['editorial_toc']['full_copyright']==source[31:]
with pdfplumber.open(OUT/'SHAN_REVIEW_V5.pdf') as pdf:
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
for name in ['SHAN_INTERIOR_PRINT_V5.pdf','SHAN_REVIEW_V5.pdf']:
    assert PdfReader(OUT/name).metadata['/Subject']=='\n'.join(source[31:])
result={'status':'PASS','combined_page':4,'side':'LEFT_HAND','editorial_width_mm':47,'contents_width_mm':98,
        'toc_entry_count':21,'actual_page_numbers':True,'source_editorial_paragraphs_unchanged':31,
        'authorized_short_copyright_only':True,'full_copyright_metadata_and_print_record':True,
        'all_names_and_SFA10422':True,'fire_start_page':5,'fire_transition_removed_by_parity':True,
        'all_chapters_recto':True,'overset':False,'one_divider':True,'exact_pdf_character_multiset':True}
(OUT/'EDITORIAL_TOC_PREFLIGHT.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result))
