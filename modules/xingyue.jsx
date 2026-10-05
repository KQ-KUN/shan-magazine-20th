var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.xingyue = {
 check:function(v,m){if(!v){throw new Error('XingYue: '+m);}},
 frame:function(doc,page,block,t){
  page.appliedMaster=doc.masterSpreads.itemByName('I-FRONT');
  var b=page.bounds,m=SHAN.spec.marginsMM,p=SHAN.utils.pt,left=page.side===PageSideOptions.LEFT_HAND;
  var width=(SHAN.spec.widthMM-m.inside-m.outside-t.column_gutter_mm)/2;
  var x=b[1]+p(left?m.outside:m.inside)+p((block.column-1)*(width+t.column_gutter_mm));
  var f=page.textFrames.add();f.label='SHAN_XINGYUE:'+block.id;
  f.fillColor=doc.swatches.item(0);f.strokeColor=doc.swatches.item(0);
  f.geometricBounds=[b[0]+p(block.top_mm),x,b[2]-p(m.bottom),x+p(width)];f.textFramePreferences.textColumnCount=1;return f;
 },
 create:function(doc,root,t,runtime){
  var a=SHAN.assemblyV0,data=a.read(root,'content/XINGYUE.json'),audit=a.read(root,'spec/TASK16_SOURCE_AUDIT.json');
  var helper=SHAN.historySource,records=[],stories=[],blocks=[],i,k;
  function stage(n,d){if(runtime && runtime.setStage){runtime.setStage('xingyue:'+n,d);}}
  stage('verify-source');this.check(helper.sha256(helper.read(File(root+'/'+audit.source),'BINARY'))===audit.sha256,'Source DOCX hash changed');
  doc.textPreferences.smartTextReflow=false;
  while(doc.pages.length<t.page_count){doc.pages.add(LocationOptions.AT_END);}
  this.check(doc.pages.length===t.page_count,'Unexpected document pages');
  for(k=0;k<data.blocks.length;k+=1){
   var block=data.blocks[k],page=doc.pages[block.page-1],rows=[],texts=[],indices=[];
   stage('block',{block:block.id,page:page.name,column:block.column});
   for(i=0;i<data.paragraphs.length;i+=1){if(data.paragraphs[i].block===block.id){rows.push(data.paragraphs[i]);texts.push(data.paragraphs[i].text);indices.push(i);}}
   this.check(rows.length>0,'Empty block '+block.id);
   var frame=this.frame(doc,page,block,t),story=frame.parentStory;story.label='SHAN_XINGYUE:'+block.id;story.contents=texts.join('\r');stories.push(story);
   for(i=0;i<rows.length;i+=1){story.paragraphs[i].applyParagraphStyle(doc.paragraphStyles.itemByName('P_XingYue_'+rows[i].role),true);}
   // Dedicated empty media paragraphs keep anchors out of sentences.
   for(i=rows.length-1;i>=0;i-=1){
    var item=rows[i];if(!item.image){continue;}
    var image=audit.images[item.image-1],width=t.image_widths_mm[String(item.image)],file=File(root+'/'+image.file);
    stage('image-'+item.image,{image_index:item.image,display_paragraph:indices[i]+1,block:block.id,anchor:'empty_media_paragraph_start'});
    this.check(file.exists && helper.sha256(helper.read(file,'BINARY'))===image.sha256,'Missing/changed image '+item.image);
    var paragraph=story.paragraphs[i];this.check(paragraph && paragraph.isValid,'Missing image paragraph '+item.image);
    var points=paragraph.insertionPoints;this.check(points && points.length>0,'Missing insertion point '+item.image);
    var rect=page.rectangles.add();rect.label='SHAN_XINGYUE:image:'+item.image;rect.fillColor=doc.swatches.item(0);rect.strokeColor=doc.swatches.item(0);
    rect.geometricBounds=[0,0,SHAN.utils.pt(width*image.height_px/image.width_px),SHAN.utils.pt(width)];
    var placed=rect.place(file,false);this.check(placed && placed.length===1,'Placement failed image '+item.image);
    rect.fit(FitOptions.PROPORTIONALLY);rect.fit(FitOptions.CENTER_CONTENT);
    var settings=rect.anchoredObjectSettings;this.check(settings,'Missing anchored settings image '+item.image);
    settings.insertAnchoredObject(points[0],AnchorPosition.ABOVE_LINE);settings.anchorSpaceAbove=0;settings.anchorYoffset=0;
    records.push({index:item.image,paragraph:i,rect:rect,story:story,block:block});
   }
   doc.recompose();stage('validate-block',{block:block.id,page:page.name,column:block.column});
   this.check(!story.overflows && story.paragraphs.length===rows.length,'Missing/overset block '+block.id);
   var rendered=[];
   for(i=0;i<rows.length;i+=1){
    var para=story.paragraphs[i],owners=para.parentTextFrames;
    this.check(helper.paragraphText(para.contents,rows[i].image?1:0)===rows[i].text,'Approved text changed at display paragraph '+(indices[i]+1));
    this.check(para.lines.length>0 && owners && owners.length>0,'Invisible paragraph '+(indices[i]+1));
    var ownerPage=owners[0].parentPage;this.check(ownerPage && ownerPage.isValid && ownerPage.id===page.id,'Wrong paragraph page '+(indices[i]+1));
    rendered.push({display_paragraph:indices[i]+1,text:rows[i].text,lines:para.lines.length});
   }
   blocks.push({id:block.id,page:Number(page.name),column:block.column,bounds:frame.geometricBounds,overset:false,paragraphs:rendered});
  }
  stage('validate-images');this.check(records.length===3 && doc.links.length===3,'Image count failed');var images=[];
  for(i=0;i<records.length;i+=1){
   var record=records[i],r=record.rect,page=r.parentPage,graphics=r.graphics;
   this.check(page && page.isValid && graphics && graphics.length===1,'Image without actual page '+record.index);
   var g=graphics[0],link=g.itemLink;this.check(link && link.isValid && link.status===LinkStatus.NORMAL,'Invalid image link '+record.index);
   this.check(Math.abs(g.horizontalScale-g.verticalScale)<.01,'Stretched image '+record.index);
   var caption=record.story.paragraphs[record.paragraph+1],owners=caption.parentTextFrames;this.check(owners && owners.length>0,'Invisible caption '+record.index);
   var captionPage=owners[0].parentPage;this.check(captionPage && captionPage.id===page.id,'Caption separated image '+record.index);
   var b=r.geometricBounds,pb=page.bounds,m=SHAN.spec.marginsMM,left=page.side===PageSideOptions.LEFT_HAND;
   var x=pb[1]+SHAN.utils.pt(left?m.outside:m.inside),cw=SHAN.utils.pt((185-m.inside-m.outside-t.column_gutter_mm)/2);
   var columnLeft=x+(record.block.column-1)*(cw+SHAN.utils.pt(t.column_gutter_mm));
   this.check(b[1]>=columnLeft-.1 && b[3]<=columnLeft+cw+.1,'Image outside single column '+record.index);
   images.push({index:record.index,page:Number(page.name),column:record.block.column,width_mm:(b[3]-b[1])*25.4/72,height_mm:(b[2]-b[0])*25.4/72,bounds:b,source_sha256:audit.images[record.index-1].sha256,caption:helper.paragraphText(caption.contents,0),link_normal:true,proportional:true});
  }
  var report={status:'PASS',pages:doc.pages.length,paragraphs:data.paragraphs.length,source_sha256:audit.sha256,blocks:blocks,images:images,overset:false,native_version:app.version};
  doc.insertLabel('SHAN_TASK21_XINGYUE',a.json(report));doc.insertLabel('SHAN_TASK16_REPORT','PASS XingYue; exact approved copy; original 3 image bytes; overset=false; pages='+doc.pages.length);
  return {story:stories[0],stories:stories,images:records,report:report};
 }
};
