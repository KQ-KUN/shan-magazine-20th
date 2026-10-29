from pathlib import Path
import json,hashlib
import pypdfium2 as pdfium
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
out=root/'exports/profile_fact_correction'
pdf=out/'ASSOCIATION_PROFILE_CORRECTED.pdf'
reader=PdfReader(pdf)
assert len(reader.pages)==1
page=reader.pages[0]
text=page.extract_text()
compact=''.join(text.split())
assert '2006年5月' in compact and '2006年10月14日' not in compact
assert '2006—2026' in compact
visible=(out/'PROFILE_VISIBLE_TEXT.txt').read_text(encoding='utf-8-sig')
assert '2006年5月' in visible and '2006年10月14日' not in visible
report=(out/'PROFILE_NATIVE_REPORT.txt').read_text(encoding='utf-8-sig')
data=root/'content/ASSOCIATION_PROFILE.json'
assert hashlib.sha256(data.read_bytes()).hexdigest() in report
assert 'overset=false' in report and 'pages=1' in report
assert abs(float(page.mediabox.width)*25.4/72-185)<.1
assert abs(float(page.mediabox.height)*25.4/72-260)<.1
doc=pdfium.PdfDocument(str(pdf));doc[0].render(scale=2).to_pil().save(out/'ASSOCIATION_PROFILE_CORRECTED.png')
print('PASS actual native PDF: one 185x260mm page, corrected date, no old date, unchanged anniversary, source hash and overset check.')
