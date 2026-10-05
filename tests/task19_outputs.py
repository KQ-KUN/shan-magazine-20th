"""Validate formal TOC against actual runtime and PDF, plus the approved credits."""
from pathlib import Path
import json,hashlib
import pdfplumber
from PIL import Image
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/print_v4'
report=json.loads((OUT/'SHAN_ASSEMBLY_REPORT.json').read_text('utf-8-sig'))
assert report['status']=='PASS' and report['toc_validation']['status']=='PASS'
assert report['credits_page']=={'interior_page':4,'printed_folio':4,'review_pdf_page':6,'side':'LEFT_HAND'}
assert report['toc_page']=={'interior_page':5,'printed_folio':5,'review_pdf_page':7,'side':'RIGHT_HAND','page_count':1}
assert report['toc_validation']['credits_toc_same_spread']
components={c['id']:c for c in report['components']}
assert components['chapter_origin']['start_page']==7
assert report['toc_page_numbers_source']=='CURRENT_ASSEMBLY_RUNTIME_COMPONENT_START_PAGE'
entries=report['toc_entries'];assert len(entries)==21
frames={f['label']:f for f in report['toc_rendering']['frames']}
assert not report['toc_rendering']['overset']
for e in entries:
    assert e['printed_folio']==e['interior_page']==components[e['component_id']]['start_page']
    assert e['review_pdf_page']==e['interior_page']+2
    if e['kind']=='chapter':assert e['printed_folio']%2==1
    key='SHAN_TOC:'+e['component_id']
    assert frames[key+':title']['text']==e['title']
    assert frames[key+':page']['text']==str(e['printed_folio'])
    if e['author']:assert frames[key+':author']['text']==e['author']
    assert all(f['interior_page']==5 and not f['overset'] and f['lines']>0 for k,f in frames.items() if k.startswith(key+':'))
assert {e['component_id'] for e in entries}.isdisjoint({'toc','editorial_info','origin_pending','now_pending','messages_pending','closing_pending'})
assert {'feature_monday_cup_backstage','xingyue'}<={e['component_id'] for e in entries}
assert all('start_page' not in p for p in report['toc_pending_excluded'])
assert all(p['review_pdf_page']==p['interior_page']+2 and p['printed_folio']==p['interior_page'] for p in report['physical_pages'])

# Compare moved credits against their approved PDF: all text/fonts/sizes/Y are
# exact, X changes only by the 3 mm difference between inside/outside margins.
old_plan=json.loads((ROOT/'content/PRINT_BOOK_BASELINE.json').read_text('utf-8'))
old=next(c for c in old_plan['components'] if c['id']=='editorial_info')
with pdfplumber.open(ROOT/old['file']) as approved,pdfplumber.open(OUT/'editorial_info.pdf') as moved:
    a=approved.pages[0].chars;b=moved.pages[0].chars;assert len(a)==len(b)
    for x,y in zip(a,b):
        assert x['text']==y['text'] and x['fontname'].split('+')[-1]==y['fontname'].split('+')[-1]
        assert all(abs(x[k]-y[k])<.04 for k in ('top','bottom','size'))
        assert all(abs((y[k]-x[k])+3*72/25.4)<.04 for k in ('x0','x1'))
    assert not approved.pages[0].images and not moved.pages[0].images
    assert 'SFA10422' in moved.pages[0].extract_text()
audit=json.loads((ROOT/'spec/EDITORIAL_INFO_SOURCE_AUDIT.json').read_text('utf-8'))
assert hashlib.sha256((ROOT/audit['source_file']).read_bytes()).hexdigest()==audit['source_sha256']

with pdfplumber.open(OUT/'SHAN_REVIEW_V4.pdf') as pdf:
    page=pdf.pages[6];text=page.extract_text() or ''
    assert '目录' in text and 'CONTENTS' in text and 'CONTENT PENDING' not in text
    assert not any(s in text for s in ('友协祝福','编后记','独立致谢页','优秀奖','二等奖','2022年第一期'))
    # Compare every intended character in independent native frames with the
    # rendered PDF, not line-break-normalized prose or keyword sampling.
    from collections import Counter
    assert Counter(ch['text'] for ch in page.chars)==Counter(''.join(f['text'] for f in frames.values()))
    assert all(ch['size']>=8.49 for ch in page.chars if 'SourceHanSans' in ch['fontname'] and ch['non_stroking_color']==(0,0,0,1))
    left=pdf.pages[5].crop(pdf.pages[5].trimbox).to_image(resolution=130).original.convert('RGB')
    right=page.crop(page.trimbox).to_image(resolution=130).original.convert('RGB')
    spread=Image.new('RGB',(left.width+right.width,max(left.height,right.height)),'white')
    spread.paste(left,(0,0));spread.paste(right,(left.width,0));spread.save(OUT/'SHAN_FRONT_MATTER_SPREAD.png')
    right.save(OUT/'SHAN_TOC_PAGE.png')
result={'status':'PASS','credits_page':4,'toc_page':5,'credits_left_toc_right_same_spread':True,
        'entry_count':len(entries),'all_numbers_match_actual_runtime':True,'chapter_numbers_point_to_openers':True,
        'all_toc_pdf_characters_match_native_frames':True,'credits_text_fonts_sizes_and_y_unchanged':True,
        'credits_only_x_shift_mm':-3,'editorial_source_sha256_unchanged':True,
        'pending_excluded':4,'fire_start_page':7,'overset':False,'front_matter_spread_rendered':True}
(OUT/'FRONT_MATTER_PREFLIGHT.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
