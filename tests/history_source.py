"""Locked DOCX audit. --prepare copies unchanged ZIP members; stdout is test-only."""
import argparse
import copy
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import zipfile
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
NAME = '山东大学学生科幻协会会史 (2.5）.docx'
SOURCE = ROOT / 'manuscripts/source' / NAME
LOCKED_HASH = '1beb214adf0372b61bb4ca312c20317f0c77b38812f1b17131e37e6bb5b9756f'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'
NS = {'w': W, 'a': A, 'r': R, 'mc': MC}
NS['wp'] = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
YEARS = [5, 7, 17, 40, 51, 54, 57, 63, 71, 77, 96, 107, 117, 123, 131, 139, 155, 172, 174, 179, 194]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def text(node):
    if node.tag in {f'{{{MC}}}Fallback', f'{{{W}}}drawing', f'{{{W}}}pict', f'{{{W}}}pPr', f'{{{W}}}rPr'}:
        return ''
    if node.tag == f'{{{W}}}t':
        return node.text or ''
    if node.tag == f'{{{W}}}tab':
        return '\t'
    if node.tag == f'{{{W}}}br':
        return '\n'
    return ''.join(text(c) for c in node)


def tree(node):
    # E4X test adapter: preserve text nodes including whitespace verbatim.
    return {'tag': node.tag, 'text': node.text, 'children': [tree(c) for c in node]}


def put(relative, data):
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        assert path.read_bytes() == data, f'Refusing to overwrite differing input: {relative}'
    else:
        path.write_bytes(data)


def inspect(prepare=False):
    raw = SOURCE.read_bytes()
    assert sha(raw) == LOCKED_HASH, 'Locked source hash changed'
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        xml = z.read('word/document.xml')
        original = ET.fromstring(xml)
        root = copy.deepcopy(original)
        for parent in root.iter():
            for c in list(parent):
                if c.tag == f'{{{MC}}}Fallback':
                    parent.remove(c)
        assert not root.findall('.//w:tbl', NS)
        assert not root.findall('.//w:ins', NS) and not root.findall('.//w:del', NS)
        assert not root.findall('.//w:instrText', NS)
        rel = {x.get('Id'): x.get('Target') for x in ET.fromstring(z.read('word/_rels/document.xml.rels'))}
        ps = root.find('w:body', NS).findall('w:p', NS)
        assert len(ps) == 216
        paragraphs = [text(p) for p in ps]
        assert '\ufffc' not in ''.join(paragraphs)
        detected = [i + 1 for i, t in enumerate(paragraphs) if re.fullmatch(r'\d{4}(?:年)?[—]+\d{4}年|2006年前', t)]
        assert detected == YEARS
        assert '兴隆山负责人：吴昊坤' not in paragraphs[63:70]  # Already removed in supplied source.
        assert paragraphs[147].startswith('2021年4月') and paragraphs[148].startswith('2021年1月')
        order = [i for i in range(1, 217) if i != 148]
        order.insert(order.index(150) + 1, 148)
        images, assets, captions = [], [], []
        if prepare:
            put('assets/history/source-document.xml', xml)
        for index, p in enumerate(ps, 1):
            for box in p.findall('.//w:txbxContent', NS):
                captions.append({'source_paragraph': index, 'textbox_index': 1, 'image_indices': [1]})
            for blip in p.findall('.//a:blip', NS):
                rid = blip.get(f'{{{R}}}embed')
                member = 'word/' + rel[rid]
                data = z.read(member)
                width, height = Image.open(io.BytesIO(data)).size
                crop_node = p.find('.//a:srcRect', NS)
                crop = {k: int(crop_node.get(k, '0')) / 100000 for k in ['t', 'b', 'l', 'r']} if crop_node is not None else dict.fromkeys(['t', 'b', 'l', 'r'], 0)
                number = len(images) + 1
                images.append({'image_index': number, 'source_paragraph': index, 'relationship_id': rid,
                               'anchor': 'after_text' if index == 6 else 'paragraph_start'})
                file = 'assets/history/' + Path(member).name
                drawing = next(d for d in p.findall('.//w:drawing', NS) if any(b.get(f'{{{R}}}embed') == rid for b in d.findall('.//a:blip', NS)))
                extent = drawing.find('.//wp:extent', NS)
                assets.append({'file': file, 'zip_member': member, 'sha256': sha(data),
                               'pixel_width': width, 'pixel_height': height, 'crop': crop,
                               'original_width_mm': int(extent.get('cx')) / 36000,
                               'modules': 6 if number == 3 else 2 if width / (73 / 25.4) < 200 else 3})
                if prepare:
                    put(file, data)
        captions += [
            {'source_paragraph': 29, 'image_indices': [2]},
            {'source_paragraph': 39, 'image_indices': [3]},
            {'source_paragraph': 190, 'image_indices': [17, 18]},
            {'source_paragraph': 193, 'image_indices': [19]},
        ]
        image_ps = {i['source_paragraph'] for i in images}
        caption_ps = {c['source_paragraph'] for c in captions if 'textbox_index' not in c}
        mappings = []
        for i, t in enumerate(paragraphs, 1):
            style = ('P_History_Year' if i in YEARS else 'P_Article_Title' if i == 1 else
                     'P_Metadata' if i in [2, 3] else 'P_History_Caption_Wide' if i == 39 else 'P_History_Caption' if i in caption_ps else
                     'P_History_Media_Wide' if i == 38 else 'P_History_Event_Image' if i == 6 else
                     'P_History_Media_Caption' if i in [28, 189, 192] else
                     'P_History_Media' if i in image_ps else 'P_History_Empty' if not t else 'P_History_Event')
            mappings.append({'source_paragraph': i, 'style': style})
        mapping = {'version': 1, 'paragraphs': mappings, 'paragraph_order': order, 'years': YEARS,
                   'images': images, 'captions': captions,
                   'approved_exceptions': {'omit_paragraphs': [], 'move_paragraphs': [{'source_paragraph': 148, 'after_source_paragraph': 150}]}}
        audit = {'source_file': 'manuscripts/source/' + NAME, 'source_sha256': LOCKED_HASH,
                 'xml_file': 'assets/history/source-document.xml', 'xml_sha256': sha(xml), 'assets': assets,
                 'source_paragraph_count': 216, 'output_paragraph_count': 216,
                 'source_paragraph_sha256': [sha(t.encode('utf-8')) for t in paragraphs]}
        if prepare:
            put('content/HISTORY_IMPORT_MAP.json', (json.dumps(mapping, ensure_ascii=False, indent=2) + '\n').encode())
            put('spec/HISTORY_SOURCE_AUDIT.json', (json.dumps(audit, ensure_ascii=False, indent=2) + '\n').encode())
        else:
            assert json.loads((ROOT / 'content/HISTORY_IMPORT_MAP.json').read_text('utf-8')) == mapping
            assert json.loads((ROOT / 'spec/HISTORY_SOURCE_AUDIT.json').read_text('utf-8')) == audit
            assert (ROOT / audit['xml_file']).read_bytes() == xml
            for asset in assets:
                assert (ROOT / asset['file']).read_bytes() == z.read(asset['zip_member'])
        assert len(images) == 24 and len(captions) == 5
        textbox = root.find('.//w:txbxContent', NS)
        return {'paragraphs': paragraphs, 'textbox': text(textbox), 'tree': tree(original), 'map': mapping, 'audit': audit}


def frozen_check():
    status = json.loads((ROOT / 'workflow/MODULE_STATUS.json').read_text('utf-8'))
    head_status = json.loads(subprocess.check_output(['git', 'show', 'HEAD:workflow/MODULE_STATUS.json'], cwd=ROOT))
    frozen_files = []
    for key, value in head_status.items():
        assert status[key] == value, f'Existing module status changed: {key}'
        if value.get('frozen'):
            frozen_files.extend(value['scope'])
    # Honor existing Git checkout EOL filters for code only. Never normalize manuscript/XML/image bytes.
    subprocess.run(['git', 'diff', '--exit-code', 'HEAD', '--', *frozen_files], cwd=ROOT, check=True, stdout=subprocess.PIPE)
    # TASK18 explicitly authorizes chapter intro copy only; History's numbering
    # and all other manifest fields remain protected. Its dedicated delta test
    # verifies the three new strings exactly, including the six-chapter context.
    manifest = json.loads((ROOT / 'spec/CONTENT_MANIFEST.json').read_text('utf-8'))
    previous = json.loads(subprocess.check_output(['git', 'show', 'HEAD:spec/CONTENT_MANIFEST.json'], cwd=ROOT))
    for current, old in zip(manifest['sections'], previous['sections']):
        if current['id'] in ['origin', 'ridge', 'beyond']:
            old['intro'] = current['intro']
    assert manifest == previous, 'Unexpected non-intro content-manifest change'
    subprocess.run(['node', 'tests/task18.test.cjs'], cwd=ROOT, check=True, stdout=subprocess.PIPE)
    for file in ['assets/cover/SHAN_FRONT_COVER_FINAL.pdf']:
        assert (ROOT / file).read_bytes() == subprocess.check_output(['git', 'show', 'HEAD:' + file], cwd=ROOT), file


def staged_input_check(audit):
    for file in [audit['source_file'], audit['xml_file'], *[a['file'] for a in audit['assets']]]:
        present = subprocess.run(['git', 'cat-file', '-e', ':' + file], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if present.returncode == 0:
            blob = subprocess.check_output(['git', 'cat-file', 'blob', ':' + file], cwd=ROOT)
            assert blob == (ROOT / file).read_bytes(), f'Git input bytes changed by checkout filters: {file}'


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    if args.prepare:
        put('manuscripts/source/' + NAME, (Path(r'D:\HuaweiMoveData\Users\22974\Desktop') / NAME).read_bytes())
    fixture = inspect(args.prepare)
    if not args.prepare:
        frozen_check()
        staged_input_check(fixture['audit'])
        print(json.dumps(fixture, ensure_ascii=False))
    else:
        print('Prepared unchanged source, XML, 24 images; 21 entries, 5 captions; deletion already in source, 1 import move.')
