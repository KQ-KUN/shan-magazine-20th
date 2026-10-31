import json,hashlib,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text('utf-8-sig'))
class FullHistory(unittest.TestCase):
 def test_prefix_and_final_policy(self):
  data=read('content/HISTORY_FULL_IMPORT.json');old=read('content/HISTORY_V2_IMPORT.json')
  self.assertEqual([b for b in data['blocks'] if b['origin']=='early'],[b for b in old['blocks'] if b['origin']=='early'])
  blocks={b['id']:b for b in data['blocks']};self.assertIn('于笑涵',blocks['full_p891']['text']);self.assertIn('黄可其',blocks['full_p891']['text'])
  audit=read('exports/history_full/WORD_AUDIT.json')
  for row in audit['tail_map']:
   if row['original_all_paragraph'] in (906,909):self.assertEqual(blocks['full_p'+str(row['original_all_paragraph'])]['text'],row['text'])
 def test_native_current_source(self):
  d=read('content/HISTORY_FULL_IMPORT.json');r=read('exports/history_full/HISTORY_RUNTIME.json')
  self.assertEqual(hashlib.sha256((ROOT/d['source']).read_bytes()).hexdigest(),r['source_sha256']);self.assertFalse(r['overset']);self.assertEqual(len(r['images']),170);self.assertEqual(len(r['footnotes']),5)
 def test_build_encoding_and_frozen_scope(self):
  for name in ['54_history_full_standalone.jsx','55_history_full_assembly.jsx','56_history_full_folios.jsx']:self.assertTrue((ROOT/'build'/name).read_bytes().startswith(b'\xef\xbb\xbf'))
  for p,s in read('workflow/HISTORY_PROFILE_FACT_CORRECTION.json')['frozen_scope_hashes'].items():self.assertEqual(hashlib.sha256((ROOT/p).read_bytes()).hexdigest(),s,p)
if __name__=='__main__':unittest.main()
