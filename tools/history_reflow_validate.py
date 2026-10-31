"""Validate only the authorized History reflow; render it once for review."""
from pathlib import Path
import json,hashlib,sys,csv,shutil
from pypdf import PdfReader
from history_v2_layout import display_blocks
from history_v2_validate import render
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/history_reflow'
def read(p):return json.loads((ROOT/p).read_text('utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 data=read('content/HISTORY_FULL_IMPORT.json');diag=read('exports/history_reflow/REFLOW_DIAGNOSTIC.json');r=read('exports/history_reflow/HISTORY_RUNTIME.json');old=read('exports/history_full/HISTORY_RUNTIME.json');layout=diag['layout'];view=display_blocks(data,layout)
 assert r['status']=='PASS' and not r['overset'] and not r['missing_links']
 assert r['source_sha256']==data['source_sha256']==sha(ROOT/data['source'])
 assert len(r['paragraphs'])==len(data['blocks'])==590 and len(r['images'])==170 and len(r['footnotes'])==5
 for block,actual in zip(view,r['paragraphs']):assert block['id']==actual['id'] and block.get('text','')==actual['text']
 prose=lambda bs:[b['id'] for b in bs if b['type']=='text' and not b.get('style','').startswith('P_History_Caption')]
 assert prose(data['blocks'])==prose(view),'Body chronology changed'
 ids=lambda bs:[i['id'] for b in bs for i in b.get('items',[])]
 assert ids(data['blocks'])==ids(view),'Image identity/order changed'
 previous={i['id']:i for i in old['images']};byid={b['id']:b for b in data['blocks']}
 for image in r['images']:
  before=previous[image['id']];assert sha(ROOT/image['file'])==image['source_sha256']==before['source_sha256']
  assert image['page']==image['caption_page']
  for k in ['width_mm','height_mm']:assert abs(image[k]-before[k])<.02
  for k in ['width','height']:assert abs(image['graphic_mm'][k]-before['graphic_mm'][k])<.02
  assert image['rotation']==before['rotation'] and image['shear']==before['shear']
 for n in r['footnotes']:
  expected=next(x for x in byid[n['block']]['footnotes'] if x['source_id']==n['source_id']);assert n['text']==expected['text'] and n['automatic_number_marker'] and n['span_across_columns'] and n['max_line_width_mm']>76
 text=''.join(p['text'] for p in r['paragraphs']);assert '于淼' not in text and '楚修红' not in text and '2017级会长：余淼' in text
 for p in r['paragraphs']:
  if p['style'].startswith('P_History_Caption'):assert abs(p['space_after_pt']-(15 if p['origin']=='full_tail' else 11))<.01
 pdf=OUT/'SHAN_HISTORY_REFLOW.pdf';reader=PdfReader(pdf);assert len(reader.pages)==r['pages']
 for p in reader.pages:assert abs(float(p.trimbox.width)*25.4/72-185)<.01 and abs(float(p.trimbox.height)*25.4/72-260)<.01
 current=''.join(''.join(p.extract_text().split()) for p in reader.pages);assert '于淼' not in current and '楚修红' not in current and '2017级会长：余淼' in current
 gaps={}
 for k in ['before','after']:
  rows=diag[k]['column_end_gaps'];last=max(int(x['column'].split(':')[0]) for x in rows);values=[x['gap_mm'] for x in rows if int(x['column'].split(':')[0])<last]
  gaps[k]={'pages':diag[k]['pages'],'nonterminal_columns':len(values),'sum_column_end_gap_mm':round(sum(values),2),'maximum_column_end_gap_mm':round(max(values),2),'columns_over_20mm':sum(x>20 for x in values)}
 assert gaps['after']['columns_over_20mm']==0
 frozen=read('workflow/HISTORY_PROFILE_FACT_CORRECTION.json')['frozen_scope_hashes'];assert all(sha(ROOT/p)==s for p,s in frozen.items())
 folder=OUT/'review'/sha(pdf)[:12]
 if '--ending-only' in sys.argv:
  import pypdfium2 as pdfium
  previous=read('exports/history_reflow/ACCEPTANCE.json');prior=Path(previous['preview_directory']);folder.mkdir(parents=True,exist_ok=True);pages=len(reader.pages)
  for i in range(1,pages):shutil.copy2(prior/f'page-{i}.png',folder/f'page-{i}.png')
  native=pdfium.PdfDocument(str(pdf));native[pages-1].render(scale=1.45).to_pil().save(folder/f'page-{pages}.png');contacts=[]
 else:pages,contacts=render(pdf,folder,1.45)
 report={'status':'PASS','source_blocks':590,'images':170,'native_full_width_footnotes':5,'body_text_and_order':'EXACT','image_sources_dimensions_and_crops':'EXACT','captions':'Bound to actual image on the same page; required following-body spacing preserved','frozen_files_unchanged':len(frozen),'source_word_sha256':data['source_sha256'],'pdf_sha256':sha(pdf),'pages':pages,'gaps':gaps,'media_moves':len(diag['moves']),'preview_directory':str(folder),'contacts':contacts,'visual':'PENDING'}
 (OUT/'ACCEPTANCE.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf-8')
 with (OUT/'IMAGE_BODY_MOVES.csv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.writer(f);w.writerow(['image_caption_unit_ids','previous_after','new_after','gap_before_mm','reason']);w.writerows([[';'.join(x['ids']),x['previous_after'],x['after'],round(x['gap_before_mm'],2),x['reason']] for x in diag['moves']])
 print('PASS History only:',pages,'pages;',len(diag['moves']),'media moves; max nonterminal column end gap',gaps['after']['maximum_column_end_gap_mm'],'mm')
if __name__=='__main__':main()
