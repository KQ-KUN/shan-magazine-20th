from pathlib import Path
from collections import Counter
from zipfile import ZipFile
from lxml import etree as E
from PIL import Image,ImageDraw
from pypdf import PdfReader
import pypdfium2 as pdfium
import json,hashlib,csv,sys,subprocess,re

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/history_v2'
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(p,d):p=OUT/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def render(file,folder,scale=1.7):
 pdf=pdfium.PdfDocument(str(file));folder.mkdir(parents=True,exist_ok=True)
 for i,page in enumerate(pdf):page.render(scale=scale).to_pil().save(folder/f'page-{i+1}.png')
 cols=4 if len(pdf)>30 else 3;thumbw=310;thumbh=450;per_sheet=cols*4
 contacts=[]
 for start in range(0,len(pdf),per_sheet):
  canvas=Image.new('RGB',(cols*thumbw,4*thumbh),'#cccccc');draw=ImageDraw.Draw(canvas)
  for k in range(min(per_sheet,len(pdf)-start)):
   i=start+k;im=Image.open(folder/f'page-{i+1}.png');im.thumbnail((thumbw-10,thumbh-28));x=k%cols*thumbw;y=k//cols*thumbh;canvas.paste(im,(x+5,y+24));draw.text((x+8,y+7),str(i+1),fill='black')
  path=folder/f'contact-{start+1}.jpg';canvas.save(path,quality=95);contacts.append(str(path.relative_to(ROOT)))
 return len(pdf),contacts

def standalone():
 from history_v2_layout import validate as validate_layout
 validate_layout()
 data=read('content/HISTORY_V2_IMPORT.json');r=read('exports/history_v2/HISTORY_RUNTIME.json');pdf=OUT/'SHAN_HISTORY_V2.pdf'
 assert r['status']=='PASS' and not r['overset'] and len(r['images'])==105 and len(r['footnotes'])==3
 assert r['source_sha256']==data['source_sha256']==digest(ROOT/data['source'])
 assert len(r['paragraphs'])==len(data['blocks'])==427
 for block,actual in zip(data['blocks'],r['paragraphs']):assert actual['text']==block.get('text','') and actual['id']==block['id']
 assert [x['text'] for x in r['years']]==[b['text'] for b in data['blocks'] if b.get('style')=='P_History_Year']
 assert [x['text'] for x in r['years']].count('2020年——2021年')==1
 byid={b['id']:b for b in data['blocks']};rows=[]
 for img in r['images']:
  block=byid[img['block']];asset=next(a for a in block['items'] if a['id']==img['id']);assert digest(ROOT/img['file'])==img['source_sha256']==asset['sha256']
  if img['caption_block']:assert img['page']==img['caption_page']
  ppi=min(img['effective_ppi'])
  displayed=next((p['display_text'] for p in r['paragraphs'] if p['id']==img['caption_block']),'')
  rows.append(dict(image_id=img['id'],file=img['file'],linked_file=img['linked_file'],year=block['year'],source_paragraph=block['source_paragraph'],source_caption=byid[img['caption_block']]['text'] if img['caption_block'] else '',displayed_caption=displayed,related_activity=byid[block['description_block']]['text'] if block.get('description_block') else '',page=img['page'],caption_page=img['caption_page'],effective_ppi=round(ppi,1),links=img['link_status'],crop=json.dumps(asset['crop'])))
 for fn in r['footnotes']:
  expected=next(n for n in byid[fn['block']]['footnotes'] if n['source_id']==fn['source_id']);assert fn['text']==expected['text'] and fn['automatic_number_marker'] and fn['automatic_number_prefix_codes'][0]==4
 current='\n'.join(p['text'] for p in r['paragraphs']);assert current.count('2017级会长：余淼')==1 and '于淼' not in current and '楚修红' not in current
 with (OUT/'IMAGE_CAPTION_CHECK.csv').open('w',encoding='utf-8-sig',newline='') as f:w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
 reader=PdfReader(pdf);assert len(reader.pages)==r['pages']
 for p in reader.pages:assert abs(float(p.trimbox.width)*25.4/72-185)<.01 and abs(float(p.trimbox.height)*25.4/72-260)<.01
 text=''.join(''.join(p.extract_text().split()) for p in reader.pages)
 assert '于淼' not in text and '楚修红' not in text and '2017级会长：余淼' in text
 folder=OUT/'review_final'/digest(pdf)[:12];pages,contacts=render(pdf,folder)
 write(Path('HISTORY_CONTENT_INTEGRITY.json'),{'status':'PASS','source_sha256':data['source_sha256'],'native_pdf_sha256':digest(pdf),'pages':pages,'old_history_pages':7,'audited_prefix_images':94,'approved_tail_images':11,'exact_source_blocks':427,'native_footnotes':[dict(id=n['source_id'],text=n['text'],automatic_marker=n['automatic_number_marker'],page=n['anchor_page']) for n in r['footnotes']],'year_order':'EXACT; boundary 2020—2021 appears once','name_checks':'余淼／2017级会长；楚休红；no 于淼/楚修红 in current display','body_text_normalization':'NONE; generated native anchor/footnote markers only excluded from exact comparison','minimum_effective_ppi':min(row['effective_ppi'] for row in rows),'preview_directory':str(folder.relative_to(ROOT)),'contacts':contacts,'visual':'PENDING_AGENT_INSPECTION'})
 integrity=read('exports/history_v2/HISTORY_CONTENT_INTEGRITY.json');integrity['body_text_normalization']='Body and footnotes exact; only 32 mapped left/right caption semicolon separators display as one forced line break; blank line is after the complete caption';integrity['geometry_report']='IMAGE_GEOMETRY_CHECK.json';integrity['image_sources']='All 105 originals unchanged; 6 traceable zero-alpha trims and 2 lossless EXIF derivatives (orientation 8 transposed; invalid orientation 0 leaves pixels unchanged)';write(Path('HISTORY_CONTENT_INTEGRITY.json'),integrity)
 print('PASS standalone:',pages,'pages; 105 linked images; 3 original native footnotes with automatic markers; all 427 blocks exact')

def imported():
 p=read('exports/history_v2/RESOLVED_BOOK_PLAN.json');inputs=read('exports/history_v2/PRINT_COMPONENT_INPUTS.json');reader=PdfReader(OUT/'SHAN_EBOOK_HISTORY_V2.pdf');byid={c['id']:c for c in p['components']};checks=[]
 for source in inputs['components']:
  c=byid[source['id']];original=PdfReader(ROOT/source['file'])
  for i,page in enumerate(original.pages):
   a=''.join(page.extract_text().split());b=''.join(reader.pages[c['start_page']+1+i].extract_text().split())
   assert a==b,'Final exported component text differs: '+c['id']+' page '+str(i+1)
  checks.append({'id':c['id'],'pages':len(original.pages),'final_pdf_text':'EXACT except whitespace extraction'})
 write(Path('FINAL_IMPORTED_TEXT_CHECK.json'),{'status':'PASS','components':checks,'includes':'All History footnotes, captions, body text and corrected Messages headers; no final export text loss'})
 print('PASS all',len(checks),'imported components match final reader text page by page')

def book():
 r=read('exports/history_v2/FINAL_PRINT_REPORT.json');p=read('exports/history_v2/RESOLVED_BOOK_PLAN.json');assert r['status']=='PASS' and not r['overset']
 assert r['toc_validation']['actual_runtime_start_pages'] and r['toc_validation']['chapters_point_to_recto_openers']
 for c in r['components']:
  expected=next(x for x in p['components'] if x['id']==c['id']);assert c['start_page']==expected['start_page'] and c['page_count']==expected['page_count']
  if c['kind']=='chapter':assert c['start_page']%2==1
 file=OUT/'SHAN_EBOOK_HISTORY_V2.pdf';reader=PdfReader(file);assert len(reader.pages)==p['interior_pages']+2
 for page in reader.pages:assert abs(float(page.trimbox.width)*25.4/72-185)<.01 and abs(float(page.trimbox.height)*25.4/72-260)<.01
 hist=next(c for c in p['components'] if c['id']=='history');assert hist['page_count']==read('exports/history_v2/HISTORY_RUNTIME.json')['pages']
 msgs=next(c for c in p['components'] if c['id']=='messages');mr=read('exports/messages_revision_20261024/MESSAGES_RUNTIME.json');assert mr['first_page']==msgs['start_page'] and mr['people']==31 and mr['source_paragraphs']==148
 alltext=''.join(''.join(page.extract_text().split()) for page in reader.pages)
 assert '楚修红' not in alltext and '于淼' not in alltext and '余淼' in alltext
 profile=next(c for c in p['components'] if c['id']=='association_profile');pt=''.join(reader.pages[profile['start_page']+1].extract_text().split());assert '2006年5月' in pt and '2006年10月14日' not in pt
 imported()
 folder=OUT/'book_review'/digest(file)[:12];pages,contacts=render(file,folder,1.25)
 write(Path('BOOK_ACCEPTANCE.json'),{'status':'PASS','reader_pages':pages,'interior_pages':p['interior_pages'],'all_pages_rendered':pages,'chapter_recto':[{ 'id':c['id'],'start_page':c['start_page']} for c in r['components'] if c['kind']=='chapter'],'actual_toc_entries':r['toc_entries'],'native_assembly':True,'name_checks':'No 于淼/楚修红; final 余淼 and 楚休红','messages':{'people':31,'paragraphs':148,'first_page':mr['first_page'],'pages':mr['pages']},'profile':'2006年5月; approved ebook logo retained','color_conversion':'NONE','body_pdf_preservation':read('exports/history_v2/PRINT_COMPONENT_INPUTS.json')['body_glyph_geometry_ink_and_image_bytes_preserved'],'contacts':contacts,'preview_directory':str(folder.relative_to(ROOT)),'visual':'PENDING_AGENT_INSPECTION'})
 print('PASS book:',pages,'reader pages;',p['interior_pages'],'interior; automatic TOC, all chapters recto, final names and profile date')

if __name__=='__main__':{'standalone':standalone,'book':book,'imported':imported}[sys.argv[1]]()
