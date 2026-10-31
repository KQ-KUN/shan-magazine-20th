"""Necessary full-history content, geometry, and final assembly checks."""
from pathlib import Path
import sys,json,hashlib
from pypdf import PdfReader
from history_v2_validate import render
from history_v2_layout import display_blocks,validate_geometry
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/history_full'
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save(p,d):(OUT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def standalone():
 data=read('content/HISTORY_FULL_IMPORT.json');layout=read('content/HISTORY_FULL_LAYOUT.json');r=read('exports/history_full/HISTORY_RUNTIME.json');view=display_blocks(data,layout)
 assert r['status']=='PASS' and not r['overset'] and not r['missing_links']
 assert len(r['paragraphs'])==len(data['blocks'])==590 and len(r['images'])==170 and len(r['footnotes'])==5
 assert r['source_sha256']==data['source_sha256']==sha(ROOT/data['source'])
 for b,p in zip(view,r['paragraphs']):assert b['id']==p['id'] and b.get('text','')==p['text']
 old=read('content/HISTORY_V2_IMPORT.json');assert [b for b in data['blocks'] if b['origin']=='early']==[b for b in old['blocks'] if b['origin']=='early']
 byblock={b['id']:b for b in data['blocks']};byimg={i['id']:i for i in r['images']}
 for im in r['images']:
  assert sha(ROOT/im['file'])==im['source_sha256']
  if im['caption_block']:assert im['page']==im['caption_page']
 checks=[]
 for key,plan in layout['groups'].items():
  records=[byimg[f['image_id']] for f in plan['frames']];ox=records[0]['column_origin_x_mm'];oy=min(i['frame_mm']['y'] for i in records)
  assert abs(records[0]['reserved_line_height_mm']-records[0]['anchor_height_mm']-plan['inline_clearance_mm'])<.1
  actual={'origin':'InDesign_DOM','units':'mm','items':[],'captions':[],'anchored':True,'reserved_height_mm':records[0]['reserved_line_height_mm']-plan['inline_clearance_mm']}
  for f,i in zip(plan['frames'],records):
   box=lambda k:{**i[k],'x':i[k]['x']-ox,'y':i[k]['y']-oy}
   actual['items'].append({'image_id':i['id'],'frame':box('frame_mm'),'graphic':box('graphic_mm'),'source_path':str(ROOT/i['linked_file']),'page_id':i['page_id'],'link_missing':i['link_status']!='NORMAL','effective_ppi':i['effective_ppi'],'rotation':i['rotation'],'shear':i['shear']})
  if plan['kind']=='FIVE_MODE':
   check=validate_geometry(plan,actual,.5);assert check['valid'],(key,check)
  else:
   assert len({i['page_id'] for i in records})==1
   for f,i in zip(plan['frames'],records):assert abs(i['width_mm']-f['width'])<.1 and abs(i['height_mm']-f['height'])<.1
   check={'valid':True,'policy':'NAMED_EXCEPTION','reason':plan['exception']}
  checks.append({'block':key,'result':check})
 for p in r['paragraphs']:
  if p['style'].startswith('P_History_Caption'):assert abs(p['space_after_pt']-(15 if p['origin']=='full_tail' else 11))<.01
 for n in r['footnotes']:
  expected=next(x for x in byblock[n['block']]['footnotes'] if x['source_id']==n['source_id']);assert n['text']==expected['text'] and n['automatic_number_marker'] and n['span_across_columns'] and n['max_line_width_mm']>76
 text=''.join(p['text'] for p in r['paragraphs']);assert '于淼' not in text and '楚修红' not in text and '2017级会长：余淼' in text
 pdf=OUT/'SHAN_HISTORY_FULL.pdf';reader=PdfReader(pdf);assert len(reader.pages)==r['pages']
 folder=OUT/'review'/sha(pdf)[:12];pages,contacts=render(pdf,folder,1.55)
 save('HISTORY_CONTENT_INTEGRITY.json',{'status':'PASS','pages':pages,'blocks':590,'images':170,'protected_early_images':94,'new_tail_images':76,'native_footnotes':r['footnotes'],'source_sha256':data['source_sha256'],'pdf_sha256':sha(pdf),'geometry_groups':len(checks),'geometry':checks,'new_caption_body_gap_pt':15,'early_caption_body_gap_pt':11,'source_order_and_names':'EXACT','contacts':contacts,'preview_directory':str(folder),'visual':'PENDING'})
 print('PASS full history:',pages,'pages; 590 blocks; 170 images; 5 full-width native footnotes')
def book():
 r=read('exports/history_full/FINAL_PRINT_REPORT.json');plan=read('exports/history_full/RESOLVED_BOOK_PLAN.json');inputs=read('exports/history_full/PRINT_COMPONENT_INPUTS.json')
 assert r['status']=='PASS' and not r['overset'] and r['toc_validation']['actual_runtime_start_pages'] and r['toc_validation']['chapters_point_to_recto_openers']
 pdf=OUT/'SHAN_EBOOK_HISTORY_FULL.pdf';reader=PdfReader(pdf);assert len(reader.pages)==plan['interior_pages']+2
 byid={c['id']:c for c in plan['components']}
 for c in r['components']:
  assert c['start_page']==byid[c['id']]['start_page'] and c['page_count']==byid[c['id']]['page_count']
  if c['kind']=='chapter':assert c['start_page']%2==1
 for src in inputs['components']:
  c=byid[src['id']]
  for i,p in enumerate(PdfReader(ROOT/src['file']).pages):assert ''.join(p.extract_text().split())==''.join(reader.pages[c['start_page']+1+i].extract_text().split()),(c['id'],i)
 text=''.join(''.join(p.extract_text().split()) for p in reader.pages);assert '于淼' not in text and '楚修红' not in text and '余淼' in text
 profile=byid['association_profile'];assert '2006年5月' in ''.join(reader.pages[profile['start_page']+1].extract_text().split())
 assert inputs['body_glyph_geometry_ink_and_image_bytes_preserved']
 folder=OUT/'book_review'/sha(pdf)[:12];pages,contacts=render(pdf,folder,1.1)
 save('BOOK_ACCEPTANCE.json',{'status':'PASS','reader_pages':pages,'interior_pages':plan['interior_pages'],'components':len(inputs['components']),'automatic_toc':r['toc_entries'],'chapter_recto':True,'source_components_preserved_except_numeric_folios':True,'messages_first_page':byid['messages']['start_page'],'pdf_sha256':sha(pdf),'contacts':contacts,'preview_directory':str(folder),'visual':'PENDING'})
 print('PASS full book:',pages,'reader pages; all imported component text exact; automatic TOC and recto')
if __name__=='__main__':{'standalone':standalone,'book':book}[sys.argv[1]]()
