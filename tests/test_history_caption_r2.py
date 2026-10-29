"""Native regression: caption replacement must not restyle the next body paragraph."""
from pathlib import Path
import json,unittest
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text('utf-8'))
class CaptionRevision(unittest.TestCase):
 def setUp(self):
  self.before=read('exports/history_v2/CAPTION_BASELINE_RUNTIME.json');self.after=read('exports/history_v2/HISTORY_RUNTIME.json')
 def test_all_native_paragraph_styles_preserved(self):
  self.assertEqual([(p['id'],p['style']) for p in self.before['paragraphs']],[(p['id'],p['style']) for p in self.after['paragraphs']])
 def test_caption_gap_is_after_caption_and_no_internal_blank_line(self):
  mapping=read('content/HISTORY_V2_LAYOUT.json')['captions']
  for p in self.after['paragraphs']:
   if p['id'] in mapping:self.assertEqual(p['display_text'],mapping[p['id']]['display']);self.assertNotIn('\n\n',p['display_text'])
   if p['style'].startswith('P_History_Caption'):self.assertAlmostEqual(p['space_after_pt'],11)
 def test_native_image_dimensions_and_crops_preserved(self):
  before={r['id']:r for r in self.before['images']};self.assertEqual(len(before),105)
  for r in self.after['images']:
   a=before[r['id']]
   for key in ['frame_mm','graphic_mm']:
    for axis in ['width','height']:self.assertAlmostEqual(r[key][axis],a[key][axis],places=5)
   for axis in ['x','y']:self.assertAlmostEqual(r['graphic_mm'][axis]-r['frame_mm'][axis],a['graphic_mm'][axis]-a['frame_mm'][axis],places=5)
if __name__=='__main__':unittest.main()
