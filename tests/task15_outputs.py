"""TASK 15 source binding and rendered-ink checks; reports stay in exports.

Native paragraph equality preserves every character, including whitespace.
PDF extraction is only a secondary visibility check, never a source rewrite.
CJK PDF character boxes do not reliably describe glyph ink, so separator
clearance is measured on the rasterized glyphs rather than those boxes.
"""
from pathlib import Path
import hashlib
import json
import sys
import zipfile
import xml.etree.ElementTree as ET

import pdfplumber
from PIL import ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'exports/task15'
sha = lambda data: hashlib.sha256(data).hexdigest()
audit = json.loads((ROOT / 'spec/EDITORIAL_INFO_SOURCE_AUDIT.json').read_text('utf-8'))
source = ROOT / audit['source_file']
assert sha(source.read_bytes()) == audit['source_sha256']
with zipfile.ZipFile(source) as package:
    xml = package.read('word/document.xml')
assert xml == (ROOT / audit['xml_file']).read_bytes()
assert sha(xml) == audit['xml_sha256']
w = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
body = ET.fromstring(xml).find(w + 'body')
paragraphs = []
for p in body.findall(w + 'p'):
    text = ''.join((n.text or '') if n.tag == w+'t' else '\t' if n.tag == w+'tab' else '\n'
                   for n in p.iter() if n.tag in (w+'t', w+'tab', w+'br'))
    paragraphs.append(text)
assert len(paragraphs) == audit['source_paragraph_count'] == 33
assert [sha(p.encode('utf-8')) for p in paragraphs] == audit['source_paragraph_sha256']
assert not body.findall('.//' + w+'tbl') and not body.findall('.//' + w+'drawing')
assert [paragraphs[i-1] for i in (3,13,20,31)] == ['编辑委员会','特别鸣谢','刊物信息','版权与使用说明']
assert 'SFA10422' in ''.join(paragraphs) and 'SFW10422' not in ''.join(paragraphs)
if '--source-only' in sys.argv:
    print('PASS editorial source: byte-identical XML / SHA-256 / all 33 paragraph hashes')
    sys.exit(0)

native = json.loads((OUT / 'INTERVIEW_RUNTIME.json').read_text('utf-8'))
assert len(native) == 2
results = []
for report in native:
    assert report['status'] == 'PASS' and not report['overset'] and report['source_preserved']
    assert len(report['questions']) == 13
    gaps = []
    with pdfplumber.open(OUT / (report['id'] + '_NATIVE.pdf')) as pdf:
        assert len(pdf.pages) == report['pages']
        for number, page in enumerate(pdf.pages, 1):
            rules = [r for r in page.lines + page.curves
                     if isinstance(r.get('stroking_color'), (list,tuple))
                     and r['stroking_color'][0] > .3 and r['stroking_color'][1] < .2
                     and abs(r['linewidth'] - .65) < .01]
            image = page.to_image(resolution=220).original.convert('RGB')
            sx, sy = image.width/page.width, image.height/page.height
            for rule in rules:
                x0, x1 = int((rule['x0']+1)*sx), int((rule['x1']-1)*sx)
                cy = round(rule['top']*sy)
                def black(y):
                    return any(max(image.getpixel((x,y))) < 110 for x in range(x0,x1))
                def red(y):
                    return any(c[0]>70 and c[0]-c[1]>35 and c[0]-c[2]>20
                               for c in (image.getpixel((x,y)) for x in range(x0,x1)))
                assert not any(black(y) for y in range(cy-2,cy+3)), (report['id'],number,'rule intersects glyph ink')
                redrows = [y for y in range(cy-3,cy+4) if red(y)]
                assert redrows
                ink = next(y for y in range(max(redrows)+1, min(image.height,cy+87)) if black(y))
                gap = (ink-max(redrows)-1)*25.4/220
                assert gap >= 1.5, (report['id'],number,gap)
                gaps.append(gap)
    assert len(gaps) == 13
    results.append({'id':report['id'],'questions':13,'minimum_ink_gap_mm':min(gaps),
                    'cross_column_questions':sum(q['crosses_frame_or_column'] for q in report['questions'])})

assert 'paragraphs=33' in (OUT / 'EDITORIAL_INFO_RUNTIME.txt').read_text('utf-8')
with pdfplumber.open(OUT / 'EDITORIAL_INFO_NATIVE.pdf') as pdf:
    text = ''.join(page.extract_text() or '' for page in pdf.pages)
    # Whitespace in PDF positioning is synthetic; exact whitespace is separately
    # verified in the actual InDesign story by the native module.
    compact = lambda value: ''.join(value.split())
    assert compact(''.join(paragraphs)) in compact(text)
    assert 'CONTENT PENDING' not in text
    pdf.pages[0].to_image(resolution=100).original.save(OUT / 'EDITORIAL_INFO_REVIEW.png')

assembly = ROOT / 'exports/assembly_v0'
proof = json.loads((assembly / 'SHAN_ASSEMBLY_V0_REPORT.json').read_text('utf-8'))
with pdfplumber.open(assembly / 'SHAN_REVIEW_V0.pdf') as pdf:
    for component in proof['components']:
        if component['id'] not in ('interview_shao','interview_xiao','editorial_info'):
            continue
        # Compare each assembled page with its fresh exported component PDF.
        # A second PDF export rounds text matrices and resubsets fonts. Check
        # glyph sequences/positions as well as bidirectional raster ink coverage.
        with pdfplumber.open(component['source_pdf']) as original:
            for i, page in enumerate(original.pages):
                placed = pdf.pages[component['start_page']+i]
                images = []
                for current in (page,placed):
                    box = current.trimbox
                    bbox = (box[0], current.height-box[3], box[2], current.height-box[1])
                    images.append(current.crop(bbox).to_image(resolution=100).original.convert('RGB'))
                assert images[0].size == images[1].size
                def visible_chars(current):
                    box = current.trimbox
                    top, bottom = current.height-box[3], current.height-box[1]
                    return [ch for ch in current.chars
                            if box[0] <= (ch['x0']+ch['x1'])/2 <= box[2]
                            and top <= (ch['top']+ch['bottom'])/2 <= bottom]
                src_chars, dst_chars = visible_chars(page), visible_chars(placed)
                assert len(src_chars) == len(dst_chars)
                for src_ch, dst_ch in zip(src_chars,dst_chars):
                    # InDesign's placed-PDF re-subsetting maps NBSP to SPACE in
                    # ToUnicode. This PDF-only rule never changes native text.
                    assert src_ch['text'].replace('\u00a0',' ') == dst_ch['text'].replace('\u00a0',' ')
                    # Re-subset NBSP advances also shift following metadata
                    # glyphs by <=.3132pt. The .4pt bound is below one raster
                    # pixel and is paired with exact glyph-sequence comparison.
                    assert abs(src_ch['x0']-dst_ch['x0']) <= .4
                    assert abs(src_ch['top']-dst_ch['top']) <= .12
                # One clip-edge pixel and one pixel of raster phase difference
                # are permitted. No missing ink is permitted in either direction.
                wpx, hpx = images[0].size
                inner = [image.crop((1,1,wpx-1,hpx-1)) for image in images]
                masks = [image.convert('L').point(lambda v:255 if v<120 else 0) for image in inner]
                for a,b in (masks,masks[::-1]):
                    assert ImageChops.subtract(a,b.filter(ImageFilter.MaxFilter(3))).getbbox() is None, (component['id'],i,'assembled glyph ink lost')
result = {'status':'PASS','source_paragraphs':33,'paragraph_hashes':'PASS',
          'interviews':results,'assembly_glyph_geometry_and_raster_coverage':'PASS',
          'pdf_only_comparison_rules':'NBSP ToUnicode space; <=.4pt x / .12pt y export rounding; one raster phase pixel'}
(OUT / 'TASK15_VALIDATION.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
