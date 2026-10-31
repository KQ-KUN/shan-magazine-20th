"""Bind the protected R3 prefix to the audited, native-readable 2020+ Word tail."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
from PIL import Image,ImageOps
import copy,hashlib,io,json,re,sys
from history_full_audit import ROOT,WORK,OUT,FULL,INPUT,N,W,text,visible,read,dump,sha

SKILL=Path('D:/Codex/skills/indesign-publication-production')
sys.path.insert(0,str(SKILL/'scripts'))
from image_layout import inspect_image,calculate

def prepare():
 audit=read(OUT/'WORD_AUDIT.json');assert sha(FULL)==audit['audited_sha256'];assert audit['word_visual']=='PASS'
 current=read(ROOT/'content/HISTORY_V2_IMPORT.json');prefix=[copy.deepcopy(b) for b in current['blocks'] if b['origin']=='early']
 blocks=list(prefix);notes=[];groupno=sum(b['type']=='media' for b in prefix);imagecount=sum(len(b.get('items',[])) for b in prefix)
 oldlayout=read(ROOT/'content/HISTORY_V2_LAYOUT.json');layout=copy.deepcopy(oldlayout)
 layout['version']='HISTORY_FULL_20261030';layout['groups']={k:v for k,v in layout['groups'].items() if k.startswith('early_')}
 assets=ROOT/'assets/history_full';assets.mkdir(parents=True,exist_ok=True)
 inv=read(INPUT);expected=[rid for p in inv['paragraphs'][inv['tail_boundary']:] for rid in p['images']];sourcez=ZipFile(inv['source'])
 with ZipFile(FULL) as z:
  doc=E.fromstring(z.read('word/document.xml'));body=doc.find(W+'body');edge=next(p for p in body if text(p)=='2020年——2021年');tail=[n for n in list(body)[list(body).index(edge):] if n.tag==W+'p'];mapping=audit['tail_map'];assert len(tail)==len(mapping)
  rels={n.get('Id'):n.get('Target') for n in E.fromstring(z.read('word/_rels/document.xml.rels'))}
  foot={n.get(W+'id'):'\r'.join(text(p) for p in n.findall(W+'p')) for n in E.fromstring(z.read('word/footnotes.xml')) if n.get(W+'type') is None}
  reference_ids=doc.xpath('.//w:footnoteReference/@w:id',namespaces=N);note_ids={rid:str(i) for i,rid in enumerate(reference_ids)};assert len(note_ids)==5
  for b in prefix:
   for note in b.get('footnotes',[]):assert note['text']==foot[reference_ids[int(note['source_id'])]]
  next_picture=0;year=None
  for node,m in zip(tail,mapping):
   value=visible(node);assert value==m['text'],('Word tail mapping changed',m['original_all_paragraph'])
   source_index=m['original_all_paragraph'];draws=node.findall('.//w:drawing',N)
   if draws:
    groupno+=1;items=[]
    for draw in draws:
     rid=draw.find('.//a:blip',N).get('{'+N['r']+'}embed');target=rels[rid];raw=z.read('word/'+target);original=expected[next_picture];next_picture+=1
     assert raw==sourcez.read('word/'+inv['rels'][original]),('Supplied tail image bytes/order changed',original)
     filename='full_'+original+'_'+Path(target).name;path=assets/filename
     if path.exists():assert path.read_bytes()==raw
     else:path.write_bytes(raw)
     with Image.open(io.BytesIO(raw)) as im:width,height=im.size
     cropnode=draw.find('.//a:srcRect',N);crop={k:float(cropnode.get(k,'0'))/100000 if cropnode is not None else 0 for k in ['t','b','l','r']}
     items.append({'id':'full_'+original,'relationship':original,'file':path.relative_to(ROOT).as_posix(),'sha256':sha(path),'pixel_width':width,'pixel_height':height,'crop':crop,'caption':''})
    blocks.append({'id':'full_g'+str(groupno),'type':'media','origin':'full_tail','source_paragraph':source_index,'items':items,'layout':'row','span_columns':1,'year':year});imagecount+=len(items)
   if value.strip():
    offset=[];refs=[]
    for n in node.iter():
     if n.tag==W+'t':offset.append(n.text or '')
     elif n.tag==W+'br':offset.append('\n')
     elif n.tag==W+'footnoteReference':
      rid=n.get(W+'id');refs.append({'source_id':note_ids[rid],'word_reference_id':rid,'offset_utf16':len(''.join(offset).encode('utf-16-le'))//2,'text':foot[rid]})
    styleids=node.xpath('./w:pPr/w:pStyle/@w:val',namespaces=N)
    if styleids==['2'] or re.fullmatch(r'(?:20\d{2}年——20\d{2}年|2026年8月至今)',value):style='P_History_Year';year=value
    elif styleids in (['3'],['a3']) or value.startswith(('左图：','右图：')):style='P_History_Caption_Full'
    elif value.endswith('管理层名单如下：'):style='P_History_Roster_Intro'
    elif re.match(r'^(?:会长|副会长|财务|宣传|中心|兴隆山|软件园|洪家楼|学术|写作|外联|团支书|总顾问)[^。]*：',value) and len(value)<110:style='P_History_Roster'
    elif source_index in (907,908):style='P_History_Editorial'
    else:style='P_History_Event'
    blocks.append({'id':'full_p'+str(source_index),'type':'text','origin':'full_tail','source_paragraph':source_index,'text':value,'style':style,'footnotes':refs,'year':year})
  assert next_picture==len(expected)==76
 for i,b in enumerate(blocks):
  if b['origin']!='full_tail' or b['type']!='media':continue
  following=blocks[i+1] if i+1<len(blocks) else None
  assert following and following.get('style')=='P_History_Caption_Full',('Unmapped new caption',b['id'])
  b['caption_block']=following['id'];b['description_block']=None
  for item in b['items']:item['caption']=following['text']
  inspected=[]
  for item in b['items']:
   p=ROOT/item['file'];info=inspect_image(p)
   with Image.open(p) as im:orient=im.getexif().get(274,1)
   if orient!=1 or info['alpha_padding']:
    target=ROOT/'assets/history_full_layout'/('normalized_'+item['id']+'.png');target.parent.mkdir(parents=True,exist_ok=True)
    with Image.open(p) as im:
     derivative=ImageOps.exif_transpose(im)
     # Only zero-alpha outside pixels can be removed automatically.
     if derivative.mode=='RGBA' and derivative.getchannel('A').getbbox():derivative=derivative.crop(derivative.getchannel('A').getbbox())
     if not target.exists():derivative.save(target,'PNG')
     with Image.open(target) as prior:assert derivative.convert('RGBA').tobytes()==prior.convert('RGBA').tobytes()
    info=inspect_image(target);info['original']={'file':item['file'],'sha256':item['sha256'],'exif_orientation_normalized':orient}
   info['path']=Path(info['path']).relative_to(ROOT).as_posix();inspected.append(info)
  images=[]
  for item,info in zip(b['items'],inspected):
   c=item['crop'];images.append({'id':item['id'],'width_px':info['width_px']*(1-c['l']-c['r']),'height_px':info['height_px']*(1-c['t']-c['b'])})
  request={'column_width':73,'available_height':110,'gap':2,'images':images}
  plan=calculate(request)
  for item,info,f in zip(b['items'],inspected,plan['frames']):
   c=item['crop'];g=f['graphic'];fw=g['width']/(1-c['l']-c['r']);fh=g['height']/(1-c['t']-c['b']);f['graphic']={'x':g['x']-fw*c['l'],'y':g['y']-fh*c['t'],'width':fw,'height':fh};f['source']=dict(info,orientation=f['orientation'])
  plan.update(kind='FIVE_MODE',width=73,inline_clearance_mm=0,caption_block=b['caption_block']);layout['groups'][b['id']]=plan
  if b['id']=='full_g73':
   # The long contest poster has QR codes at its bottom edge. Keep both
   # equal-sized frames while retaining each entire supplied graphic.
   plan['kind']='NAMED_EXCEPTION';plan['exception']='Equal portrait frames with proportional contain to preserve poster QR codes and all brochure text'
   for item,f in zip(b['items'],plan['frames']):
    info=f['source'];c=item['crop'];iw=info['width_px']*(1-c['l']-c['r']);ih=info['height_px']*(1-c['t']-c['b']);scale=min(f['width']/iw,f['height']/ih);gw=info['width_px']*scale;gh=info['height_px']*scale
    f['fit_mode']='CONTAIN';f['graphic']={'x':f['x']+(f['width']-iw*scale)/2-gw*c['l'],'y':f['y']+(f['height']-ih*scale)/2-gh*c['t'],'width':gw,'height':gh}
 data={'version':'HISTORY_FULL_20261030','source':FULL.relative_to(ROOT).as_posix(),'source_sha256':sha(FULL),'first_page':14,'blocks':blocks,'images':imagecount,'early_images':94,'new_tail_images':76,'native_footnotes':5,'source_texts':[{'id':b['id'],'text':b['text'],'footnotes':b.get('footnotes',[])} for b in blocks if b['type']=='text'],'protected_prefix_source':current['source'],'protected_prefix_sha256':current['source_sha256'],'user_confirmations':audit['user_confirmations']}
 assert len({b['id'] for b in blocks})==len(blocks)
 assert imagecount==170 and sum(len(b.get('footnotes',[])) for b in blocks)==5
 assert all('于淼' not in b.get('text','') and '楚修红' not in b.get('text','') for b in blocks)
 dump(ROOT/'content/HISTORY_FULL_IMPORT.json',data);layout['source_import_sha256']=sha(ROOT/'content/HISTORY_FULL_IMPORT.json');layout['new_tail_caption_body_gap_mm']=15*25.4/72;dump(ROOT/'content/HISTORY_FULL_LAYOUT.json',layout)
 tokens=read(ROOT/'spec/HISTORY_V2_TOKENS.json');tokens['version']='HISTORY_FULL_20261030';tokens['paragraph_styles']['P_History_Caption_Full']=dict(tokens['paragraph_styles']['P_History_Caption'],space_after_mm=15*25.4/72)
 tokens['paragraph_styles']['P_History_Editorial']=dict(tokens['paragraph_styles']['P_History_Event'],size_pt=8.5,leading_pt=12)
 dump(ROOT/'spec/HISTORY_FULL_TOKENS.json',tokens)
 dump(OUT/'SOURCE_INTEGRITY.json',{'status':'PASS','source_sha256':sha(FULL),'protected_prefix_blocks':len(prefix),'blocks':len(blocks),'text_blocks':len(data['source_texts']),'media_groups':len(layout['groups']),'images':170,'new_tail_images':76,'native_footnotes':5,'source_order':'Protected prefix and new audited tail in original semantic order; inherited R3 gallery move kept in display sidecar','all_tail_media_caption_bound':True})
 print('PASS full source:',len(blocks),'blocks;',imagecount,'images; 5 native footnotes;',len(layout['groups']),'geometry groups')

if __name__=='__main__':prepare()
