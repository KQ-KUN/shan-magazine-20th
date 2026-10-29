"""Resolve new History counts and reuse approved article PDFs, rebasing folios only."""
from pathlib import Path
from collections import Counter
import copy,hashlib,json,sys
from pypdf import PdfReader,PdfWriter
from pypdf.generic import ContentStream
from resolve_print_v3 import folio_blocks

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/history_v2'
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def digest(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def write(p,d):
 p=ROOT/p;p.parent.mkdir(exist_ok=True,parents=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def plan():
 (OUT/'components').mkdir(parents=True,exist_ok=True)
 native=read('exports/history_v2/HISTORY_RUNTIME.json');assert native['status']=='PASS' and not native['overset'] and len(native['images'])==105 and len(native['footnotes'])==3
 msg=read('exports/messages_revision_20261024/MESSAGES_RUNTIME.json');assert msg['status']=='PASS' and not msg['overset']
 old=read('exports/messages_v2/RESOLVED_BOOK_PLAN.json'); prior={c['id']:c for c in old['components']}
 manifest=copy.deepcopy(read('content/ASSEMBLY_V0_MANIFEST.json'))
 history=next(c for c in manifest['interior'] if c['id']=='history');history['source']=read('content/HISTORY_V2_IMPORT.json')['source'];history['import_map']='content/HISTORY_V2_IMPORT.json'
 write('content/HISTORY_V2_ASSEMBLY_MANIFEST.json',manifest)
 components=[];transitions=[];next_page=1
 for c in manifest['interior']:
  if c.get('start_on_recto') and next_page%2==0:transitions.append({'page':next_page,'before':c['id'],'reason':'Recto chapter start'});next_page+=1
  entry=copy.deepcopy(prior[c['id']]);entry['previous_start_page']=entry['start_page'];entry['previous_page_count']=entry['page_count']
  if c['id']=='history':entry.update(file='exports/history_v2/SHAN_HISTORY_V2.pdf',page_count=native['pages'],source=history['source'])
  elif c['id']=='messages':entry.update(file='exports/messages_revision_20261024/SHAN_MESSAGES_REVISION_20261024.pdf',page_count=msg['pages'])
  elif c['id']=='association_profile':entry.update(file='exports/history_v2/components/association_profile_native.pdf',page_count=1)
  if c['kind'] not in ('chapter','editorial_toc') and c['id'] not in ('history','messages','association_profile'):assert next_page%2==prior[c['id']]['start_page']%2,'Unchanged component side changed '+c['id']
  entry.update(start_page=next_page,end_page=next_page+entry['page_count']-1,start_side='RIGHT_HAND' if next_page%2 else 'LEFT_HAND',overset=False)
  if (ROOT/entry['file']).exists() and c['kind'] not in ('chapter','editorial_toc'):entry['sha256']=digest(entry['file'])
  components.append(entry);next_page+=entry['page_count']
 result=dict(old,components=components,parity_transitions=transitions,interior_pages=next_page-1,folio_rebase=[],mode='AUDITED_HISTORY_PREFIX_PLUS_APPROVED_TAIL_FINAL_NAMES',approved_cover_sha256=digest(manifest['cover']['front']['file']))
 write('exports/history_v2/RESOLVED_BOOK_PLAN.json',result)
 config=copy.deepcopy(read('content/MESSAGES_V2_BOOK.json'));config.update(version='history.v2',source_plan='content/HISTORY_V2_ASSEMBLY_MANIFEST.json',baseline='exports/history_v2/RESOLVED_BOOK_PLAN.json',output='exports/history_v2',output_version='HISTORY_V2',body_geometry='UNCHANGED_APPROVED_ARTICLES_WITH_AUTHORIZED_FOLIO_REBASE',release_mode='ONLINE_EBOOK_FIRST')
 write('content/HISTORY_V2_BOOK.json',config)
 print('PASS planned interior',next_page-1,'reader',next_page+1,'Messages start',next(c['start_page'] for c in components if c['id']=='messages'))
 return result

def folio_plan():
 p=plan();old=read('exports/messages_v2/RESOLVED_BOOK_PLAN.json');prior={c['id']:c for c in old['components']};msg=read('exports/messages_revision_20261024/MESSAGES_RUNTIME.json');folios=[]
 for c in p['components']:
  if c['kind'] in ('chapter','editorial_toc'):continue
  if c['id']=='association_profile' and not (ROOT/c['file']).exists():continue
  assert (ROOT/c['file']).exists(),c['file'];c['sha256']=digest(c['file']);reader=PdfReader(ROOT/c['file']);assert len(reader.pages)==c['page_count']
  oldstart=14 if c['id']=='history' else msg['first_page'] if c['id']=='messages' else 3 if c['id']=='association_profile' else prior[c['id']]['start_page']
  for i,page in enumerate(reader.pages):
   if oldstart+i==c['start_page']+i:continue
   _,matches=folio_blocks(page,reader,oldstart+i)
   if matches:folios.append({'component_id':c['id'],'component_page':i+1,'old_folio':oldstart+i,'new_folio':c['start_page']+i})
 p['folio_rebase']=folios;write('exports/history_v2/RESOLVED_BOOK_PLAN.json',p)
 print('PASS verified numeric folios to rebase',len(folios))

def image_fingerprints(page):
 result=[];seen=set()
 def visit(res):
  if not res:return
  res=res.get_object();xs=res.get('/XObject',{})
  for ref in xs.get_object().values() if hasattr(xs,'get_object') else xs.values():
   obj=ref.get_object()
   if id(obj) in seen:continue
   seen.add(id(obj))
   if obj.get('/Subtype')=='/Image':result.append((obj.get('/Width'),obj.get('/Height'),hashlib.sha256(obj.get_data()).hexdigest()))
   elif obj.get('/Subtype')=='/Form':visit(obj.get('/Resources'))
 visit(page.get('/Resources'));return Counter(result)

def components():
 p=read('exports/history_v2/RESOLVED_BOOK_PLAN.json');folios=PdfReader(OUT/'FOLIO_ONLY_HISTORY_V2.pdf');fm={(x['component_id'],x['component_page']):x for x in p['folio_rebase']};inputs=[];checks=[]
 for c in p['components']:
  if c['kind'] in ('chapter','editorial_toc'):continue
  if c['id']=='association_profile':c['sha256']=digest(c['file'])
  assert digest(c['file'])==c['sha256'];reader=PdfReader(ROOT/c['file']);changed=any(key[0]==c['id'] for key in fm)
  if not changed:inputs.append({'id':c['id'],'file':c['file'],'sha256':c['sha256'],'source_sha256':c['sha256'],'page_count':c['page_count'],'color_conversion':'NONE'});continue
  writer=PdfWriter();writer.append(reader)
  for i,page in enumerate(writer.pages):
   row=fm.get((c['id'],i+1))
   if not row:continue
   ops,matches=folio_blocks(page,writer,row['old_folio']);assert len(matches)==1;start,end=matches[0]
   stream=ContentStream(page.get_contents(),writer);stream.operations=ops[:start]+[op for op in ops[start:end+1] if op[1]!=b'Tj']+ops[end+1:];page.replace_contents(stream)
   overlay=folios.pages[row['new_folio']-1];assert overlay.extract_text().strip()==str(row['new_folio']);page.merge_page(overlay)
  file='exports/history_v2/components/'+c['id']+'_folio.pdf'
  with (ROOT/file).open('wb') as f:writer.write(f)
  result=PdfReader(ROOT/file)
  for a,b in zip(reader.pages,result.pages):assert image_fingerprints(a)==image_fingerprints(b),'Image changed '+c['id']
  # The existing footer detector isolates only numeric Consolas furniture. Body
  # glyphs, positions, font sizes and ink must remain identical.
  import pdfplumber
  with pdfplumber.open(ROOT/c['file']) as before,pdfplumber.open(ROOT/file) as after:
   for i,(a,b) in enumerate(zip(before.pages,after.pages)):
    isfolio=lambda ch:ch['top']>710 and 'Consolas' in ch['fontname']
    aa=[x for x in a.chars if not isfolio(x)];bb=[x for x in b.chars if not isfolio(x)];assert len(aa)==len(bb)
    for x,y in zip(aa,bb):assert x['text']==y['text'] and all(abs(x[k]-y[k])<.04 for k in ['x0','x1','top','bottom','size']) and x['non_stroking_color']==y['non_stroking_color'],'Body glyph/ink changed '+c['id']
    row=fm.get((c['id'],i+1))
    if row:assert ''.join(x['text'] for x in b.chars if isfolio(x))==str(row['new_folio'])
  inputs.append({'id':c['id'],'file':file,'sha256':digest(file),'source_sha256':c['sha256'],'page_count':c['page_count'],'color_conversion':'NONE'});checks.append(c['id'])
 write('exports/history_v2/PRINT_COMPONENT_INPUTS.json',{'status':'PASS','source_components_untouched':True,'components':inputs,'color_conversion':'NONE','body_glyph_geometry_ink_and_image_bytes_preserved':True,'rebased_components':checks})
 write('exports/history_v2/RESOLVED_BOOK_PLAN.json',p)
 print('PASS components: body glyphs/geometry/ink and image streams identical; numeric folios only; components',len(inputs))

def finish():
 report=read('exports/history_v2/FINAL_PRINT_REPORT.json');assert report['status']=='PASS'
 src=PdfReader(OUT/'SHAN_REVIEW_HISTORY_V2.pdf');writer=PdfWriter()
 for page in src.pages:writer.add_page(page);writer.pages[-1].cropbox=writer.pages[-1].trimbox
 writer.page_layout='/TwoPageRight';writer.add_metadata({'/Title':'山 — 新版会史电子版','/Subject':'已审校至2019—2020年；余淼／2017级会长；楚休红'})
 with (OUT/'SHAN_EBOOK_HISTORY_V2.pdf').open('wb') as f:writer.write(f)
 report['final_electronic_pdf']='exports/history_v2/SHAN_EBOOK_HISTORY_V2.pdf';report['back_cover']='No approved existing back-cover file was found; original review cover model retained without inventing artwork';report['color_conversion']='NONE'
 write('exports/history_v2/FINAL_PRINT_REPORT.json',report)
 print('PASS final reader',len(writer.pages),'pages; native automatic TOC and recto; no color conversion')

if __name__=='__main__':{'plan':plan,'folios':folio_plan,'components':components,'finish':finish}[sys.argv[1]]()
