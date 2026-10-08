from pathlib import Path
import json,hashlib,zipfile,subprocess,xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parents[1]; BASE='b7dc705cdf6c75add65fd7e82679d0dfb7269b80'
def old(p):return subprocess.check_output(['git','show',BASE+':'+p],cwd=ROOT)
def verify():
 m=json.loads((ROOT/'content/INTERVIEW_NAME_CORRECTION_MAP.json').read_text('utf-8'))
 assert (ROOT/m['source']).read_bytes()==old(m['source'])
 for key in ['source','layout_source']:assert hashlib.sha256((ROOT/m[key]).read_bytes()).hexdigest()==m['source_sha256' if key=='source' else 'layout_sha256']
 with zipfile.ZipFile(ROOT/m['source']) as a,zipfile.ZipFile(ROOT/m['layout_source']) as b:
  assert a.namelist()==b.namelist()
  for n in a.namelist():
   expected=a.read(n)
   if n=='word/document.xml':
    assert expected.count('邵珠渝'.encode())==1
    expected=expected.replace('邵珠渝'.encode(),'邵珠瑜'.encode())
   assert b.read(n)==expected,'Unauthorized Word edit '+n
  ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
  def paragraphs(z):return [''.join(t.text or '' for t in p.findall('.//w:t',ns)) for p in E.fromstring(z.read('word/document.xml')).findall('.//w:body/w:p',ns)]
  assert paragraphs(a)==m['source_paragraphs'] and paragraphs(b)==m['layout_paragraphs']
 assert len(m['source_paragraphs'])==len(m['layout_paragraphs'])==m['paragraph_count']==37
 assert [i+1 for i,(a,b) in enumerate(zip(m['source_paragraphs'],m['layout_paragraphs'])) if a!=b]==[30]
 assert m['layout_paragraphs']==[p.replace('邵珠渝','邵珠瑜') for p in m['source_paragraphs']]
 data=json.loads((ROOT/'content/XINGYUE.json').read_text('utf-8'));prior=json.loads(old('content/XINGYUE.json'))
 assert [{k:v for k,v in p.items() if k!='block'} for p in data['paragraphs']]==[{k:v for k,v in p.items() if k!='block'} for p in prior['paragraphs']]
 # Git checkout may use CRLF; compare the entire JSON value, including exact strings.
 assert json.loads((ROOT/'spec/CONTENT_MANIFEST.json').read_text('utf-8'))==json.loads(old('spec/CONTENT_MANIFEST.json'))
 print('PASS TASK22 source: exactly one authorized character; 37 interview paragraphs; all 28 XingYue paragraphs and chapter intros unchanged')
 return m
if __name__=='__main__':verify()
