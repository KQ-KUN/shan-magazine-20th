"""Read-only DOCX extraction and reversible message-header display mapping."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import hashlib,json,re,subprocess,shutil

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/messages_v2'
SOURCE=ROOT/'manuscripts/source/messages/寄语整理_已补充.docx'
UPLOAD=Path(r'D:/HuaweiMoveData/Users/22974/Desktop/社刊资料/寄语整理_已补充.docx')
EXPECTED='40f7ca5a8294afa858e605c59496cca735d96fe52f378f72a019c7ab1aaaa467'
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git','-c',f'safe.directory={ROOT.as_posix()}','-c','core.quotePath=false',*args],cwd=ROOT)
def read(p):return json.loads((ROOT/p).read_text('utf-8-sig'))
def write(p,obj):
 p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def extract(path):
 with ZipFile(path) as z:
  ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'};w='{'+ns['w']+'}';root=ET.fromstring(z.read('word/document.xml'))
  assert not root.findall('.//w:tbl',ns) and not root.findall('.//w:ins',ns) and not root.findall('.//w:del',ns)
  assert not [n for n in z.namelist() if n.startswith('word/media/')]
  rows=[]
  for p in root.findall('w:body/w:p',ns):
   assert not p.findall('.//w:numPr',ns),'Unexpected numbering must be mapped explicitly'
   rows.append(''.join(e.text or '' if e.tag==w+'t' else '\t' if e.tag==w+'tab' else '\u2028' for e in p.iter() if e.tag in (w+'t',w+'tab',w+'br')))
  assert len(rows)==len(root.findall('.//w:p',ns))
  return rows

def prepare():
 OUT.mkdir(parents=True,exist_ok=True)
 if not SOURCE.exists():SOURCE.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(UPLOAD,SOURCE)
 assert digest(SOURCE)==EXPECTED and digest(UPLOAD)==EXPECTED
 rows=extract(SOURCE);assert len(rows)==130
 starts=[i for i,s in enumerate(rows) if re.fullmatch(r'\d{4}[级年].+? +\S+',s)]
 assert len(starts)==28
 entries=[]
 for number,i in enumerate(starts):
  text=rows[i];split=text.rindex(' ');stop=starts[number+1] if number+1<len(starts) else len(rows)
  entries.append({'id':'message_%02d'%(number+1),'entry_index':number,'header_paragraph':i+1,'role_range':[0,split],'separator_range':[split,split+1],'name_range':[split+1,len(text)],'body_paragraphs':list(range(i+2,stop+1))})
 mapping={'source':SOURCE.relative_to(ROOT).as_posix(),'sha256':EXPECTED,'source_paragraphs':130,'people':28,'entries':entries,'display_transform':'Only each original role + ASCII space + name header displays as name + TAB + role in one paragraph. Header slices reconstruct the exact original string; body and empty source paragraphs are verbatim. Offset mineral-color name plates are non-text decoration.','styles':{'header': 'P_Message_Header', 'name_character': 'C_Message_Name', 'body': 'P_Message_Body', 'empty_source_paragraph': 'P_Message_Empty'}}
 mapping['style_exceptions']=[{'source_heading_paragraph': 26, 'policy': 'Measure every original name and role together; fit only name size within 13.25–15pt Source Han Serif SemiBold; role stays 10.5pt Source Han Sans Medium; vertically center actual glyph metrics; no text changes'}]
 map_path=ROOT/'content/MESSAGES_IMPORT_MAP.json'
 if map_path.exists():assert read(map_path)==mapping,'Do not silently overwrite a mapping'
 else:write(map_path,mapping)
 write('exports/messages_v2/SOURCE_IMPORT.json',{'source_sha256':EXPECTED,'paragraphs':rows,'authority':'Runtime extraction cache only; recreate from the immutable DOCX, never edit this cache.'})
 print(json.dumps({'status':'PASS','people':len(starts),'paragraphs':len(rows),'empty_paragraphs':rows.count(''),'characters':sum(map(len,rows)),'names':[rows[e['header_paragraph']-1][e['name_range'][0]:e['name_range'][1]] for e in entries],'sha256':EXPECTED},ensure_ascii=False))

if __name__=='__main__':prepare()
