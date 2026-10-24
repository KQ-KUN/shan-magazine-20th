"""Native-PDF proofs for measured mineral overprint headers; no manuscript editing."""
from pathlib import Path
from collections import Counter
import sys,json,hashlib,subprocess,shutil
import pdfplumber
from pypdf import PdfReader
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/messages_revision_20261024'
sys.path.insert(0,str(ROOT/'tools'))
from messages_source import extract,SOURCE,UPLOAD,digest,EXPECTED

def read(p):return json.loads(p.read_text('utf-8-sig'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def render(pdf,dpi):
 folder=OUT/'render'/f'{digest(pdf)[:12]}_{dpi}';folder.mkdir(parents=True,exist_ok=True)
 if not list(folder.glob('page-*.png')):
  poppler=shutil.which('pdftoppm')
  if poppler:subprocess.run([poppler,'-r',str(dpi),'-png',str(pdf),str(folder/'page')],check=True,capture_output=True)
  else:
   import pypdfium2 as pdfium
   document=pdfium.PdfDocument(str(pdf))
   try:
    for index in range(len(document)):
     page=document[index];bitmap=page.render(scale=dpi/72)
     try:bitmap.to_pil().convert('RGB').save(folder/f'page-{index+1}.png')
     finally:bitmap.close();page.close()
   finally:document.close()
 return sorted(folder.glob('page-*.png'),key=lambda p:int(p.stem.split('-')[-1]))

def compare(report,pdf,suffix):
 old=read(ROOT/'exports/messages_type_refinement/MESSAGES_RUNTIME.json');oldpdf=ROOT/'exports/messages_type_refinement/SHAN_MESSAGES_TYPE_REFINEMENT.pdf'
 dpi=220;ppm=dpi/25.4;older=render(oldpdf,dpi);newer=render(pdf,dpi)
 for name,key in [('邵珠瑜','SHORT'),('刘慧颖（昼温）','LONG')]:
  panels=[]
  for label,r,paths in [('PREVIOUS: 28 people',old,older),('REVISED SOURCE: 31 people',report,newer)]:
   e=next(e for e in r['entries'] if e['name']==name);h=e['header'];f=r['frames'][h['frame_index']];y,x,b,right=h['rect_mm'];left=f['bounds_mm'][1]-2
   with Image.open(paths[h['page_index']-1]) as im:
    crop=im.crop(tuple(round(v*ppm) for v in (left+3,y-3+3,left+79+3,y+18+3))).convert('RGB')
   panels.append((label,crop))
  canvas=Image.new('RGB',(panels[0][1].width, sum(im.height+35 for _,im in panels)),'#e5e3df');d=ImageDraw.Draw(canvas);yy=0
  for label,im in panels:d.text((12,yy+8),label,fill='#202020');canvas.paste(im,(0,yy+30));yy+=im.height+35
  canvas.save(OUT/f'SHAN_MESSAGES_{key}_BEFORE_AFTER{suffix}.png')

def check(sample=False):
 report=read(OUT/('SAMPLE_RUNTIME.json' if sample else 'MESSAGES_RUNTIME.json'));pdf=OUT/('SHAN_MESSAGES_REVISION_SAMPLES.pdf' if sample else 'SHAN_MESSAGES_REVISION_20261024.pdf');t=read(ROOT/'spec/MESSAGES_TOKENS.json')
 assert report['status']=='PASS' and not report['overset'] and report['fonts_installed'] and not report['missing_links'] and not report['focus']['active_page_is_parent']
 assert digest(SOURCE)==digest(UPLOAD)==EXPECTED
 source=extract(SOURCE);mapping=read(ROOT/'content/MESSAGES_IMPORT_MAP.json');reconstructed=[p['text'] for p in report['paragraphs']]
 for e in report['entries']:
  reconstructed[e['header_paragraph']-1]=e['header_reconstructed'];h=e['header']
  assert 13<=h['name_size_pt']<=15 and abs(h['role_size_pt']-t['styles']['P_Message_Header']['size_pt'])<.01
  assert abs(h['role_center_pt']-h['name_center_pt'])<.2 and h['same_line']
  assert abs(h['offset_mm'][0]-.9)<.01 and abs(h['offset_mm'][1]-.8)<.01 and .7<=h['plate_height_ratio']<=.85
  assert len(e['body_lines'])>0 and all(l['frame_index']==h['frame_index'] for l in e['body_lines'][:2])
 if not sample:
  assert report['people']==31 and report['source_paragraphs']==148 and reconstructed==source
  assert len(set(e['header']['palette'] for e in report['entries']))<=4
  assert all(e['body']==[source[n-1] for n in m['body_paragraphs']] for e,m in zip(report['entries'],mapping['entries']))
  assert any(e['crosses_pages'] for e in report['entries']) and any(e['crosses_columns'] for e in report['entries'])
  assert all(not p['keep_all_lines'] for p in report['paragraphs'] if p['style']=='P_Message_Body')
  # New manuscript content and added contributors may legitimately change pagination.
  # Equality is against the new immutable DOCX, never against an obsolete page layout.
  assert len(report['source_formatting'])==3
  assert [f['source_paragraph'] for f in report['source_formatting'] if f['kind']=='centered-title']==[m['source_paragraph'] for m in mapping['centered_titles']]
  assert all(f['centered'] for f in report['source_formatting'] if f['kind']=='centered-title')
  underline=next(f for f in report['source_formatting'] if f['kind']=='double-underline');assert underline['text']=='word' and underline['end']-underline['start']==4
  assert underline['stroke_style'] in t['double_underline']['stroke_style_candidates']

 else:assert [e['name'] for e in report['entries']]==['邵珠瑜','刘慧颖（昼温）','刘洋（笠原 JunE）']
 reader=PdfReader(pdf);assert len(reader.pages)==report['pages'];bottoms=[];rect_count=0
 with pdfplumber.open(pdf) as doc:
  for i,page in enumerate(doc.pages):
   native=reader.pages[i];trim=native.trimbox;ox=float(trim.left);oy=float(native.mediabox.top)-float(trim.top);pt=72/25.4
   assert abs(float(trim.width)/pt-185)<.05 and abs(float(trim.height)/pt-260)<.05
   top=41 if i==0 else 23
   chars=[c for c in page.chars if oy+(top-3)*pt<=c['top'] and c['bottom']<=oy+243*pt]
   expected=''.join(l['text'].replace('\r','') for p in report['paragraphs'] for l in p['lines'] if l['page_index']==i+1)
   assert Counter(''.join(c['text'] for c in chars))==Counter(expected),'PDF glyph mismatch page '+str(i+1)
   # All header characters are inspected in exported PDF coordinates, not just DOM assertions.
   for e in [e for e in report['entries'] if e['header']['page_index']==i+1]:
    h=e['header'];matching=[]
    for key,color in [('rect_mm',h['primary_rgb']),('shadow_rect_mm',h['shadow_rgb'])]:
     y,x,b,right=h[key];rs=[q for q in page.rects if abs(q['x0']-(x*pt+ox))<.3 and abs(q['top']-(y*pt+oy))<.3]
     assert len(rs)==1 and rs[0]['fill'] and not rs[0]['stroke'];rgb=rs[0]['non_stroking_color'];assert all(abs(a-v/255)<.01 for a,v in zip(rgb,color));rect_count+=1
    assert (h['role_start_pt']-h['name_end_pt'])/pt>=3
    role_x=h['rect_mm'][1]*pt+t['name_padding_mm'][1]*pt+(h['role_start_pt']-h['name_start_pt'])+ox
    role=[c for c in chars if abs(c['x0']-role_x)<.2 and (h['rect_mm'][0]-4)*pt+oy<=c['top']<=(h['rect_mm'][2]+3)*pt+oy]
    assert role and abs(role[0]['size']-t['styles']['P_Message_Header']['size_pt'])<.05
    assert 'Sans' in role[0]['fontname'] and 'Medium' in role[0]['fontname'],role[0]['fontname']
    name_x=h['rect_mm'][1]*pt+t['name_padding_mm'][1]*pt+ox
    names=[c for c in chars if abs(c['x0']-name_x)<.2 and (h['rect_mm'][0]-5)*pt+oy<=c['top']<=(h['rect_mm'][2]+2)*pt+oy]
    assert names and 'Serif' in names[0]['fontname'] and 'SemiBold' in names[0]['fontname'],names
   if not sample:
    for fmt in [f for f in report['source_formatting'] if f['kind']=='centered-title' and f['lines'][0]['page_index']==i+1]:
     native_line=fmt['lines'][0];f=report['frames'][native_line['frame_index']]
     glyphs=[c for c in page.chars if abs(page.height-c['matrix'][5]-(oy+native_line['baseline_pt']))<.2 and f['bounds_mm'][1]*pt+ox-.2<=c['x0']<=f['bounds_mm'][3]*pt+ox+.2]
     assert ''.join(c['text'] for c in glyphs)==fmt['text'],'Centered title PDF text mismatch'
     actual=(min(c['x0'] for c in glyphs)+max(c['x1'] for c in glyphs))/2
     expected_center=(f['bounds_mm'][1]+f['bounds_mm'][3])*pt/2+ox
     assert abs(actual-expected_center)<.5,'Title not geometrically centered in exported PDF'
    for fmt in [f for f in report['source_formatting'] if f['kind']=='double-underline' and f['line']['page_index']==i+1]:
     left=fmt['x1_mm']*pt+ox;right=fmt['x2_mm']*pt+ox;baseline=fmt['baseline_mm']*pt+oy
     strokes=[l for l in page.lines if abs(l['x0']-left)<.2 and abs(l['x1']-right)<.2 and baseline<l['top']<baseline+3]
     assert len(strokes)==2 and abs(strokes[0]['top']-strokes[1]['top'])>.3,'Actual PDF must contain two separate lines under word only'
   local=[]
   for f in [f for f in report['frames'] if f['page_index']==i+1]:
    part=[c for c in chars if f['bounds_mm'][1]*pt+ox-1<=(c['x0']+c['x1'])/2<=f['bounds_mm'][3]*pt+ox+1]
    if not sample:assert part,'Unused column'
    blank=round(240-(max(c['bottom'] for c in part)-oy)/pt,2) if part else 217
    local.append(blank)
    if not sample and i<report['pages']-2:assert blank<45,'New large whitespace'
   bottoms.append(local)
   for font in native['/Resources'].get('/Font',{}).get_object().values():
    font=font.get_object()
    for descendant in font.get('/DescendantFonts',[font]):assert any(k in descendant.get_object()['/FontDescriptor'].get_object() for k in ('/FontFile','/FontFile2','/FontFile3'))
 paths=render(pdf,140);w,ht=390,570;sheet=Image.new('RGB',(w*3,ht*((len(paths)+2)//3)),'#ddd');d=ImageDraw.Draw(sheet)
 for i,path in enumerate(paths):
  with Image.open(path) as im:
   im=im.convert('RGB');im.thumbnail((375,535));x=i%3*w+7;y=i//3*ht+25;sheet.paste(im,(x,y));d.text((x,y-17),f'Page {i+1}',fill='black')
 sheet.save(OUT/('SAMPLES_CONTACT.png' if sample else 'SHAN_MESSAGES_OVERPRINT_CONTACT.png'))
 compare(report,pdf,'_SAMPLE' if sample else '')
 if not sample:
  entry=next(e for e in report['entries'] if e['name']=='姜福铭');panels=[];dpi=180;ppm=dpi/25.4;flow=render(pdf,dpi)
  for fi in entry['frames']:
   f=report['frames'][fi];x=f['bounds_mm'][1]-1;y=f['bounds_mm'][0]-2
   if fi==entry['header']['frame_index']:y=entry['header']['rect_mm'][0]-3
   with Image.open(flow[f['page_index']-1]) as im:crop=im.crop(tuple(round(v*ppm) for v in (x+3,y+3,x+75+3,min(242,f['bounds_mm'][2]+2)+3))).convert('RGB')
   panels.append((f"Page {f['page_index']} / {'L' if f['column']==0 else 'R'}",crop))
  canvas=Image.new('RGB',(sum(im.width+15 for _,im in panels),max(im.height for _,im in panels)+35),'#e5e3df');d=ImageDraw.Draw(canvas);x=5
  for label,im in panels:d.text((x,8),label,fill='black');canvas.paste(im,(x,30));x+=im.width+15
  canvas.save(OUT/'SHAN_MESSAGES_LONG_FLOW.png')
 if not sample:
  detail=render(pdf,360);ppm=360/25.4
  for index,fmt in enumerate(report['source_formatting']):
   if fmt['kind']=='centered-title':
    line=fmt['lines'][0];f=report['frames'][line['frame_index']];baseline=line['baseline_pt']/ (72/25.4)
    box=(f['bounds_mm'][1]-1,baseline-12,f['bounds_mm'][3]+1,baseline+13);page_index=line['page_index'];stem='TITLE_'+str(index+1)
   else:
    box=(fmt['x1_mm']-2,fmt['baseline_mm']-6,fmt['x2_mm']+16,fmt['baseline_mm']+8);page_index=fmt['line']['page_index'];stem='WORD_DOUBLE_UNDERLINE'
   with Image.open(detail[page_index-1]) as im:im.crop(tuple(round((v+3)*ppm) for v in box)).save(OUT/('SHAN_MESSAGES_'+stem+'.png'))
 proof={'status':'PASS','native_version':report['native_version'],'pages':report['pages'],'people':report['people'],'source_paragraphs':report['source_paragraphs'],'source_sha256':EXPECTED,'paragraph_equality':'Exact source reconstruction; header name TAB role reversed, terminal CR only; no body normalization','pdf_glyphs':'Exact per-page multiset from native visible lines','name_plates':rect_count,'name_sizes_pt':sorted(set(e['header']['name_size_pt'] for e in report['entries'])),'roles_pt':t['styles']['P_Message_Header']['size_pt'],'centering':'Native glyph centers, PDF role size/font and no-overlap verified','body_size_leading':'9.4/15.5 unchanged','bottom_blank_mm':bottoms,'all_pages_rendered':len(paths),'visual_review':'PENDING_AGENT_INSPECTION','overset':False,'sample':sample,'centered_titles':0 if sample else 2,'word_double_underline_pdf_lines':0 if sample else 2}
 write(OUT/('SAMPLE_VALIDATION.json' if sample else 'VALIDATION.json'),proof);print(json.dumps(proof,ensure_ascii=False))
if __name__=='__main__':check(len(sys.argv)>1 and sys.argv[1]=='sample')
