"""Read-only source/PDF checks for TASK16. Native text equality remains exact."""
from pathlib import Path
import hashlib
import json
import zipfile
import pdfplumber
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'exports/task16'
audit=json.loads((ROOT/'spec/TASK16_SOURCE_AUDIT.json').read_text('utf-8'))
with zipfile.ZipFile(ROOT/audit['source']) as package:
    for image in audit['images']:
        assert package.read(image['zip_member'])==(ROOT/image['file']).read_bytes()
assert hashlib.sha256((ROOT/audit['source']).read_bytes()).hexdigest()==audit['sha256']
# Pancake's frozen CLEAN manuscript deliberately has no embedded media. Its
# exact original PNG was extracted from the original submission, recorded in the
# audit, and independently hash-checked here; native checks preserve CLEAN text.
original=(ROOT/audit['pancake_original']['file']).read_bytes()
assert hashlib.sha256(original).hexdigest()==audit['pancake_original']['sha256']
runtime=json.loads((OUT/'RUNTIME.json').read_text('utf-8'))
assert len(runtime)==6 and all(r['status']=='PASS' and not r['overset'] for r in runtime)
assert all(not r['focus']['active_page_is_parent'] for r in runtime)
info=json.loads((ROOT/'content/FICTION_WORK_INFO.json').read_text('utf-8'))
compact=lambda text:''.join(text.split()) # PDF-only positional whitespace; not used on source/native stories.
for ident,text in info.items():
    with pdfplumber.open(OUT/(ident+'_NATIVE.pdf')) as pdf:
        page=pdf.pages[0]
        assert compact(text) in compact(page.extract_text() or '')
        report=next(r for r in runtime if r['id']==ident)
        assert report['metadata']==text and report['metadata_size_pt']<report['title_size_pt']
        page.to_image(resolution=100).original.save(OUT/(ident+'_OPENER.png'))
with pdfplumber.open(OUT/'memoir_pancake_NATIVE.pdf') as pdf:
    images=[image for page in pdf.pages for image in page.images]
    assert len(images)==1 and images[0]['width']*25.4/72<=73.1
    assert abs(images[0]['width']/images[0]['height']-257/350)<.001
    text=''.join(p.extract_text() or '' for p in pdf.pages)
    assert '生物中心主义' in text
    before=len(PdfReader(OUT/'PANCAKE_BEFORE.pdf').pages)
    pancake={'before_pages':before,'after_pages':len(pdf.pages),'image_width_mm':images[0]['width']*25.4/72}
    # Detect a layout-only tiny trailing page; header/folio alone never counts.
    for page in pdf.pages:
        body=[c for c in page.chars if 80<c['top']<680]
        assert len(body)>100, 'Pancake tiny trailing page'
    for i,page in enumerate(pdf.pages):
        page.to_image(resolution=90).original.save(OUT/f'PANCAKE_AFTER_{i+1}.png')
with pdfplumber.open(OUT/'xingyue_NATIVE.pdf') as pdf:
    pictures=[image for page in pdf.pages for image in page.images]
    assert len(pictures)==3
    approved=json.loads((ROOT/'content/XINGYUE.json').read_text('utf-8'))
    # Partition every glyph once by its center. Cropping at the gutter can copy
    # hanging punctuation into both columns; whole-page extraction interleaves
    # the columns. Neither operation reflects the native story's reading order.
    chunks=[]
    for p in pdf.pages:
        for right in (False,True):
            column=p.filter(lambda obj: obj['object_type']!='char' or
                            (((obj['x0']+obj['x1'])/2>=p.width/2)==right))
            chunks.append(column.extract_text() or '')
    text=compact(''.join(chunks))
    for paragraph in approved['paragraphs']:
        if paragraph['text']:assert compact(paragraph['text']) in text, paragraph['text']
    sizes=sorted((i['srcsize'],round(i['width']*25.4/72,2),round(i['height']*25.4/72,2)) for i in pictures)
    # Standard PDF export downsamples high-resolution PNGs to 300ppi. Native
    # placement/source checks verify original bytes; PDF checks verify aspect,
    # visibility and useful output resolution rather than identical raster size.
    expected_ratios=sorted(i['width_px']/i['height_px'] for i in audit['images'])
    assert all(abs(a-b)<.001 for a,b in zip(sorted(i['width']/i['height'] for i in pictures),expected_ratios))
    for image in pictures:
        assert abs(image['width']/image['height']-image['srcsize'][0]/image['srcsize'][1])<.001
    for i,page in enumerate(pdf.pages):
        body=[c for c in page.chars if 80<c['top']<680]
        assert len(body)>100, 'XingYue nearly empty image-only tail'
        page.to_image(resolution=130).original.save(OUT/f'XINGYUE_REVIEW_{i+1}.png')
    xingyue={'pages':len(pdf.pages),'images':3,'pdf_image_dimensions':sizes,
             'original_image_dimensions':[(i['width_px'],i['height_px']) for i in audit['images']]}
proof=json.loads((ROOT/'exports/assembly_v0/SHAN_ASSEMBLY_V0_REPORT.json').read_text('utf-8'))
assert proof['status']=='PASS'
now=next(c for c in proof['components'] if c['id']=='chapter_now')
star=next(c for c in proof['components'] if c['id']=='xingyue')
pending=next(c for c in proof['components'] if c['id']=='now_pending')
assert now['start_page']<star['start_page']<pending['start_page']
assert star['status']=='COMPLETED' and pending['status']=='PENDING_PLACEHOLDER'
with pdfplumber.open(ROOT/'exports/assembly_v0/SHAN_REVIEW_V0.pdf') as pdf:
    for ident,text in info.items():
        c=next(c for c in proof['components'] if c['id']==ident)
        assert compact(text) in compact(pdf.pages[c['start_page']].extract_text() or '')
    assert sum(len(pdf.pages[star['start_page']+i].images) for i in range(star['page_count']))==3
result={'status':'PASS','pancake':pancake,'xingyue':xingyue,
        'xingyue_interior_pages':[star['start_page'],star['end_page']],
        'review_pages':proof['review_pages_including_front_cover'],'retained_now_pending':True}
(OUT/'PDF_VALIDATION.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
