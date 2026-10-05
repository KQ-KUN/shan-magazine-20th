"""Retain approved body PDF streams exactly; use native InDesign chapter art.

InDesign re-encodes placed PDF fonts (including NBSP -> SP) and rounds glyph
positions on export. This final assembly avoids any normalization or reflow.
It changes neither body page counts nor the physical book model.
"""
from pathlib import Path
import hashlib,json
import time,argparse
from pypdf import PdfReader,PdfWriter

parser=argparse.ArgumentParser();versions=parser.add_mutually_exclusive_group();versions.add_argument('--v3',action='store_true');versions.add_argument('--v4',action='store_true');options=parser.parse_args()
root=Path(__file__).resolve().parents[1];out=root/('exports/print_v4' if options.v4 else 'exports/print_v3' if options.v3 else 'exports/print_v2');version='V4' if options.v4 else 'V3' if options.v3 else 'V2'

def replace_output(temporary,destination):
    # Windows PDF preview/readers may hold a transient share lock. Keep the
    # original intact and retry atomic replacement briefly; never force-close
    # another application or fall back to truncating the destination.
    for attempt in range(6):
        try:
            temporary.replace(destination)
            return
        except PermissionError:
            if attempt==5:raise
            time.sleep(.25*(attempt+1))
baseline=json.loads((root/('exports/print_v4/RESOLVED_BOOK_PLAN.json' if options.v4 else 'exports/print_v3/RESOLVED_BOOK_PLAN.json' if options.v3 else 'content/PRINT_BOOK_BASELINE.json')).read_text('utf-8'))
inputs=json.loads((out/'PRINT_COMPONENT_INPUTS.json').read_text('utf-8'))
report=json.loads((out/'FINAL_PRINT_REPORT.json').read_text('utf-8'))
count=baseline['interior_pages'];reader_count=count+2
assert report['status']=='PASS' and report['interior_pages']==count and report['total_reader_pdf_pages']==reader_count
by_id={c['id']:c for c in inputs['components']}
native=PdfReader(out/f'SHAN_INTERIOR_PRINT_{version}.pdf')
native_reader=PdfReader(out/f'SHAN_REVIEW_{version}.pdf')
assert len(native.pages)==count and len(native_reader.pages)==reader_count
writer=PdfWriter()
body_pages={}
for c in baseline['components']:
    if c['kind'] in ('chapter','toc'):continue
    entry=by_id[c['id']];file=root/entry['file']
    assert hashlib.sha256(file.read_bytes()).hexdigest()==entry['sha256']
    assert entry['source_sha256']==c['sha256']
    reader=PdfReader(file)
    assert len(reader.pages)==c['page_count']
    for offset,page in enumerate(reader.pages):body_pages[c['start_page']-1+offset]=page
for index,page in enumerate(native.pages):writer.add_page(body_pages.get(index,page))
interior_file=out/f'SHAN_INTERIOR_PRINT_{version}.pdf'
temporary=interior_file.with_suffix('.finish.tmp')
with temporary.open('wb') as output:writer.write(output)
check=PdfReader(temporary)
assert len(check.pages)==count
for index,source in body_pages.items():
    target=check.pages[index]
    assert source.get_contents().get_data()==target.get_contents().get_data()
    assert source.extract_text()==target.extract_text()
    assert list(source.trimbox)==list(target.trimbox) and list(source.bleedbox)==list(target.bleedbox)
replace_output(temporary,interior_file)

cover_file=root/'assets/cover/SHAN_FRONT_COVER_FINAL.pdf'
assert hashlib.sha256(cover_file.read_bytes()).hexdigest()==baseline['approved_cover_sha256']
review=PdfWriter();review.add_page(PdfReader(cover_file).pages[0])
# Use the genuinely blank native C2. No masking/removal of printed objects.
c2=native_reader.pages[1]
assert not c2.extract_text() and not c2.get('/Resources',{}).get('/XObject')
review.add_page(c2)
for page in check.pages:review.add_page(page)
review.page_layout='/TwoPageRight'
for page in review.pages:page.cropbox=page.trimbox
review_file=out/f'SHAN_REVIEW_{version}.pdf';temporary=review_file.with_suffix('.finish.tmp')
with temporary.open('wb') as output:review.write(output)
check_review=PdfReader(temporary)
assert len(check_review.pages)==reader_count and check_review.page_layout=='/TwoPageRight'
for index,page in enumerate(check.pages):
    target=check_review.pages[index+2]
    assert page.get_contents().get_data()==target.get_contents().get_data()
    assert list(page.trimbox)==list(target.trimbox) and list(page.bleedbox)==list(target.bleedbox)
replace_output(temporary,review_file)
report['pdf_finishing']={'status':'PASS','body_pages_exact_stream_passthrough':len(body_pages),
    'source_text_normalization':'NONE','native_chapter_and_transition_pages':count-len(body_pages)-sum(c['page_count'] for c in baseline['components'] if c['kind']=='toc'),
    'native_toc_pages':sum(c['page_count'] for c in baseline['components'] if c['kind']=='toc'),
    'reader_layout':'TwoPageRight','reader_crop':'TrimBox; MediaBox/BleedBox remain full bleed',
    'cover_original_page_passthrough':True,'c2_native_blank_page_passthrough':True}
for name in ['FINAL_PRINT_REPORT.json','FINAL_PRINT_REPORT.txt']:
    (out/name).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS final PDFs: exact body streams and Unicode; native art; original cover; native blank C2; TwoPageRight')
