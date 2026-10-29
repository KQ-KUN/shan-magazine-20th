from pathlib import Path
from PIL import Image,ImageOps
import json,math,unittest
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text('utf-8'))
class ImageRevision(unittest.TestCase):
 def setUp(self):self.layout=read('content/HISTORY_V2_LAYOUT.json')
 def test_all_ordinary_pairs_follow_shared_geometry(self):
  modes=set()
  for group in self.layout['groups'].values():
   if group['kind']!='FIVE_MODE':continue
   modes.add(group['layout_mode']);frames=group['frames'];a=frames[0]
   if len(frames)==1:
    self.assertAlmostEqual(a['width'],73 if a['orientation']=='LANDSCAPE' else 73*0.6666667)
   else:
    b=frames[1];self.assertEqual(a['height'],b['height']);self.assertEqual(a['y'],b['y']);self.assertAlmostEqual(b['x']-a['x']-a['width'],2)
    if group['layout_mode']=='PAIR_MIXED':self.assertAlmostEqual(max(a['width'],b['width'])/min(a['width'],b['width']),2)
    else:self.assertEqual(a['width'],b['width'])
  self.assertEqual(len(modes),5)
 def test_only_requested_signature_is_stretched(self):
  group=self.layout['groups']['early_g29'];frames=group['frames'];self.assertEqual(len(frames),9)
  self.assertEqual({(f['width'],f['height']) for f in frames},{(frames[0]['width'],frames[0]['height'])})
  self.assertEqual([f['image_id'] for f in frames if f['fit_mode']=='STRETCH'],['early_rId56'])
 def test_caption_source_is_verbatim_with_only_authorized_separator_transform(self):
  import re
  self.assertEqual(len(self.layout['captions']),32)
  for mapping in self.layout['captions'].values():self.assertEqual(mapping['display'],re.sub(r'[；;]\s*(?=(?:左图|右图|右上图|右下图)[：:])','\n',mapping['source']));self.assertNotIn('\n\n',mapping['display'])
  self.assertAlmostEqual(self.layout['caption_body_gap_mm']*72/25.4,11)
 def test_alpha_derivatives_remove_only_zero_alpha_edges(self):
  count=0
  for group in self.layout['groups'].values():
   for f in group['frames']:
    source=f['source']
    if 'original' not in source:continue
    original=source['original']
    with Image.open(ROOT/original['file']) as a,Image.open(ROOT/source['path']) as b:
     if 'alpha_trim_bounds' in original:count+=1;expected=a.convert('RGBA').crop(original['alpha_trim_bounds'])
     else:expected=ImageOps.exif_transpose(a).convert('RGBA')
     self.assertEqual(expected.tobytes(),b.convert('RGBA').tobytes())
  self.assertEqual(count,6)
if __name__=='__main__':unittest.main()
