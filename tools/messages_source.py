"""Read-only DOCX extraction and reversible message-header display mapping."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import hashlib,json,re,subprocess,shutil

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/messages_v2'
SOURCE=ROOT/'manuscripts/source/messages/寄语（24号修订版）.docx'
UPLOAD=Path(r'C:/Users/22974/Downloads/寄语（24号修订版）.docx')
EXPECTED='f495767b57568eb15db92774851a52b80a5c120ec7652a81e29fa59bdc8f39e1'
UPLOAD_EXPECTED='ceffc5f57816e36350853899cce25097b1d96f2924e0d5f47e2c7d460052c0fb'
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

def verify_source():
 assert digest(SOURCE)==EXPECTED and digest(UPLOAD)==UPLOAD_EXPECTED
 original=extract(UPLOAD);current=extract(SOURCE)
 assert sum(p.count('颜东') for p in original)==1
 assert current==[p.replace('颜东','颜冬') for p in original], 'Only the user-authorized name correction is allowed'
 return current

def prepare(update_mapping=False):
 OUT.mkdir(parents=True,exist_ok=True)
 rows=verify_source();assert len(rows)==148
 starts=[i for i,s in enumerate(rows) if re.fullmatch(r'\d{4}级\S+ +.+?',s)]
 assert len(starts)==31
 entries=[]
 for number,i in enumerate(starts):
  text=rows[i];split=text.index(' ');stop=starts[number+1] if number+1<len(starts) else len(rows)
  entries.append({'id':'message_%02d'%(number+1),'entry_index':number,'header_paragraph':i+1,'role_range':[0,split],'separator_range':[split,split+1],'name_range':[split+1,len(text)],'body_paragraphs':list(range(i+2,stop+1))})
 mapping={'source':SOURCE.relative_to(ROOT).as_posix(),'sha256':EXPECTED,'source_paragraphs':148,'people':31,'entries':entries,'display_transform':'Only each original role + ASCII space + name header displays as name + TAB + role in one paragraph. Header slices reconstruct the exact original string; body and empty source paragraphs are verbatim. Offset mineral-color name plates are non-text decoration.','styles':{'header': 'P_Message_Header', 'name_character': 'C_Message_Name', 'body': 'P_Message_Body', 'empty_source_paragraph': 'P_Message_Empty'}}
 # Source run/paragraph properties are mapped explicitly, without changing text.
 with ZipFile(SOURCE) as z:
  ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'};w='{'+ns['w']+'}'
  paragraphs=ET.fromstring(z.read('word/document.xml')).findall('w:body/w:p',ns)
  centered=[];underlines=[]
  for i,p in enumerate(paragraphs):
   jc=p.find('w:pPr/w:jc',ns)
   if jc is not None and jc.get(w+'val')=='center':centered.append({'source_paragraph':i+1,'style':'P_Message_InternalTitle'})
   offset=0
   for run in p.findall('w:r',ns):
    value=''.join(e.text or '' for e in run.findall('.//w:t',ns));u=run.find('w:rPr/w:u',ns)
    if u is not None and u.get(w+'val')=='double':underlines.append({'source_paragraph':i+1,'start':offset,'end':offset+len(value),'character_style':'C_Message_DoubleUnderline'})
    offset+=len(value)
  assert len(centered)==2 and len(underlines)==1,'Unexpected approved source formatting inventory'
 mapping['source_corrections']=[{'source_paragraph':129,'original':'颜东','replacement':'颜冬','authorization':'Explicit user name correction'}]
 mapping['centered_titles']=centered;mapping['double_underlines']=underlines
 mapping['styles']['internal_title']='P_Message_InternalTitle'
 mapping['header_typography']='Names Source Han Serif SemiBold 13.25–15pt measured; roles Source Han Sans Medium 10.5pt; name/role glyph centers aligned; no text edits'
 map_path=ROOT/'content/MESSAGES_IMPORT_MAP.json'
 if map_path.exists() and not update_mapping:assert read(map_path)==mapping,'Do not silently overwrite a mapping'
 else:write(map_path,mapping)
 write('exports/messages_v2/SOURCE_IMPORT.json',{'source_sha256':EXPECTED,'paragraphs':rows,'authority':'Runtime extraction cache only; recreate from the immutable DOCX, never edit this cache.'})
 print(json.dumps({'status':'PASS','people':len(starts),'paragraphs':len(rows),'empty_paragraphs':rows.count(''),'characters':sum(map(len,rows)),'names':[rows[e['header_paragraph']-1][e['name_range'][0]:e['name_range'][1]] for e in entries],'sha256':EXPECTED},ensure_ascii=False))

if __name__=='__main__':prepare()
