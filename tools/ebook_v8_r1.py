"""Two scoped V8 corrections; reuse all other approved V8 PDF pages exactly."""
from pathlib import Path
import argparse,copy,hashlib,json,subprocess
from PIL import Image
from pypdf import PdfReader,PdfWriter

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'exports/ebook_v8_r1'; BASE='b403225d59ee71ec50a05067fdc81aff8dedf5b7'
TARGETS=('memoir_pancake','xingyue')
def read(p):return json.loads((ROOT/p).read_text('utf-8-sig'))
def write(p,value):
 p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git','-c',f'safe.directory={ROOT.as_posix()}',*args],cwd=ROOT)

def prepare():
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'components').mkdir(exist_ok=True)
 old=json.loads(git('show',BASE+':content/XINGYUE.json'));current=read('content/XINGYUE.json')
 assert current['paragraphs']==old['paragraphs'],'Approved XingYue copy/block membership changed'
 expected=copy.deepcopy(old);next(b for b in expected['blocks'] if b['id']=='story')['top_mm']=32
 assert current==expected,'Only XingYue page1 story top may change'
 media=read('assets/PANCAKE_MEDIA_MANIFEST.json');source=read('spec/TASK16_SOURCE_AUDIT.json')['pancake_original']
 assert media['file']==source['file'] and digest(media['file'])==source['sha256']
 im=Image.open(ROOT/media['file']);assert im.mode=='RGB' and im.size==(257,350) and im.getbbox()==(0,0,257,350)
 assert abs(media['height_mm']/media['width_mm']-350/257)<1e-8
 fixture=read('exports/ebook_v8/SOURCE_FIXTURE.json')
 for p,h in fixture['sources'].items():assert digest(p)==h,'Source DOCX '+p
 protected=read('exports/ebook_v8/PROTECTED_HASHES.json')
 for p,h in protected.items():assert digest(p)==h,'Protected '+p
 assert digest('exports/ebook_v8/SHAN_EBOOK_V8.pdf')=='b81a0653d9aa72b567a66a93325685361de99d5653f5d612d639cff82682caad','Approved V8 PDF changed'
 protected['exports/ebook_v8/SHAN_EBOOK_V8.pdf']=digest('exports/ebook_v8/SHAN_EBOOK_V8.pdf')
 for c in read('exports/ebook_v8/RESOLVED_BOOK_PLAN.json')['components']:
  if c['kind'] not in ('chapter','editorial_toc'):assert digest(c['file'])==c['sha256'];protected[c['file']]=c['sha256']
 write('exports/ebook_v8_r1/PROTECTED_HASHES.json',protected)
 write('exports/ebook_v8_r1/SOURCE_FIXTURE.json',fixture)
 write('exports/ebook_v8_r1/BOOK_COVER_SOURCE.json',dict(source,mode=im.mode,alpha_canvas=False,original_bytes_unchanged=True))
 print('PASS R1 source: all original paragraphs/DOCX/cover/History/V8 PDF protected; opaque original portrait')

def resolve():
 native=read('exports/ebook_v8_r1/STANDALONE_RUNTIME.json');assert native['status']=='PASS'
 records={c['id']:c for c in native['components']};assert set(records)==set(TARGETS)
 plan=copy.deepcopy(read('exports/ebook_v8/RESOLVED_BOOK_PLAN.json'));inputs=[]
 for c in plan['components']:
  if c['id'] in records:
   n=records[c['id']]
   if n['pages']!=c['page_count']:raise RuntimeError(c['id']+' flow still changes page count; inspect native diagnostics before Assembly')
   assert n['start_page']==c['start_page'];c.update(file=n['file'],sha256=digest(n['file']),overset=False)
  if c['kind'] not in ('chapter','editorial_toc'):
   assert digest(c['file'])==c['sha256'];inputs.append({'id':c['id'],'file':c['file'],'sha256':c['sha256'],'source_sha256':c['sha256'],'page_count':c['page_count'],'images_converted':False})
 plan.update(baseline_commit=BASE,mode='V8_R1_TWO_COMPONENT_CORRECTION_EXACT_PASSTHROUGH')
 write('exports/ebook_v8_r1/RESOLVED_BOOK_PLAN.json',plan)
 write('exports/ebook_v8_r1/PRINT_COMPONENT_INPUTS.json',{'status':'PASS','source_components_untouched':True,'components':inputs,'color_conversion':'NONE'})
 print('PASS R1 resolve: unchanged 68 interior / 70 reader pages; all other V8 components reused')

def finish():
 plan=read('exports/ebook_v8_r1/RESOLVED_BOOK_PLAN.json');report=read('exports/ebook_v8_r1/FINAL_PRINT_REPORT.json');assert report['status']=='PASS'
 baseline=PdfReader(ROOT/'exports/ebook_v8/SHAN_EBOOK_V8.pdf');replacement={}
 for c in plan['components']:
  if c['id'] not in TARGETS:continue
  assert digest(c['file'])==c['sha256'];doc=PdfReader(ROOT/c['file']);assert len(doc.pages)==c['page_count']
  for offset,page in enumerate(doc.pages):
   # Page2 of XingYue is protected, and is carried directly from approved V8.
   if c['id']=='xingyue' and offset==1:continue
   replacement[c['start_page']+1+offset]=page
 # Preserve approved V8 pages directly, including TOC/chapter artifacts. Native
 # Assembly above validates the unchanged live directory and recto ranges.
 writer=PdfWriter();interior=PdfWriter()
 for i,p in enumerate(baseline.pages):
  page=replacement.get(i,p);writer.add_page(page)
  if i>=2:interior.add_page(page)
 for p in writer.pages:p.cropbox=p.trimbox
 writer.page_layout='/TwoPageRight'
 writer.add_metadata({k:v for k,v in baseline.metadata.items() if isinstance(v,str)})
 writer.add_metadata({'/Title':'山 — 电子版 V8 R1'})
 for name in ('SHAN_REVIEW_V8_R1.pdf','SHAN_EBOOK_V8_R1.pdf'):
  with (OUT/name).open('wb') as f:writer.write(f)
 with (OUT/'SHAN_INTERIOR_PRINT_V8_R1.pdf').open('wb') as f:interior.write(f)
 final=PdfReader(OUT/'SHAN_EBOOK_V8_R1.pdf')
 for i,p in enumerate(baseline.pages):
  if i not in replacement:assert final.pages[i].get_contents().get_data()==p.get_contents().get_data(),'Protected PDF stream '+str(i+1)
 report['pdf_finishing']={'status':'PASS','color_conversion':'NONE','source_text_normalization':'NONE','source_pages_passthrough':len(baseline.pages)-len(replacement),'native_replaced_components':list(TARGETS),'same_live_toc_ranges':True}
 write('exports/ebook_v8_r1/FINAL_PRINT_REPORT.json',report)
 print('PASS R1 finish: 70 reader pages; exact unchanged V8 pages; no color conversion')

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('action',choices=['prepare','resolve','finish']);args=p.parse_args();{'prepare':prepare,'resolve':resolve,'finish':finish}[args.action]()
