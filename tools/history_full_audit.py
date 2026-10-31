"""Conservative OOXML editorial audit of the newly authorized 2020+ slice.

Retain the previously audited prefix, native notes and original media. Every
text edit is logged against the supplied draft's original paragraph index.
"""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
from PIL import Image
import copy,csv,hashlib,io,json,re,posixpath,shutil,sys

ROOT=Path(__file__).resolve().parents[1]; WORK=ROOT.parent
INPUT=WORK/'task_inputs/history_full_20261030/INVENTORY.json'
OUT=ROOT/'exports/history_full'
FULL=ROOT/'manuscripts/source/history/会史第二版_全篇审校_20261030.docx'
RAW=OUT/'WORD_AUDITED_OOXML.docx'
PREFIX=ROOT/'manuscripts/source/history/会史第二版_审校至2019-2020_最终姓名口径.docx'
N={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
W='{'+N['w']+'}'; R='{'+N['r']+'}'; REL='{http://schemas.openxmlformats.org/package/2006/relationships}'

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text('utf-8-sig'))
def dump(p,d):p=Path(p);p.parent.mkdir(exist_ok=True,parents=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n','utf-8')
def text(p):return ''.join(n.text or '' for n in p.iter(W+'t'))
def visible(p):
 s=[]
 for n in p.iter():
  if n.tag==W+'t':s.append(n.text or '')
  elif n.tag==W+'br':s.append('\n')
 return ''.join(s)
def settext(p,value):
 assert not p.xpath('.//w:footnoteReference|.//w:drawing',namespaces=N)
 props=p.find(W+'pPr');sample=p.find('.//'+W+'rPr');sample=copy.deepcopy(sample) if sample is not None else None
 for n in list(p):
  if n is not props:p.remove(n)
 run=E.SubElement(p,W+'r')
 if sample is not None:run.append(sample)
 for i,line in enumerate(value.split('\n')):
  if i:E.SubElement(run,W+'br')
  t=E.SubElement(run,W+'t');t.text=line;t.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
def patch(p,old,new):
 nodes=list(p.iter(W+'t'));source=text(p);assert old in source,(old,source)
 start=source.index(old);stop=start+len(old);offset=0;inserted=False
 for n in nodes:
  val=n.text or '';a=max(0,start-offset);b=min(len(val),stop-offset)
  if a<b:n.text=val[:a]+(new if not inserted else '')+val[b:];inserted=True
  offset+=len(val)
def prop(p,name):
 pp=p.find(W+'pPr')
 if pp is None:pp=E.Element(W+'pPr');p.insert(0,pp)
 n=pp.find(W+name)
 if n is None:
  n=E.Element(W+name)
  order='pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange'.split()
  rank=order.index(name)
  at=next((i for i,c in enumerate(pp) if c.tag.startswith(W) and c.tag[len(W):] in order and order.index(c.tag[len(W):])>rank),len(pp));pp.insert(at,n)
 return n

def audit():
 inv=read(INPUT);src=Path(inv['source']);assert sha(src)==inv['sha256']
 OUT.mkdir(parents=True,exist_ok=True)
 changes=[];structure=[]
 with ZipFile(src) as z,ZipFile(PREFIX) as old:
  source=E.fromstring(z.read('word/document.xml'));sb=source.find(W+'body');allps=sb.findall('.//w:p',N)
  direct=sb.findall(W+'p');edge=next(p for p in direct if text(p)=='2020年——2021年')
  tail=[copy.deepcopy(n) for n in list(sb)[list(sb).index(edge):]]
  ids={id(p):inv['paragraphs'][i]['index'] for i,p in enumerate(allps)}
  original_nodes=list(sb)[list(sb).index(edge):];source_ids={id(n):ids[id(p)] for n,p in zip(tail,original_nodes) if p.tag==W+'p'}
  # Explicit, reviewed copy corrections. No date, membership count or post is inferred.
  replacements={
   548:[('加入新会员85人','新增会员85人')],
   560:[('征文具体要求为任意选择','征文要求为：任意选择'),('）、古代故事典故','）或古代故事典故'),('古代故事典故或者将故事与其背景文化意蕴结合','古代故事典故，或者将故事与其背景文化意蕴相结合'),('400——500字','400—500字')],
   567:[('山东大学学生科幻协会同山东大学图书馆一起在兴隆山校区兴隆山图书馆一层中心大厅开办','由山东大学图书馆主办、山东大学学生科幻协会协办的'),('科幻主题书展，以促进','科幻主题书展在兴隆山校区兴隆山图书馆一层中心大厅举行，以促进')],
   575:[('评委们将在初赛来稿中选拔出','评委们从初赛来稿中选出')],
   579:[('决赛时，山大幻协特别邀请到了','决赛中，山大幻协特别邀请'),('昼温老师莅临现场','昼温老师到场')],
   586:[('该会刊主编为刘洋、邱若书提供技术支持','该作品集由刘洋担任主编，邱若书提供技术支持')],
   613:[('共同举办“经典同赏，妙思共议”','共同举办“经典共赏，妙思同议”')],
   615:[('经典同赏，妙思同议','经典共赏，妙思同议')],
   620:[('经典同赏，妙思共议','经典共赏，妙思同议')],
   637:[('通过组织社员观看有关描写“高智力未来人”的科幻小说','通过组织社员阅读描写“高智力未来人”的科幻小说'),('和科幻电影（','、观看科幻电影（')],
   642:[('主要人员及分工是毛鹏哲为组长负责统筹规划','主要人员及分工为：毛鹏哲担任组长，负责统筹规划')],
   678:[('被上级部门要求注销山大幻协微信公众号','上级部门要求山大幻协注销其微信公众号')],
   692:[('领导与监督的职责','领导与监督的职责。')],
   694:[('反响剧烈','反响强烈')],
   711:[('现场合影）','现场合影')],
   715:[('山大幻协将在中心校区举办','山大幻协计划在中心校区举办')],
   754:[('值得一提是','值得一提的是')],
   768:[('截止2024年','截至2024年'),('经核实，截至2024年，经过历代幻协成员的无偿捐赠，协会藏书（含杂志）数量已正式破百。','经核实，截至2024年，在历代幻协成员的无偿捐赠下，协会藏书（含杂志）的数量已破百。')],
   791:[('中央电视台新闻频道CCTV13','中央电视台新闻频道（CCTV-13）')],
   833:[('感受/最喜欢的科幻作品/一句话科幻','感受、最喜欢的科幻作品或一句话科幻')],
   842:[('于微信公众号【月曜科幻】公布','微信公众号【月曜科幻】公布')],
   843:[('观看电影。《献给阿尔吉侬的花束》。','观看电影《献给阿尔吉侬的花束》。')],
   848:[('观看电影。《献给阿尔吉侬的花束》','观看电影《献给阿尔吉侬的花束》。')],
   857:[('于微信公众号【月曜科幻】公布','微信公众号【月曜科幻】公布')],
   858:[('《科幻世界》《IMAX》等官方微博转发','《科幻世界》、IMAX等官方微博账号转发')],
   889:[('招纳新成员','招收新成员'),('设计者：黄可其','设计者：于笑涵')],
   908:[('【SFA10422】;','【SFA10422】；')]
  }
  caption_ids=set();removals=set()
  for node in tail:
   if node.tag!=W+'p':continue
   i=source_ids[id(node)];before=text(node)
   for a,b in replacements.get(i,[]):
    # Reviewed entries are exact, paragraph-scoped replacements; never search
    # again inside their replacement (e.g. adding terminal punctuation).
    for repeat in range(text(node).count(a)):patch(node,a,b)
   iscap=bool(node.xpath('./w:pPr/w:pStyle[@w:val="3"]',namespaces=N)) or text(node).startswith(('左图：','右图：'))
   if iscap:
    # Replace the SEQ field and cached result together, so updating Word fields
    # cannot reintroduce the corrupted number immediately before the year/label.
    value=text(node);value=re.sub(r'^\d{1,3}(?=(?:左图|20\d{2}年))','',value)
    value=value.replace('左图;','左图：').replace('；右图：','\n右图：')
    value=re.sub(r'。(?=(?:制作者|设计者)：)','，',value).rstrip('。')
    settext(node,value);prop(node,'pStyle').set(W+'val','3');caption_ids.add(i)
    prop(node,'keepLines');prop(node,'spacing').set(W+'after','180')
   else:
    # Obsolete parenthetical figure labels duplicate the actual caption. Unique
    # missing-artwork references are recorded below; no replacement image is invented.
    value=text(node)
    if i not in (548,889):
     for match in list(re.finditer(r'（(?:图\d+[^）]*|见【图\d+】)）',value)):
      patch(node,match.group(0),'')
    if i==728 and '（见【图152】）' in text(node):patch(node,'（见【图152】）','')
    # Date ranges and redundant parenthesis are typographic, not new facts.
    if i not in (906,909):
     for a,b in [('作为协办单位（之一）','作为协办单位之一'),('作为承办单位（之一）','作为承办单位之一'),('社团（之一）','社团之一')]:
      while a in text(node):patch(node,a,b)
     value=text(node);updated=re.sub(r'(?<=\d)-(?=\d)','—',value).replace('月—2021年','月至2021年')
     if updated!=value:
      for a in list(dict.fromkeys(re.findall(r'\d+-\d+',value))):patch(node,a,a.replace('-','—'))
     if '12月-2021年1月' in text(node):patch(node,'12月-2021年1月','12月至2021年1月')
   for match in list(re.finditer(r'20\d{2}年全年（([^）]+)）',text(node))):patch(node,match.group(0),match.group(1).replace('-','至'))
   if before!=text(node):changes.append({'source_paragraph':i,'source_direct_paragraph':inv['paragraphs'][i]['direct_index'],'before':before,'after':visible(node),'type':'caption' if iscap else 'copy','reason':'题注字段/图号清理、图文对应、用户确认署名或审校语病和标点；保持史实与数值'})
   if not text(node).strip() and not node.xpath('.//w:drawing|.//w:footnoteReference',namespaces=N):removals.add(id(node))
  # First pair has a caption only in a parenthesis in body; extract it once.
  first=next(n for n in tail if source_ids.get(id(n))==548)
  caption='左图：2020年10月，山大幻协纳新海报，设计者：刘洋\n右图：2020年10月，山大幻协纳新现场'
  old_value=text(first);old_ref=re.search(r'（图107[^）]+）',old_value);assert old_ref;patch(first,old_ref.group(0),'')
  changes.append({'source_paragraph':548,'before':old_value,'after':text(first),'type':'caption_extraction','reason':'将正文中的两图说明移至对应图片下方，信息不丢失'})
  p=E.Element(W+'p');prop(p,'pStyle').set(W+'val','3');settext(p,caption);source_ids[id(p)]='548_caption'
  image=next(n for n in tail if source_ids.get(id(n))==549);tail.insert(tail.index(image)+1,p)
  # Collapse left/right caption paragraphs into one unit with a forced line break.
  cleaned=[]
  for node in tail:
   if id(node) in removals:continue
   if node.tag==W+'p' and text(node).startswith('右图：') and cleaned and cleaned[-1].tag==W+'p' and text(cleaned[-1]).startswith('左图：'):
    prev=cleaned[-1];a=visible(prev);b=visible(node);settext(prev,a+'\n'+b)
    structure.append({'operation':'merge_caption_lines','left_source':source_ids[id(prev)],'right_source':source_ids[id(node)],'text':a+'\n'+b});continue
   cleaned.append(node)
  # Reuse the canonical document's section/footer. Importing an unrelated
  # footer as a media part would break its OOXML content-type contract.
  tail=[n for n in cleaned if n.tag!=W+'sectPr']
  prior=E.fromstring(old.read('word/document.xml'));pb=prior.find(W+'body');oldedge=next(n for n in pb if text(n)=='2020年——2021年');prefix=[copy.deepcopy(n) for n in list(pb)[:list(pb).index(oldedge)]]
  relroot=E.fromstring(old.read('word/_rels/document.xml.rels'));newrels={n.get('Id'):n for n in E.fromstring(z.read('word/_rels/document.xml.rels'))};added={};remap={}
  next_rel=max(int(n.get('Id')[3:]) for n in relroot if re.fullmatch(r'rId\d+',n.get('Id')))+1
  for n in tail:
   for element in n.iter():
    for attr,val in list(element.attrib.items()):
     if attr.startswith(R):
      if val not in remap:
       original=newrels[val];nr=copy.deepcopy(original);nrid='rId'+str(next_rel);next_rel+=1;nr.set('Id',nrid)
       if original.get('TargetMode')!='External':
        target=original.get('Target');newtarget='media/full_tail_'+Path(target).name;added['word/'+newtarget]=z.read('word/'+target);nr.set('Target',newtarget)
       relroot.append(nr);remap[val]=nrid
      element.set(attr,remap[val])
  section=copy.deepcopy(pb.find(W+'sectPr'))
  for n in list(pb):pb.remove(n)
  for n in prefix+tail+[section]:pb.append(n)
  # Keep prior notes 0–2 verbatim; append the two newly supplied tail notes.
  foot=E.fromstring(old.read('word/footnotes.xml'));nf=E.fromstring(z.read('word/footnotes.xml'))
  for n in list(foot):
   # WPS uses positive IDs 8/9 for these separator records. Their IDs are
   # referenced by settings.xml; assuming only -1/0 would corrupt Word open.
   if n.get(W+'type') is None and n.get(W+'id') not in ('0','1','2'):foot.remove(n)
  for n in nf:
   if n.get(W+'id') in ('3','4'):foot.append(copy.deepcopy(n))
  for i,n in enumerate(prior.findall('.//wp:docPr',N),1):n.set('id',str(i))
  # All appended picture formats are already supported by the base package.
  ct=E.fromstring(old.read('[Content_Types].xml'));types={n.get('Extension') for n in ct if n.tag.endswith('Default')}
  for n in E.fromstring(z.read('[Content_Types].xml')):
   if n.tag.endswith('Default') and n.get('Extension') not in types:ct.append(copy.deepcopy(n));types.add(n.get('Extension'))
  parts={'word/document.xml':E.tostring(prior,encoding='UTF-8',xml_declaration=True,standalone=True),'word/_rels/document.xml.rels':E.tostring(relroot,encoding='UTF-8',xml_declaration=True,standalone=True),'word/footnotes.xml':E.tostring(foot,encoding='UTF-8',xml_declaration=True,standalone=True),'[Content_Types].xml':E.tostring(ct,encoding='UTF-8',xml_declaration=True,standalone=True),**added}
  FULL.parent.mkdir(exist_ok=True,parents=True)
  with ZipFile(RAW,'w') as out:
   for item in old.infolist():out.writestr(copy.copy(item),parts.pop(item.filename,old.read(item.filename)))
   for name,value in parts.items():out.writestr(name,value)
  assert [text(n) for n in prefix]==[text(n) for n in list(body_prefix(old))]
  for i in (906,909):assert text(next(n for n in tail if source_ids.get(id(n))==i))==inv['paragraphs'][i]['text']
  mapping=[]
  for index,n in enumerate(tail):
   if n.tag==W+'p':mapping.append({'tail_node_index':index,'original_all_paragraph':source_ids.get(id(n)),'text':visible(n),'images':n.xpath('.//a:blip/@r:embed',namespaces=N)})
  missing=[{'source_paragraph':791,'item':'原正文提及的央视新闻报道截图（旧图164）未作为独立图片提供','treatment':'正文报道事实保留；清理无对应图片的旧图号说明；不编造图片'},{'source_paragraph':857,'item':'原正文提及的获奖名单盖章证明文件（旧图178）未提供','treatment':'名单及评语发布事实保留；清理无对应图片的旧图号说明'},{'source_paragraph':907,'item':'正文提及12则附录，本次提供的DOCX未包含这些附录','treatment':'按原文保留修订说明，不新增未提供附录'}]
  report={'status':'PASS_SOURCE_AUDIT_PENDING_NATIVE_NORMALIZATION','source':str(src),'source_sha256':inv['sha256'],'audited_docx':FULL.relative_to(ROOT).as_posix(),'raw_audit_sha256':sha(RAW),'protected_prefix_sha256':sha(PREFIX),'protected_prefix':'Canonical previously audited pre-2020 content and original images retained, including final confirmed names','scope':'2020–2021 through final November 2026 records','original_tail_text_paragraphs':219,'original_tail_images':76,'changes':changes,'structure_changes':structure,'removed_empty_paragraphs':len(removals),'tail_map':mapping,'relationship_map':remap,'missing_artwork_or_annex':missing,'user_confirmations':{'poster_designer':'于笑涵','future_November_records':'Both retained VERBATIM per user request'},'fact_policy':'No invented dates, posts, counts or event completion; uncertainty recorded separately','word_visual':'PENDING'}
  dump(OUT/'WORD_AUDIT.json',report)
  with (OUT/'WORD_CHANGES.csv').open('w',encoding='utf-8-sig',newline='') as f:
   writer=csv.DictWriter(f,fieldnames=['source_paragraph','source_direct_paragraph','before','after','type','reason'],extrasaction='ignore');writer.writeheader();writer.writerows(changes)
  dump(OUT/'WORD_TAIL_MAP.json',mapping)
  print('PASS audited DOCX:',len(changes),'recorded edits;',len(structure),'caption joins;',len(removals),'empty paragraphs removed; prior prefix preserved')

def body_prefix(z):
 body=E.fromstring(z.read('word/document.xml')).find(W+'body');edge=next(n for n in body if text(n)=='2020年——2021年');return list(body)[:list(body).index(edge)]

def semantic_snapshot(path):
 with ZipFile(path) as z:
  doc=E.fromstring(z.read('word/document.xml'));ps=doc.findall('w:body//w:p',N)
  rels={n.get('Id'):n.get('Target') for n in E.fromstring(z.read('word/_rels/document.xml.rels'))}
  foot={n.get(W+'id'):'\r'.join(text(p) for p in n.findall(W+'p')) for n in E.fromstring(z.read('word/footnotes.xml')) if n.get(W+'type') is None}
  notes=[]
  for i,p in enumerate(ps):
   offset=0
   for n in p.iter():
    if n.tag==W+'t':offset+=len((n.text or '').encode('utf-16-le'))//2
    elif n.tag==W+'br':offset+=1
    elif n.tag==W+'footnoteReference':notes.append((i,offset,foot[n.get(W+'id')]))
  images=[hashlib.sha256(z.read(posixpath.normpath('word/'+rels[rid]))).hexdigest() for rid in doc.xpath('.//a:blip/@r:embed',namespaces=N)]
  return {'text':[visible(p) for p in ps],'images':images,'notes':notes}

def finalize():
 from docx import Document
 from docx.shared import Pt,RGBColor
 from docx.enum.text import WD_ALIGN_PARAGRAPH
 from docx.oxml import OxmlElement
 from docx.oxml.ns import qn
 native=OUT/'WORD_REPAIRED_PROBE.docx';a=semantic_snapshot(RAW);b=semantic_snapshot(native)
 assert a==b,'Native normalization changed text, picture bytes/order or footnote anchor offsets'
 shutil.copy2(native,FULL);report=read(OUT/'WORD_AUDIT.json');doc=Document(FULL);started=False;image_before=False;captions=0
 for p in doc.paragraphs:
  if p.text=='2020年——2021年':started=True
  if not started:continue
  if p.text.startswith('2026年10月17—18日'):
   before=p.text;ref=re.search(r'（图185[^）]*）',before);assert ref
   patch(p._p,ref.group(0),'');after=p.text
   for c in report['changes']:
    if c['source_paragraph']==889:c['after']=after
   for row in report['tail_map']:
    if row['original_all_paragraph']==889:row['text']=after
  image=bool(p._p.xpath('.//w:drawing'))
  if image:
   p.paragraph_format.keep_with_next=True;p.paragraph_format.keep_together=True
  elif image_before and p.text:
   p.paragraph_format.keep_with_next=False;p.paragraph_format.keep_together=True
   p.paragraph_format.space_before=Pt(0);p.paragraph_format.space_after=Pt(15.6);p.paragraph_format.line_spacing=Pt(13)
   p.alignment=WD_ALIGN_PARAGRAPH.LEFT
   for run in p.runs:
    run.font.name='微软雅黑';run._element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'),'微软雅黑');run.font.size=Pt(10);run.font.bold=False;run.font.color.rgb=RGBColor.from_string('666666')
   captions+=1
  image_before=image
  if p.text.startswith(('相对于第一版山大幻协会史','本次修订重编会史所参考的史料')):
   # Compact only the two closing editorial notes to avoid a terminal page
   # containing three orphaned lines. Historical narrative type is unchanged.
   p.paragraph_format.line_spacing=Pt(14)
   prop(p._p,'snapToGrid').set(qn('w:val'),'0')
   for run in p.runs:run.font.size=Pt(11)
 # The inherited WPS floating PAGE textbox clips two-digit page numbers.
 # Replace only footer furniture with a normal centered automatic PAGE field.
 for section in doc.sections:
  footer=section.footer
  for p in list(footer.paragraphs)[1:]:p._p.getparent().remove(p._p)
  p=footer.paragraphs[0];p.clear();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
  field=OxmlElement('w:fldSimple');field.set(qn('w:instr'),'PAGE');run=OxmlElement('w:r');props=OxmlElement('w:rPr');size=OxmlElement('w:sz');size.set(qn('w:val'),'18');props.append(size);run.append(props);t=OxmlElement('w:t');t.text='1';run.append(t);field.append(run);p._p.append(field)
 doc.save(FULL)
 final=semantic_snapshot(FULL);assert final['images']==a['images'] and final['notes']==a['notes']
 changes=[(i,x,y) for i,(x,y) in enumerate(zip(a['text'],final['text'])) if x!=y];assert len(changes)==1 and changes[0][1].startswith('2026年10月17—18日')
 report['audited_sha256']=sha(FULL);report['status']='PASS_SOURCE_AND_NATIVE_NORMALIZATION'
 report['native_normalization']={'status':'PASS','all_paragraphs_exact_before_final_formatting':len(a['text']),'image_bytes_and_order_exact':len(a['images']),'footnotes_text_and_UTF16_anchor_offsets_exact':len(a['notes']),'note_ids':'Word renumbers internal IDs; original note sequence, text and offsets unchanged'}
 report['word_format_repairs']={'caption_units':captions,'image_caption_keep':'Enabled for every new-tail picture paragraph','caption_font':'微软雅黑 10pt; 13pt leading; 15.6pt after whole caption','footer':'Removed clipped floating WPS textbox; centered native PAGE field','closing_editorial_notes':'Only the final two editorial explanations use 11pt/14pt to remove a three-line terminal orphan page','body_extra_change':'Removed obsolete duplicate figure185–189 descriptions after confirmed credits; complete information remains in actual captions'}
 dump(OUT/'WORD_AUDIT.json',report);dump(OUT/'WORD_TAIL_MAP.json',report['tail_map'])
 with (OUT/'WORD_CHANGES.csv').open('w',encoding='utf-8-sig',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=['source_paragraph','source_direct_paragraph','before','after','type','reason'],extrasaction='ignore');writer.writeheader();writer.writerows(report['changes'])
 print('PASS finalized Word:',captions,'caption units; 170 original pictures and 5 notes exact; native PAGE footer')

if __name__=='__main__':{'audit':audit,'finalize':finalize}[sys.argv[1] if len(sys.argv)>1 else 'audit']()
