"""Task-scoped preservation checks; independent of native text extraction."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
import copy,hashlib,json,sys,unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import history_v2_source as source
import messages_source

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path):return json.loads((ROOT/path).read_text('utf-8-sig'))

class Preservation(unittest.TestCase):
 def compare_docx(self,before,after,expected):
  with ZipFile(before) as a,ZipFile(after) as b:
   self.assertEqual(a.namelist(),b.namelist())
   self.assertEqual([n for n in a.namelist() if a.read(n)!=b.read(n)],['word/document.xml'])
   aa=E.fromstring(a.read('word/document.xml'));bb=E.fromstring(b.read('word/document.xml'))
   ap=aa.findall('w:body/w:p',source.N);bp=bb.findall('w:body/w:p',source.N)
   self.assertEqual(len(ap),len(bp))
   changes=[]
   for i,(x,y) in enumerate(zip(ap,bp)):
    if E.tostring(x,method='c14n')!=E.tostring(y,method='c14n'):changes.append((i,source.text(x),source.text(y)))
   self.assertEqual(changes,expected)
   for i,_,_ in changes:aa.find('w:body',source.N).replace(ap[i],copy.deepcopy(bp[i]))
   self.assertEqual(E.tostring(aa,method='c14n'),E.tostring(bb,method='c14n'))

 def test_history_only_final_name_and_role_edits(self):
  r=read('exports/history_v2/FINAL_NAME_CORRECTIONS.json')
  self.compare_docx(source.PREVIOUS,source.FULL,[(x['paragraph'],x['before'],x['after']) for x in r['history_changes']])

 def test_messages_single_final_name_edit(self):
  self.compare_docx(ROOT/'exports/history_v2/MESSAGES_BEFORE_FINAL_NAMES.docx',messages_source.SOURCE,[(49,'2015级幻协重要成员、赞助人 楚修红','2015级幻协重要成员、赞助人 楚休红')])
  self.assertEqual(messages_source.verify_source()[63],'2017级会长 余淼')

 def test_frozen_sources_unchanged(self):
  for p,sha in read('workflow/HISTORY_PROFILE_FACT_CORRECTION.json')['frozen_scope_hashes'].items():self.assertEqual(digest(ROOT/p),sha,p)

 def test_old_tail_is_exact(self):
  data=read('content/HISTORY_V2_IMPORT.json')
  with ZipFile(ROOT/data['old_tail_source']) as z:
   paragraphs=E.fromstring(z.read('word/document.xml')).findall('w:body/w:p',source.N)
   expected=[source.text(p) for p in paragraphs[138:] if source.text(p).strip()]
  actual=[b['text'] for b in data['blocks'] if b['origin']=='approved_tail' and b['type']=='text']
  self.assertEqual(actual,expected)

 def test_original_image_bytes_and_note_inventory(self):
  data=read('content/HISTORY_V2_IMPORT.json');early=[];tail=[];notes=[]
  for b in data['blocks']:
   for item in b.get('items',[]):
    self.assertEqual(digest(ROOT/item['file']),item['sha256'])
    (early if b['origin']=='early' else tail).append(item)
   notes.extend(b.get('footnotes',[]))
  self.assertEqual((len(early),len(tail)),(94,11));self.assertEqual([n['source_id'] for n in notes],['0','1','2'])

if __name__=='__main__':unittest.main()
