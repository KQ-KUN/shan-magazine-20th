from pathlib import Path
import sys,unittest,tempfile,copy
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'));import messages_fast as m
class RoutingTests(unittest.TestCase):
 def setUp(self):
  self.rows=['2017级会长 于淼','正文'];self.mapping={'sha256':'new','entries':[{'header_paragraph':1,'name_range':[8,10],'role_range':[0,7]}],'centered_titles':[],'double_underlines':[]}
  self.base={'status':'PASS','layout_fingerprint':'layout','people':1,'pages':1,'source_sha256':'new','entries':[{'header_paragraph':1}],'source_formatting':[], 'paragraphs':[{'text':'于淼\t2017级会长'},{'text':'正文'}]}
 def mode(self):return m.select_mode(self.base,self.rows,self.mapping,'layout')['mode']
 def test_no_change_reuses_without_host(self):self.assertEqual(self.mode(),'reuse')
 def test_local_role_change_uses_fast(self):self.base['paragraphs'][0]['text']='于淼\t2017级中心校区会长';self.assertEqual(self.mode(),'fast')
 def test_structure_change_requires_full(self):self.rows.append('new');self.assertEqual(self.mode(),'full')
 def test_layout_change_requires_full(self):self.base['layout_fingerprint']='old';self.assertEqual(self.mode(),'full')
 def test_external_artifact_change_blocks_overwrite(self):self.assertEqual(m.select_mode(self.base,self.rows,self.mapping,'layout',False)['mode'],'blocked')
 def test_formatted_paragraph_change_requires_full(self):self.base['source_formatting']=[{'kind':'centered-title','source_paragraph':2}];self.mapping['centered_titles']=[{'source_paragraph':2}];self.rows[1]='different';self.assertEqual(self.mode(),'full')
 def test_reflow_collects_downstream_pages(self):
  old={'pages':2,'paragraphs':[{'style':'Body','lines':[{'text':'a','page_index':1,'column':0,'baseline_pt':10}]}]};new=copy.deepcopy(old);new['paragraphs'][0]['lines'][0]['page_index']=2
  self.assertEqual(m.changed_pages(old,new),[1,2])
 def test_renderer_cache_separates_backends(self):
  import messages_overprint as renderer
  from pypdf import PdfWriter
  import shutil
  if not shutil.which('pdftoppm'):self.skipTest('Poppler unavailable; fixed PDFium fast renderer remains tested by runtime')
  with tempfile.TemporaryDirectory(dir=ROOT/'exports') as tmp:
   pdf=Path(tmp)/'blank.pdf';writer=PdfWriter();writer.add_blank_page(width=100,height=100);writer.write(pdf)
   with patch.object(renderer,'OUT',Path(tmp)):
    a=renderer.render(pdf,72)
    with patch.object(renderer.shutil,'which',return_value=None):b=renderer.render(pdf,72)
   self.assertNotEqual(a[0].parent,b[0].parent);self.assertTrue(a[0].exists() and b[0].exists())
if __name__=='__main__':unittest.main()
