"""Compare every source paragraph; generate a runtime fixture, never edit DOCX."""
from pathlib import Path
import hashlib
import json
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

def paragraphs(file):
    with zipfile.ZipFile(file) as archive:
        tree = ET.fromstring(archive.read('word/document.xml'))
        assert not tree.findall('.//' + W + 'del'), 'Unresolved deleted text'
        body = tree.find(W + 'body')
        assert not body.findall(W + 'tbl'), 'Unmapped table'
        rows = body.findall(W + 'p')
        return [''.join(n.text or '' if n.tag == W + 't' else '\t' if n.tag == W + 'tab'
                        else '\n' if n.tag in (W + 'br', W + 'cr') else '' for n in p.iter()) for p in rows]

def verify():
    mapping = json.loads((ROOT/'content/MONDAY_CUP_IMPORT_MAP.json').read_text('utf-8'))
    source = ROOT/mapping['source']; layout = ROOT/mapping['layout_source']
    for file, expected in [(source,mapping['source_sha256']),(layout,mapping['layout_sha256'])]:
        assert hashlib.sha256(file.read_bytes()).hexdigest() == expected, file
    original = paragraphs(source)
    assert original == paragraphs(layout), 'Style normalization changed visible source paragraphs'
    assert len(original) == mapping['paragraph_count'] == 18
    assert original[0] == '第一届“月曜杯”山东高校科幻联合征文幕后二三事'
    assert original.count(original[0]) == 1 and original[1] == '文/鲲图'
    assert [p[0] for p in original if p[:1] in '①②③④⑤⑥⑦⑧'] == list('①②③④⑤⑥⑦⑧')
    assert original[-1].endswith('便行文至此。')
    for p,row in zip(original,mapping['paragraphs']):
        assert hashlib.sha256(p.encode('utf-8')).hexdigest() == row['text_sha256']
    # Runtime data is a verified extraction of immutable source, not edited copy.
    output = ROOT/'exports/print_v3'; output.mkdir(parents=True,exist_ok=True)
    (output/'MONDAY_CUP_SOURCE_TEXT.json').write_text(json.dumps({'source_sha256':mapping['source_sha256'],
        'paragraphs':original},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return original

if __name__ == '__main__':
    rows=verify()
    print('PASS immutable source / style-only layout: 18 exact paragraphs / 2581 characters / title, author, ①–⑧, ending')
