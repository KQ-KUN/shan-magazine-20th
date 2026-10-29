"""Prepare the approved early-history slice and preserve the approved old tail."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
from PIL import Image
from collections import Counter
import copy,csv,hashlib,io,json,re,subprocess

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'exports/history_v2'
WORK=ROOT.parent; PREVIOUS=WORK/'交付文件/会史审校_至2019-2020_20261029/山东大学学生科幻协会会史_第二版_审校排版至2019-2020.docx'
FULL=ROOT/'manuscripts/source/history/会史第二版_审校至2019-2020_最终姓名口径.docx'
N={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'};W='{'+N['w']+'}'
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(p,v):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def text(p):return ''.join(p.xpath('.//w:t/text()',namespaces=N))
def patch_text(p,old,new):
 ts=p.xpath('.//w:t',namespaces=N);s=text(p);assert old in s
 start=s.index(old);stop=start+len(old);offset=0;insert=False
 for n in ts:
  value=n.text or '';a=max(0,start-offset);b=min(len(value),stop-offset)
  if a<b:n.text=value[:a]+(new if not insert else '')+value[b:];insert=True
  offset+=len(value)
def names():
 OUT.mkdir(parents=True,exist_ok=True)
 z=ZipFile(PREVIOUS);d=E.fromstring(z.read('word/document.xml'));changes=[]
 for i,p in enumerate(d.findall('w:body/w:p',N)):
  old=text(p)
  if '于淼' in old:patch_text(p,'于淼','余淼')
  if text(p)=='会长：余淼':patch_text(p,'会长：余淼','2017级会长：余淼')
  if '余淼（2017-2018）' in text(p):patch_text(p,'余淼（2017-2018）','余淼（2017级会长）')
  if '楚修红' in text(p):patch_text(p,'楚修红','楚休红')
  if old!=text(p):changes.append({'paragraph':i,'before':old,'after':text(p),'reason':'用户最终确认：余淼／2017级会长；楚休红'})
 assert len(changes)==4,changes
 FULL.parent.mkdir(parents=True,exist_ok=True)
 with ZipFile(FULL,'w') as out:
  for item in z.infolist():out.writestr(copy.copy(item),E.tostring(d,encoding='UTF-8',xml_declaration=True,standalone=True) if item.filename=='word/document.xml' else z.read(item.filename))
 # Exact single-name edit to the active Messages DOCX; retain all other content.
 msg=ROOT/'manuscripts/source/messages/寄语（24号修订版）.docx';mz=ZipFile(msg);md=E.fromstring(mz.read('word/document.xml'));mp=md.findall('w:body/w:p',N)
 assert text(mp[63])=='2017级会长 余淼'
 if text(mp[49])=='2015级幻协重要成员、赞助人 楚修红':
  backup=OUT/'MESSAGES_BEFORE_FINAL_NAMES.docx'
  if not backup.exists():backup.write_bytes(msg.read_bytes())
  patch_text(mp[49],'楚修红','楚休红')
  entries=[(copy.copy(item),mz.read(item.filename)) for item in mz.infolist()];mz.close()
  with ZipFile(msg,'w') as out:
   for item,value in entries:out.writestr(item,E.tostring(md,encoding='UTF-8',xml_declaration=True,standalone=True) if item.filename=='word/document.xml' else value)
 assert text(mp[49])=='2015级幻协重要成员、赞助人 楚休红'
 write(OUT/'FINAL_NAME_CORRECTIONS.json',{'history_source':str(FULL.relative_to(ROOT)),'history_sha256':digest(FULL),'history_changes':changes,'messages_source_sha256':digest(msg),'messages_change':{'paragraph':50,'before':'2015级幻协重要成员、赞助人 楚修红','after':text(mp[49])},'messages_yumiao':text(mp[63]),'historical_other_roles':'保留2016年干事及2017年中心校区负责人的历史任职，不将它们误写成当年的会长身份'})
 # Update the existing exact-source validator with the one additional approved correction.
 helper=ROOT/'tools/messages_source.py';s=helper.read_text(encoding='utf-8')
 s=re.sub(r"EXPECTED='[a-f0-9]{64}'",f"EXPECTED='{digest(msg)}'",s,count=1)
 s=s.replace(".replace('2017级中心校区会长 于淼','2017级会长 余淼') for p in original]",".replace('2017级中心校区会长 于淼','2017级会长 余淼').replace('2015级幻协重要成员、赞助人 楚修红','2015级幻协重要成员、赞助人 楚休红') for p in original]")
 marker=" mapping['source_corrections'].append({'source_paragraph':50,'original':'楚修红','replacement':'楚休红','authorization':'User final confirmed name: 楚休红'})"
 if marker not in s:s=s.replace(" mapping['centered_titles']=centered;mapping['double_underlines']=underlines",marker+"\n mapping['centered_titles']=centered;mapping['double_underlines']=underlines")
 helper.write_text(s,encoding='utf-8')
 print('PASS name correction: history 4 paragraphs, Messages 1 name; Messages role already correct; source',digest(msg))

def prepare():
 z=ZipFile(FULL);d=E.fromstring(z.read('word/document.xml'));body=d.find(W+'body');ps=body.findall(W+'p')
 edge=next(p for p in ps if text(p)=='2020年——2021年');prefix=list(body)[:list(body).index(edge)]
 assert len([rid for node in prefix for rid in node.xpath('.//a:blip/@r:embed',namespaces=N)])==94
 assets=ROOT/'assets/history_v2';assets.mkdir(parents=True,exist_ok=True)
 rels={n.get('Id'):n.get('Target') for n in E.fromstring(z.read('word/_rels/document.xml.rels'))}
 footroot=E.fromstring(z.read('word/footnotes.xml'));footnotes={n.get(W+'id'):'\r'.join(text(p) for p in n.findall(W+'p')) for n in footroot}
 capcsv=list(csv.DictReader((WORK/'交付文件/会史审校_至2019-2020_20261029/HISTORY_IMAGE_CAPTION_AUDIT.csv').open(encoding='utf-8-sig')))
 capbyrid={r['relationship']:r['updated_caption'] for r in capcsv}
 blocks=[];source_texts=[];images=[];groupcount=0;year=None
 def content(p):
  parts=[];refs=[]
  for n in p.iter():
   if n.tag==W+'t':parts.append(n.text or '')
   elif n.tag==W+'tab':parts.append('\t')
   elif n.tag==W+'br' and n.get(W+'type')!='page':parts.append('\n')
   elif n.tag==W+'footnoteReference':refs.append({'source_id':n.get(W+'id'),'offset_utf16':len(''.join(parts).encode('utf-16-le'))//2,'text':footnotes[n.get(W+'id')]})
  return ''.join(parts),refs
 def addparagraph(p,origin,source_index,style=None):
  nonlocal year
  value,refs=content(p)
  if not value.strip():return
  originalstyle=p.xpath('./w:pPr/w:pStyle/@w:val',namespaces=N)
  if style is None:
   if originalstyle==['2']:style='P_History_Year'
   elif value=='山东大学学生科幻协会发展历史':style='P_Article_Title'
   elif value.startswith('第二版'):style='P_Metadata'
   elif originalstyle==['3']:style='P_History_Caption'
   elif value.endswith('管理层名单如下：'):style='P_History_Roster_Intro'
   elif re.match(r'^(?:2017级会长|会长|副会长|团支书|秘书|副秘书|事务|宣传|外联|通讯|财务|部长|中心|兴隆山|洪家楼|洪楼|趵突泉|软件园|干事|总会长|学术|策划|总顾问|山大幻协重要成员)[^。]*[：:&]',value) and len(value)<110:style='P_History_Roster'
   else:style='P_History_Event'
  if style=='P_History_Year':year=value
  block={'id':origin+'_p'+str(source_index),'type':'text','origin':origin,'source_paragraph':source_index,'text':value,'style':style,'footnotes':refs,'year':year}
  blocks.append(block);source_texts.append({'id':block['id'],'text':value,'footnotes':refs})
 def addgroup(node,origin,source_index,oldassets=None):
  nonlocal groupcount
  ds=node.findall('.//w:drawing',N)
  if not ds:return
  groupcount+=1;items=[]
  for draw in ds:
   rid=draw.find('.//a:blip',N).get('{'+N['r']+'}embed')
   if oldassets is None:
    target=rels[rid];raw=z.read('word/'+target);name='early_'+rid+'_'+Path(target).name
    p=assets/name;p.write_bytes(raw);im=Image.open(io.BytesIO(raw));pw,ph=im.size
    cropnode=draw.find('.//a:srcRect',N)
    crop={k:float(cropnode.get(k,'0'))/100000 if cropnode is not None else 0 for k in ['t','b','l','r']}
   else:
    a=oldassets[rid];p=ROOT/a['file'];pw=a['pixel_width'];ph=a['pixel_height'];crop=a['crop']
   item={'id':origin+'_'+rid,'file':p.relative_to(ROOT).as_posix(),'sha256':digest(p),'pixel_width':pw,'pixel_height':ph,'crop':crop,'relationship':rid,'caption':capbyrid.get(rid,'') if origin=='early' else ''}
   items.append(item);images.append(item)
  blocks.append({'id':origin+'_g'+str(groupcount),'type':'media','origin':origin,'source_paragraph':source_index,'items':items,'layout':'flyer_two_photos' if origin=='early' and set(x['relationship'] for x in items)=={'rId22','rId23','rId24'} else 'autograph_grid' if len(items)==9 else 'row','span_columns':2 if len(items)==9 else 1,'year':year})
 for node in prefix:
  if node.tag==W+'p':
   index=ps.index(node)
   if node.findall('.//w:drawing',N):addgroup(node,'early',index)
   if text(node):addparagraph(node,'early',index)
  elif node.tag==W+'tbl':addgroup(node,'early',171 if groupcount<20 else 290)
 # Append exactly the existing approved 2020+ article, never the unaudited new manuscript tail.
 oldaudit=json.loads((ROOT/'spec/HISTORY_SOURCE_AUDIT.json').read_text(encoding='utf-8'));oldz=ZipFile(ROOT/oldaudit['source_file']);old=E.fromstring(oldz.read('word/document.xml'));oldps=old.findall('w:body/w:p',N)
 oldmap=json.loads((ROOT/'content/HISTORY_IMPORT_MAP.json').read_text(encoding='utf-8'));oldrels={n.get('Id'):n.get('Target') for n in E.fromstring(oldz.read('word/_rels/document.xml.rels'))}
 oldassets={ 'rId'+str(i+4):a for i,a in enumerate(oldaudit['assets'])}
 start=next(i for i,p in enumerate(oldps) if text(p)=='2020年——2021年')
 for i,p in enumerate(oldps[start:],start):
  if p.findall('.//w:drawing',N):addgroup(p,'approved_tail',i+1,oldassets)
  value=text(p)
  if value:
   style=oldmap['paragraphs'][i]['style']
   if style in ['P_History_Media_Wide_Caption','P_History_Media_Wide','P_History_Media_Caption']:style='P_History_Caption' if re.search(r'^\d{4}年.*(海报|现场|合影)',value) else 'P_History_Event'
   if style in ['P_History_Caption_Wide']:style='P_History_Caption'
   addparagraph(p,'approved_tail',i+1,style)
 # Attach an actual following caption to each media group. Keep it as a story paragraph.
 for i,block in enumerate(blocks):
  if block['type']=='media':
   block['caption_block']=blocks[i+1]['id'] if i+1<len(blocks) and blocks[i+1].get('style')=='P_History_Caption' else None
   block['description_block']=blocks[i-1]['id'] if block['origin']=='approved_tail' and block['caption_block'] is None and i>0 and blocks[i-1]['type']=='text' else None
   if block['caption_block'] is None and block['origin']=='early':raise AssertionError(('Unmapped early caption',block))
 assert [b['text'] for b in blocks if b.get('style')=='P_History_Year'].count('2020年——2021年')==1
 assert len([a for a in images if a['id'].startswith('early_')])==94
 assert sorted(f['source_id'] for b in blocks for f in b.get('footnotes',[]))==['0','1','2']
 assert all('于淼' not in b.get('text','') and '楚修红' not in b.get('text','') for b in blocks)
 # Existing Parent, fonts and History styles are retained; new styles cover native notes/span media only.
 tokens=json.loads((ROOT/'spec/HISTORY_TOKENS.json').read_text(encoding='utf-8'));tokens.pop('tail_layout_file',None);tokens['max_pages']=300;tokens['version']='HISTORY_V2_AUDITED_PREFIX_AND_APPROVED_TAIL'
 tokens['paragraph_styles']['P_History_Footnote']={'family':'serif_cn','size_pt':7.5,'leading_pt':11,'first_line_indent_em':0,'space_after_mm':0,'keep_all_lines_together':False}
 tokens['paragraph_styles']['P_History_Roster_Intro']=dict(tokens['paragraph_styles']['P_History_Event'],keep_with_next=2,keep_all_lines_together=True)
 tokens['paragraph_styles']['P_History_Media_Span']=dict(tokens['paragraph_styles']['P_History_Media_Caption'])
 tokens['paragraph_styles']['P_History_Caption_Span']=dict(tokens['paragraph_styles']['P_History_Caption'])
 tokens['paragraph_styles']['P_History_Media_Caption']['keep_with_next']=1
 tokens['paragraph_styles']['P_History_Roster']['keep_with_next']=1
 tokens['paragraph_styles']['P_History_Event']['keep_first_lines']=2;tokens['paragraph_styles']['P_History_Event']['keep_last_lines']=2
 write(ROOT/'spec/HISTORY_V2_TOKENS.json',tokens)
 data={'source':FULL.relative_to(ROOT).as_posix(),'source_sha256':digest(FULL),'old_tail_source':oldaudit['source_file'],'old_tail_sha256':oldaudit['source_sha256'],'first_page':14,'blocks':blocks,'images':len(images),'early_images':94,'native_footnotes':3,'approved_tail_start_source_paragraph':start+1,'source_texts':source_texts}
 write(ROOT/'content/HISTORY_V2_IMPORT.json',data)
 write(OUT/'SOURCE_INTEGRITY.json',{'status':'PASS','full_source_sha256':digest(FULL),'blocks':len(blocks),'media_groups':sum(b['type']=='media' for b in blocks),'images':len(images),'native_footnotes':3,'early_prefix_boundary':'before 2020年——2021年','tail_source':oldaudit['source_file'],'tail_boundary':start+1,'all_tail_nonempty_paragraphs':sum(bool(text(p)) for p in oldps[start:]),'all_source_text_blocks':len(source_texts),'name_policy':'余淼／2017级会长；楚休红','other_facts':'No additional textual corrections'})
 print('PASS source blocks',len(blocks),'images',len(images),'native footnotes 3; old approved tail starts at',start+1)

if __name__=='__main__':
 import sys
 {'names':names,'prepare':prepare}[sys.argv[1]]()
