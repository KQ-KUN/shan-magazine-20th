"""Verify V2 native paragraphs, PDF glyphs and rendered solid name backgrounds."""
from pathlib import Path
from collections import Counter
import json,sys,subprocess,hashlib
import pdfplumber
from pypdf import PdfReader
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/messages_v2'
sys.path.insert(0,str(ROOT/'tools'))
from messages_source import extract,SOURCE,UPLOAD,digest,EXPECTED

def read(p):return json.loads(p.read_text('utf-8-sig'))
def render(pdf,folder,dpi=140):
 folder.mkdir(parents=True,exist_ok=True)
 subprocess.run(['pdftoppm','-r',str(dpi),'-png',str(pdf),str(folder/'page')],check=True,capture_output=True)
 return [Image.open(p).convert('RGB') for p in sorted(folder.glob('page-*.png'),key=lambda p:int(p.stem.split('-')[-1]))]
def main():
 r=read(OUT/'MESSAGES_RUNTIME_V2.json');mapping=read(ROOT/'content/MESSAGES_IMPORT_MAP.json');source=extract(SOURCE)
 assert digest(SOURCE)==digest(UPLOAD)==EXPECTED
 assert r['status']=='PASS' and r['people']==28 and r['source_paragraphs']==130 and not r['overset']
 assert r['fonts_installed'] and not r['missing_links'] and not r['focus']['active_page_is_parent']
 assert len(r['frames'])==r['pages']*2
 reconstructed=[p['text'] for p in r['paragraphs']]
 last_frame=-1
 for i,p in enumerate(r['paragraphs']):
  assert p['source_paragraph']==i+1 and len(p['lines'])>0
  for l in p['lines']:
   assert l['frame_index']>=last_frame,'Text order not left-to-right/page-to-page'
   last_frame=l['frame_index']
  if p['style']!='P_Message_Header':assert not p['keep_all_lines'],'Whole body locked together'
 for entry,m in zip(r['entries'],mapping['entries']):
  assert entry['index']==mapping['entries'].index(m) and entry['id']==m['id']
  assert reconstructed[m['header_paragraph']-1]==entry['name']+'\t'+entry['role']
  reconstructed[m['header_paragraph']-1]=entry['header_reconstructed']
  assert entry['body']==[source[i-1] for i in m['body_paragraphs']]
  h=entry['header'];assert h['solid_fill'] and h['same_line']
  assert h['role_start_pt']>h['name_end_pt']
  assert len(entry['body_lines'])>=2 and all(l['frame_index']==h['frame_index'] for l in entry['body_lines'][:2])
 assert reconstructed==source,'Source paragraph equality failed'
 assert len([e for e in r['entries'] if e['crosses_columns']])>0
 jiang=next(e for e in r['entries'] if e['name']=='姜福铭')
 assert jiang['crosses_pages'],'Long text must demonstrate actual cross-page flow'
 assert '2026.10.11于上海' in jiang['body']
 pdf=OUT/'SHAN_MESSAGES_REVIEW_V2.pdf';doc=PdfReader(pdf);assert len(doc.pages)==r['pages']
 fonts=set();ink_bottom=[]
 with pdfplumber.open(pdf) as pages:
  for i,(page,native) in enumerate(zip(pages.pages,doc.pages)):
   trim=native.trimbox;assert abs(float(trim.width)*25.4/72-185)<.05 and abs(float(trim.height)*25.4/72-260)<.05
   ox=float(trim.left);oy=float(native.mediabox.top)-float(trim.top)
   top=41 if i==0 else 23
   chars=[c for c in page.chars if oy+(top-3)*72/25.4<=c['top'] and c['bottom']<=oy+243*72/25.4]
   expected=''
   for p in r['paragraphs']:
    for l in p['lines']:
     if l['page_index']==i+1:
      text=l['text'].replace('\r','')
      expected+=text
   assert Counter(''.join(c['text'] for c in chars))==Counter(expected),(i+1,Counter(expected)-Counter(''.join(c['text'] for c in chars)),Counter(''.join(c['text'] for c in chars))-Counter(expected))
   assert not any(c['text'] in ('\ufffd','\x00') for c in chars)
   local=[]
   for col in range(2):
    f=r['frames'][i*2+col];left=f['bounds_mm'][1];right=f['bounds_mm'][3]
    part=[c for c in chars if left*72/25.4+ox-1<=(c['x0']+c['x1'])/2<=right*72/25.4+ox+1]
    assert part,'Unused column'
    bottom=(max(c['bottom'] for c in part)-oy)*25.4/72
    local.append(round(240-bottom,2))
    if i<r['pages']-2:assert 240-bottom<45,'Meaningless half-column bottom void'
   ink_bottom.append(local)
   for entry in [e for e in r['entries'] if e['header']['page_index']==i+1]:
    y,x,b,right=entry['header']['rect_mm']
    rects=[q for q in page.rects if abs(q['x0']-(x*72/25.4+ox))<.4 and abs(q['top']-(y*72/25.4+oy))<.4]
    assert len(rects)==1 and rects[0]['fill'] and not rects[0]['stroke'],'Name background must be solid and without border'
    rgb=rects[0]['non_stroking_color'];assert len(rgb)==3 and all(abs(a-v/255)<.01 for a,v in zip(rgb,[67,92,115]))
   for f in native['/Resources'].get('/Font',{}).get_object().values():
    f=f.get_object()
    for descendant in f.get('/DescendantFonts',[f]):
     descriptor=descendant.get_object()['/FontDescriptor'].get_object();assert any(k in descriptor for k in ('/FontFile','/FontFile2','/FontFile3'));fonts.add(str(descriptor['/FontName']))
 out=OUT/'pages'/hashlib.sha256(pdf.read_bytes()).hexdigest()[:12];images=render(pdf,out)
 assert len(images)==r['pages']
 w,h=380,555;sheet=Image.new('RGB',(w*3,h*((len(images)+2)//3)),'#dcdedb');draw=ImageDraw.Draw(sheet)
 for i,im in enumerate(images):
  im=im.copy();im.thumbnail((360,515));x=i%3*w+10;y=i//3*h+25;sheet.paste(im,(x,y));draw.text((x,y-17),f'Page {i+1}',fill='#303030')
 sheet.save(OUT/'SHAN_MESSAGES_V2_CONTACT_SHEET.png')
 # Evidence crops are 200 dpi PDF pixels, not reconstructions or edits of page content.
 detail=render(pdf,OUT/'detail'/hashlib.sha256(pdf.read_bytes()).hexdigest()[:12],200)
 ppm=200/25.4
 def crop(page,x,y,right,bottom):return detail[page-1].crop(tuple(round(v*ppm) for v in (x+3,y+3,right+3,bottom+3)))
 first=r['entries'][0]['header'];y,x,b,right=first['rect_mm'];f=r['frames'][first['frame_index']]
 crop(first['page_index'],x-1,y-2,f['bounds_mm'][3]+1,b+19).save(OUT/'SHAN_MESSAGES_V2_NAME_ROLE_DETAIL.png')
 panels=[]
 for frame_index in jiang['frames']:
  f=r['frames'][frame_index];lines=[l for l in jiang['body_lines'] if l['frame_index']==frame_index]
  top=(jiang['header']['rect_mm'][0]-2) if frame_index==jiang['header']['frame_index'] else f['bounds_mm'][0]-2
  bottom=min(242,f['bounds_mm'][2]+2)
  im=crop(f['page_index'],f['bounds_mm'][1]-1,top,f['bounds_mm'][3]+1,bottom)
  panels.append((f'Page {f["page_index"]} / {"L" if f["column"]==0 else "R"}',im))
 canvas=Image.new('RGB',(sum(im.width+20 for _,im in panels),max(im.height for _,im in panels)+35),'#dedfdf');draw=ImageDraw.Draw(canvas);x=10
 for title,im in panels:draw.text((x,8),title,fill='#222');canvas.paste(im,(x,30));x+=im.width+20
 canvas.save(OUT/'SHAN_MESSAGES_V2_LONG_MESSAGE_FLOW.png')
 proof={'status':'PASS','native_version':r['native_version'],'pages':r['pages'],'people':28,'source_paragraphs':130,'empty_paragraphs':27,'source_sha256':EXPECTED,
 'paragraph_equality':'Exact; only each original header role SPACE name -> name TAB role is reversed before comparison',
 'pdf_glyph_equality':'Exact per-page character multiset from native visible lines; Only terminal paragraph CR excluded; authorized header TAB retained exactly in PDF text extraction',
 'name_rectangles':28,'role_same_line_right':28,'header_with_first_two_body_lines':28,'fonts_embedded':sorted(fonts),
 'bottom_blank_mm_by_page_column':ink_bottom,'long_message_flow':{'name':jiang['name'],'pages':jiang['pages'],'frames':jiang['frames']},
 'render_directory':str(out.relative_to(ROOT)),'visual_review':'PENDING_AGENT_INSPECTION','overset':False,'missing_links':False}
 (OUT/'MESSAGES_VALIDATION_V2.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(proof,ensure_ascii=False))
def book_checks():
 from PIL import ImageChops
 report=read(OUT/'FINAL_PRINT_REPORT.json');plan=read(OUT/'RESOLVED_BOOK_PLAN.json')
 assert report['status']=='PASS' and not report['overset'] and not report['missing_links']
 assert report['toc_validation']['status']=='PASS' and not report['toc_pending_excluded']
 entry=next(e for e in report['toc_entries'] if e['component_id']=='messages')
 component=plan['components'][-1]
 expected_start=read(ROOT/'exports/ebook_v8_r1/RESOLVED_BOOK_PLAN.json')['components'][-1]['start_page']
 assert entry['start_page']==component['start_page']==expected_start
 assert all(c['start_page']%2==1 for c in plan['components'] if c['kind']=='chapter')
 module=read(OUT/'COMPONENT_RUNTIME.json');standalone=read(OUT/'MESSAGES_RUNTIME_V2.json')
 assert module['pages']==standalone['pages'] and module['first_page']==component['start_page']
 assert [p['text'] for p in module['paragraphs']]==[p['text'] for p in standalone['paragraphs']]
 assert all(e['header']['solid_fill'] and e['header']['same_line'] for e in module['entries'])
 pdf=OUT/'SHAN_EBOOK_V8_MESSAGES_V2.pdf';book=PdfReader(pdf)
 assert len(book.pages)==report['total_reader_pdf_pages']==plan['interior_pages']+2
 for page in book.pages:
  assert abs(float(page.trimbox.width)*25.4/72-185)<.05 and abs(float(page.trimbox.height)*25.4/72-260)<.05
 assert not book.pages[1].extract_text(),'Inside front cover is not blank'
 native_module=PdfReader(ROOT/component['file'])
 for i,page in enumerate(native_module.pages):assert page.get_contents().get_data()==book.pages[component['start_page']+1+i].get_contents().get_data()
 baseline=ROOT/report['pdf_finishing']['protected_reader']
 baseline_reader=PdfReader(baseline)
 new_dir=OUT/'book_pages'/hashlib.sha256(pdf.read_bytes()).hexdigest()[:12]
 old_dir=OUT/'book_pages'/hashlib.sha256(baseline.read_bytes()).hexdigest()[:12]
 new_images=render(pdf,new_dir,65);old_images=render(baseline,old_dir,65)
 protected=report['pdf_finishing']['unchanged_pages_exact_stream']
 toc_index=report['toc_page']['review_pdf_page']-1
 toc_delta=ImageChops.difference(new_images[toc_index],old_images[toc_index]).getbbox()
 assert toc_delta is not None and toc_delta[1]>new_images[toc_index].height*.80,'Unrelated directory region changed'
 for page in protected:
  assert book.pages[page-1].get_contents().get_data()==baseline_reader.pages[page-1].get_contents().get_data()
  assert ImageChops.difference(new_images[page-1],old_images[page-1]).getbbox() is None,'Unrelated rendered page changed '+str(page)
 w,h=180,265;sheet=Image.new('RGB',(w*5,h*((len(new_images)+4)//5)),'#ddd');draw=ImageDraw.Draw(sheet)
 for i,image in enumerate(new_images):
  im=image.copy();im.thumbnail((170,240));x=(i%5)*w+5;y=(i//5)*h+20;sheet.paste(im,(x,y));draw.text((x,y-14),str(i+1),fill='black')
 sheet.save(OUT/'SHAN_MESSAGES_V2_BOOK_CONTACT_SHEET.png')
 toc=report['toc_page']['review_pdf_page'];new_images[toc-1].save(OUT/'SHAN_MESSAGES_V2_BOOK_TOC.png')
 data={'status':'PASS','reader_pages':len(book.pages),'interior_pages':plan['interior_pages'],
  'messages_logical_pages':[component['start_page'],component['end_page']],
  'messages_reader_pages':[component['start_page']+2,component['end_page']+2],
  'toc_messages_start':entry['start_page'],'pending_items':0,'chapter_recto':True,'all_pages_rendered':len(new_images),
  'toc_added_row_pixel_bounds':toc_delta,'unchanged_pages_exact_stream_and_pixels':len(protected),'history_cover_chapter_intros_and_other_body_unchanged':True,
  'native_version':module['native_version'],'overset':False,'missing_links':False}
 (OUT/'MESSAGES_BOOK_VALIDATION_V2.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(data,ensure_ascii=False))
if __name__=='__main__':
 if len(sys.argv)>1 and sys.argv[1]=='book':book_checks()
 else:main()
