"""Test-only extraction of the authorized Word sample; not a production parser."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as E
import json
root=Path(__file__).resolve().parent.parent
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
w='{'+ns['w']+'}'
with ZipFile(root/'manuscripts/04_fiction_四叠半_笠原JunE.docx') as z:
 doc=E.fromstring(z.read('word/document.xml'))
 styles=E.fromstring(z.read('word/styles.xml'))
 names={s.get(w+'styleId'):s.find('w:name',ns).get(w+'val') for s in styles.findall('w:style',ns)}
 roles,texts=[],[]
 for p in doc.findall('w:body/w:p',ns):
  style=p.find('w:pPr/w:pStyle',ns)
  roles.append(names.get(style.get(w+'val')) if style is not None else 'DEFAULT')
  texts.append(''.join((n.text or '') if n.tag==w+'t' else '\t' if n.tag==w+'tab' else '\n' for n in p.iter() if n.tag in [w+'t',w+'tab',w+'br']))
 assert not doc.findall('.//w:drawing',ns)
 assert not doc.findall('.//w:footnoteReference',ns)
 assert not doc.findall('.//w:endnoteReference',ns)
print(json.dumps({'roles':roles,'texts':texts},ensure_ascii=True))
