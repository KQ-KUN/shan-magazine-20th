"""Read-only proof verification; thumbnails/reports go to ignored exports only."""
from pathlib import Path
import hashlib
import json
import math

import pdfplumber
from pypdf import PdfReader
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'exports/assembly_v0'
MM = 25.4 / 72
manifest = json.loads((ROOT / 'content/ASSEMBLY_V0_MANIFEST.json').read_text('utf-8'))
report = json.loads((OUT / 'SHAN_ASSEMBLY_V0_REPORT.json').read_text('utf-8'))
assert report['status'] == 'PASS'
assert report['mode'] == 'REVIEW_PROOF_PLACED_PDF'
assert not report['frozen_scope_changed']
assert not report['focus']['active_page_is_parent']
assert report['review_pages_including_front_cover'] == report['interior_pages'] + 1
assert [c['id'] for c in report['components']] == [c['id'] for c in manifest['interior']]
occupied = set()
for c, expected in zip(report['components'], manifest['interior']):
    assert c['status'] == ('PENDING_PLACEHOLDER' if expected['kind'] == 'placeholder' else 'COMPLETED')
    assert not c['overset'] and c['visible_characters'] > 0
    assert c['end_page'] - c['start_page'] + 1 == c['page_count']
    pages = set(range(c['start_page'], c['end_page'] + 1))
    assert not occupied & pages
    occupied |= pages
    if expected.get('start_on_recto'):
        assert c['start_page'] % 2 == 1 and c['start_side'] == 'RIGHT_HAND'
    component_pdf = PdfReader(c['source_pdf'])
    assert not component_pdf.is_encrypted and len(component_pdf.pages) == c['page_count']
blank = {b['page'] for b in report['intentional_blanks']}
assert not occupied & blank
assert occupied | blank == set(range(1, report['interior_pages'] + 1))
assert report['interior_pages'] not in blank
for name, count in [('SHAN_INTERIOR_ASSEMBLY_V0.pdf', report['interior_pages']), ('SHAN_REVIEW_V0.pdf', report['review_pages_including_front_cover'])]:
    reader = PdfReader(OUT / name)
    assert not reader.is_encrypted and len(reader.pages) == count
    for page in reader.pages:
        assert page.rotation == 0
        assert abs(float(page.trimbox.width) * MM - 185) < .2
        assert abs(float(page.trimbox.height) * MM - 260) < .2
for name in ['SHAN_INTERIOR_ASSEMBLY_V0.indd', 'SHAN_REVIEW_V0.indd', 'SHAN_ASSEMBLY_V0_REPORT.txt']:
    assert (OUT / name).stat().st_size > 0
cover = ROOT / manifest['cover']['front']['file']
cover_reader = PdfReader(cover)
assert len(cover_reader.pages) == 1
cover_page = cover_reader.pages[0]
assert cover_page.rotation == 0
assert abs(float(cover_page.trimbox.width) * MM - 185) < .2
assert abs(float(cover_page.trimbox.height) * MM - 260) < .2
assert abs(float(cover_page.bleedbox.width) * MM - 191) < .2
assert abs(float(cover_page.bleedbox.height) * MM - 266) < .2
thumbnails = OUT / 'thumbnails'
thumbnails.mkdir(exist_ok=True)
images = []
with pdfplumber.open(OUT / 'SHAN_REVIEW_V0.pdf') as pdf:
    for i, page in enumerate(pdf.pages):
        image = page.to_image(resolution=36).original.convert('RGB')
        bg = Image.new('RGB', image.size, image.getpixel((image.width // 2, 2)))
        nonuniform = ImageChops.difference(image, bg).convert('L').point(lambda v: 255 if v > 8 else 0)
        fraction = sum(nonuniform.histogram()[128:]) / (image.width * image.height)
        if i not in blank:  # review index i equals interior folio i; cover is index 0
            assert fraction > .001, f'Unexpected blank review page {i+1}'
        image.save(thumbnails / f'page-{i+1:03}.png')
        images.append(image)
    for c in report['components']:
        if c['kind'] == 'placeholder':
            text = pdf.pages[c['start_page']].extract_text() or ''
            assert 'CONTENT PENDING' in text and 'NOT FOR PRINT' in text
    profile = next(c for c in report['components'] if c['id'] == 'association_profile')
    profile_text = pdf.pages[profile['start_page']].extract_text() or ''
    assert 'SFA10422' in profile_text and 'SFW10422' not in profile_text
# Twelve pages per sheet keeps each page legible enough for a first visual review.
for start in range(0, len(images), 12):
    subset = images[start:start+12]
    w, h = images[0].size
    sheet = Image.new('RGB', (4*(w+12), math.ceil(len(subset)/4)*(h+28)), '#dadada')
    draw = ImageDraw.Draw(sheet)
    for j, image in enumerate(subset):
        x, y = (j%4)*(w+12), (j//4)*(h+28)
        sheet.paste(image, (x,y+20)); draw.text((x+4,y+3), f'Review {start+j+1}', fill='black')
    sheet.save(OUT / f'CONTACT_SHEET_{start//12+1:02}.png')
result = {'status': 'PASS', 'interior_pages': report['interior_pages'], 'review_pages': len(images),
          'rendered_pages': len(images), 'approved_cover_sha256': hashlib.sha256(cover.read_bytes()).hexdigest(),
          'intentional_blanks': sorted(blank), 'visual_agent_check': 'PENDING_CONTACT_SHEET_REVIEW'}
(OUT / 'ASSEMBLY_PDF_VALIDATION.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result))
