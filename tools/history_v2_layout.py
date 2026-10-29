"""History image revision: shared Skill geometry, source-preserving display map."""
from pathlib import Path
import copy,hashlib,json,math,re,sys
from PIL import Image,ImageDraw,ImageOps

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/history_v2'
SKILL=Path('D:/Codex/skills/indesign-publication-production')
sys.path.insert(0,str(SKILL/'scripts'))
from image_layout import calculate,inspect_image,validate_geometry

def read(p):return json.loads((ROOT/p).read_text('utf-8-sig'))
def write(p,d):(ROOT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n','utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def prepare():
 data=read('content/HISTORY_V2_IMPORT.json');groups={};captions={};byid={b['id']:b for b in data['blocks']}
 for b in data['blocks']:
  if b.get('style','').startswith('P_History_Caption'):
   display=re.sub(r'[；;]\s*(?=(?:左图|右图|右上图|右下图)[：:])','\n\n',b['text'])
   if display!=b['text']:captions[b['id']]={'source':b['text'],'display':display,'transform':'Only left/right separator semicolon -> two forced line breaks (one blank caption line)'}
  if b['type']!='media':continue
  items=b['items'];inspected={a['id']:inspect_image(ROOT/a['file']) for a in items}
  for a in items:
   info=inspected[a['id']];assert info['sha256']==a['sha256']
   with Image.open(ROOT/a['file']) as original:orientation=original.getexif().get(274,1)
   if orientation!=1:
    target=ROOT/'assets/history_v2_layout'/('orientation_'+a['id']+'.png');target.parent.mkdir(exist_ok=True)
    with Image.open(ROOT/a['file']) as original:
     normalized=ImageOps.exif_transpose(original)
     if not target.exists():normalized.save(target,'PNG')
     with Image.open(target) as existing:assert normalized.convert('RGBA').tobytes()==existing.convert('RGBA').tobytes()
    info=inspect_image(target);info['original']={'file':a['file'],'sha256':a['sha256'],'exif_orientation_normalized':orientation};inspected[a['id']]=info
   if info['alpha_padding']:
    target=ROOT/'assets/history_v2_layout'/('alpha_trim_'+a['id']+'.png')
    if not target.exists():inspect_image(ROOT/a['file'],target)
    with Image.open(ROOT/a['file']) as original,Image.open(target) as trimmed:assert original.convert('RGBA').crop(info['content_bounds_px']).tobytes()==trimmed.convert('RGBA').tobytes()
    info=inspect_image(target);info['original']={'file':a['file'],'sha256':a['sha256'],'alpha_trim_bounds':inspected[a['id']]['content_bounds_px']};inspected[a['id']]=info
   info['path']=Path(info['path']).relative_to(ROOT).as_posix()
  if b['layout']=='autograph_grid':
   width=146;gap=2;cw=(width-2*gap)/3;ch=cw*388/690;frames=[]
   for i,a in enumerate(items):
    x=(i%3)*(cw+gap);y=(i//3)*(ch+gap)
    frames.append({'image_id':a['id'],'x':x,'y':y,'width':cw,'height':ch,'graphic':{'x':x,'y':y,'width':cw,'height':ch},'fit_mode':'STRETCH' if i==6 else 'PROPORTIONAL','source':inspected[a['id']]})
   groups[b['id']]={'kind':'NAMED_EXCEPTION','layout_mode':'USER_AUTOGRAPH_3X3','width':width,'height':3*ch+2*gap,'frames':frames,'exception':'User explicitly requested nonuniform stretch of lower-left signature early_rId56; all nine frames now share one size; other eight sources have matching landscape ratios'}
   continue
  if b['layout']=='flyer_two_photos':
   frames=[];gap=2;cw=35.5;poster=next(a for a in items if a['relationship']=='rId24');photos=[a for a in items if a is not poster]
   positions=[(poster,0,0,cw,cw*poster['pixel_height']/poster['pixel_width'])];y=0
   for a in photos:
    h=cw*a['pixel_height']/a['pixel_width'];positions.append((a,cw+gap,y,cw,h));y+=h+gap
   for a,x,y,w,h in positions:
    frames.append({'image_id':a['id'],'x':x,'y':y,'width':w,'height':h,'graphic':{'x':x,'y':y,'width':w,'height':h},'fit_mode':'PROPORTIONAL','source':inspected[a['id']]})
   groups[b['id']]={'kind':'NAMED_EXCEPTION','layout_mode':'SOURCE_FLYER_TWO_PHOTOS','width':73,'height':max(f['y']+f['height'] for f in frames),'frames':frames,'exception':'Original three-image table: one complete flyer plus two complete photographs; five-mode calculator accepts one/two images only; source order and no distortion retained'}
   continue
  images=[]
  for a in items:
   c=a['crop'];info=inspected[a['id']];images.append({'id':a['id'],'width_px':info['width_px']*(1-c['l']-c['r']),'height_px':info['height_px']*(1-c['t']-c['b'])})
  request={'column_width':73,'available_height':110,'gap':2,'images':images}
  # These text-led mixed units protect the complete portrait poster. Its paired
  # photograph takes the proportional crop; no source pixels are rewritten.
  if len(items)==2 and (images[0]['width_px']>=images[0]['height_px'])!=(images[1]['width_px']>=images[1]['height_px']):
   portrait=next(i for i in images if i['width_px']<i['height_px']);request['height']=(73-2)/3*portrait['height_px']/portrait['width_px']
   if b['id']=='early_g38':request.pop('height') # User explicitly accepts edge crops to prioritize standard geometry.
  if b['id']=='early_g16':request['height']=35.5*images[0]['height_px']/images[0]['width_px']
  if b['id']=='approved_tail_g58':request['height']=53
  plan=calculate(request)
  for a,f in zip(items,plan['frames']):
   c=a['crop'];g=f['graphic'];vw=g['width'];vh=g['height'];fw=vw/(1-c['l']-c['r']);fh=vh/(1-c['t']-c['b'])
   f['graphic']={'x':g['x']-fw*c['l'],'y':g['y']-fh*c['t'],'width':fw,'height':fh}
   if b['id']=='approved_tail_g58':
    f['graphic']['y']=f['y']+f['height']-fh
    f['crop_or_stretch_policy']['crop_focus']='BOTTOM: crop blank upper wall; preserve full award banners and floor edge'
   f['source']=dict(inspected[a['id']],orientation=f['orientation'])
  plan.update(kind='FIVE_MODE',width=73,caption_block=b['caption_block'],caption_validation='Native story caption measured separately from the anchored image-only group')
  groups[b['id']]=plan
  if b['id']=='approved_tail_g58':plan['height_override_reason']='Bounded tail treatment: remove upper blank wall from award-banner photo; keep default 2/3-column width and final activity text/poster on the same page'
 result={'version':'HISTORY_V2_IMAGE_REVISION_R1','skill_file':str(SKILL/'SKILL.md'),'calculator_sha256':sha(SKILL/'scripts/image_layout.py'),'source_import_sha256':sha(ROOT/'content/HISTORY_V2_IMPORT.json'),'column_width_mm':73,'image_gap_mm':2,'caption_body_gap_mm':2,'crop_authorization':'User explicitly confirmed: 允许裁切边缘，优先保持等宽等高','caption_separation':'one blank line between left/right descriptions; semicolon removed only at this boundary','captions':captions,'groups':groups}
 write('content/HISTORY_V2_LAYOUT.json',result)
 tokens=read('spec/HISTORY_V2_TOKENS.json')
 for name,d in tokens['paragraph_styles'].items():
  if name.startswith('P_History_Caption'):d['space_after_mm']=2
 write('spec/HISTORY_V2_TOKENS.json',tokens)
 print('Prepared',len(groups),'groups;',len(captions),'caption display transforms; source text and files unchanged')

def preview():
 layout=read('content/HISTORY_V2_LAYOUT.json');pairs=[(k,v) for k,v in layout['groups'].items() if len(v['frames'])==2];folder=OUT/'geometry_crop_review';folder.mkdir(exist_ok=True)
 for start in range(0,len(pairs),6):
  canvas=Image.new('RGB',(1500,1800),'#eee');draw=ImageDraw.Draw(canvas)
  for n,(key,p) in enumerate(pairs[start:start+6]):
   ox=n%2*750;oy=n//2*600;draw.text((ox+15,oy+8),key+' '+p['layout_mode'],fill='black');scale=min(9,540/p['frames'][0]['height']);x0=ox+15;y0=oy+38
   for f in p['frames']:
    im=Image.open(ROOT/f['source']['path']).convert('RGB');g=f['graphic'];left=(f['x']-g['x'])/g['width']*im.width;top=(f['y']-g['y'])/g['height']*im.height;right=left+f['width']/g['width']*im.width;bottom=top+f['height']/g['height']*im.height
    im=im.crop((left,top,right,bottom));im=im.resize((round(f['width']*scale),round(f['height']*scale)))
    canvas.paste(im,(round(x0+f['x']*scale),round(y0+f['y']*scale)))
  canvas.save(folder/f'pairs-{start+1}.jpg',quality=95)
 print('Crop review previews:',folder)

def validate():
 layout=read('content/HISTORY_V2_LAYOUT.json');runtime=read('exports/history_v2/HISTORY_RUNTIME.json');byid={i['id']:i for i in runtime['images']};results=[]
 for key,plan in layout['groups'].items():
  records=[byid[f['image_id']] for f in plan['frames']];origin=records[0]['column_origin_x_mm'];oy=min(r['frame_mm']['y'] for r in records)
  actual={'origin':'InDesign_DOM','units':'mm','items':[],'captions':[],'anchored':True,'reserved_height_mm':records[0]['anchor_height_mm']}
  for f,r in zip(plan['frames'],records):
   box=lambda key:{**r[key],'x':r[key]['x']-origin,'y':r[key]['y']-oy}
   actual['items'].append({'image_id':r['id'],'frame':box('frame_mm'),'graphic':box('graphic_mm'),'source_path':str((ROOT/r['linked_file']).resolve()),'page_id':r['page_id'],'link_missing':r['link_status']!='NORMAL','effective_ppi':r['effective_ppi'],'rotation':r['rotation'],'shear':r['shear']})
  if plan['kind']=='FIVE_MODE':
   result=validate_geometry(plan,actual,.5);assert result['valid'],(key,result)
  else:
   # Named multi-image exceptions retain separate assertions and are not
   # described as passing the ordinary one/two-image default contract.
   assert len({r['page_id'] for r in records})==1
   for f,r in zip(plan['frames'],records):
    assert abs(r['width_mm']-f['width'])<.1 and abs(r['height_mm']-f['height'])<.1
    assert sha(ROOT/r['file'])==r['source_sha256']
    ratio=max(r['graphic_mm']['width']/f['source']['width_px']/(r['graphic_mm']['height']/f['source']['height_px']),r['graphic_mm']['height']/f['source']['height_px']/(r['graphic_mm']['width']/f['source']['width_px']))
    if f['fit_mode']!='STRETCH':assert ratio<1.001
   for i,a in enumerate(records):
    for b in records[i+1:]:
     aa=a['frame_mm'];bb=b['frame_mm'];assert min(aa['x']+aa['width'],bb['x']+bb['width'])-max(aa['x'],bb['x'])<.01 or min(aa['y']+aa['height'],bb['y']+bb['height'])-max(aa['y'],bb['y'])<.01,'Overlapping special-group pictures '+key
   result={'valid':True,'policy':'NAMED_EXCEPTION','reason':plan['exception'],'warnings':[]}
  results.append({'block':key,'mode':plan['layout_mode'],'check':result})
 for p in runtime['paragraphs']:
  if p['id'] in layout['captions']:assert p['display_text']==layout['captions'][p['id']]['display']
  if p['style'].startswith('P_History_Caption'):assert abs(p['space_after_pt']-2*72/25.4)<.01
 write('exports/history_v2/IMAGE_GEOMETRY_CHECK.json',{'status':'PASS','groups':results,'source_images_unchanged':True,'caption_display_transforms':layout['captions'],'caption_body_gap_mm':2,'native_evidence':'Actual rectangle/graphic bounds, effective PPI, link paths and anchor bounds read after recomposition','visual':'PENDING'})
 print('PASS geometry:',len(results),'groups; same-size pairs; 2:1 mixed pairs; separate named 3-image and user-stretched signature exceptions')

if __name__=='__main__':{'prepare':prepare,'preview':preview,'validate':validate}[sys.argv[1]]()
