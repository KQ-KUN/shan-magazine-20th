from pathlib import Path
import json,sys,unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from history_v2_layout import display_blocks
def read(p):return json.loads((ROOT/p).read_text('utf-8'))
class DensityRevision(unittest.TestCase):
 def test_gallery_move_keeps_all_sources_and_main_prose_order(self):
  data=read('content/HISTORY_V2_IMPORT.json');layout=read('content/HISTORY_V2_LAYOUT.json');view=display_blocks(data,layout)
  self.assertEqual(len(view),427);self.assertEqual({b['id'] for b in view},{b['id'] for b in data['blocks']})
  prose=lambda blocks:[b['id'] for b in blocks if b['type']=='text' and not b.get('style','').startswith('P_History_Caption')]
  images=lambda blocks:[a['id'] for b in blocks for a in b.get('items',[])]
  self.assertEqual(prose(view),prose(data['blocks']));self.assertEqual(images(view),images(data['blocks']))
  ids=[b['id'] for b in view];self.assertEqual(ids[ids.index('early_p201')+1:ids.index('early_p201')+3],['early_g29','early_p191'])
  self.assertEqual(ids[ids.index('early_p188')+1:ids.index('early_p188')+3],['early_g28','early_p190'])
 def test_compact_eternity_poster_preserves_complete_source_proportions(self):
  group=read('content/HISTORY_V2_LAYOUT.json')['groups']['early_g23'];f=group['frames'][0]
  self.assertAlmostEqual(f['width'],58);self.assertAlmostEqual(f['height'],46.4);self.assertAlmostEqual(f['crop_or_stretch_policy']['crop_fraction'],0)
 def test_compact_tail_and_emblem_keep_complete_source(self):
  groups=read('content/HISTORY_V2_LAYOUT.json')['groups']
  for key,width in [('early_g18',44),('early_g28',58),('approved_tail_g59',40),('approved_tail_g62',40)]:
   f=groups[key]['frames'][0];self.assertAlmostEqual(f['width'],width);self.assertAlmostEqual(f['crop_or_stretch_policy']['crop_fraction'],0)
  self.assertTrue(all(g['inline_clearance_mm']==0 for g in groups.values()))
if __name__=='__main__':unittest.main()
