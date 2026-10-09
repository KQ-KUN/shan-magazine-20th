var SHAN = typeof SHAN === 'undefined' ? {} : SHAN;
/* Only Pancake's media behavior differs; frozen Memoir/Gloomy remain intact. */
SHAN.ebookV8R1 = {
 render:function(root,c,start,runtime){
  if(c.id==='xingyue'){return SHAN.ebookV8.render(root,c,start,runtime);}
  var a=SHAN.assemblyV0;a.check(c.id==='memoir_pancake','R1 renderer outside authorized scope '+c.id);
  var context={warnings:[],runtime:runtime},doc=a.fresh(context,start),base=a.read(root,'spec/VISUAL_TOKENS.json');runtime.document=doc;
  runtime.setStage('pancake:single-column-styles',{source:c.source});
  SHAN.styles.create(doc,context);SHAN.parents.create(doc,context);SHAN.typography.apply(doc,base,context);SHAN.runningSystem.apply(doc,base);
  var t=a.read(root,'spec/MEMOIR_TOKENS.json'),media=a.read(root,c.media_manifest),spans=[],i;
  for(i=0;i<t.span_styles.length;i+=1){if(t.span_styles[i]!=='P_Memoir_Media' && t.span_styles[i]!=='P_Memoir_Caption'){spans.push(t.span_styles[i]);}}t.span_styles=spans;
  SHAN.memoirSkin.apply(doc,t,base,context);SHAN.ebookV8.apply(doc,c.kind);
  var ms=doc.paragraphStyles.itemByName('P_Memoir_Media'),cs=doc.paragraphStyles.itemByName('P_Memoir_Caption');
  ms.spanColumnType=SpanColumnTypeOptions.SINGLE_COLUMN;ms.pointSize=2;ms.leading=3;ms.keepWithNext=1;ms.keepAllLinesTogether=true;ms.spaceBefore=SHAN.utils.pt(1.5);ms.spaceAfter=SHAN.utils.pt(.8);
  cs.spanColumnType=SpanColumnTypeOptions.SINGLE_COLUMN;cs.keepWithNext=0;cs.keepAllLinesTogether=true;cs.spaceAfter=SHAN.utils.pt(2);
  a.check(media.file==='assets/task16/pancake-original.png','Pancake must use the original opaque portrait');
  a.check(Math.abs(media.height_mm-media.width_mm*media.height_px/media.width_px)<.01,'Pancake aspect ratio differs');
  runtime.setStage('pancake:direct-portrait',{file:media.file,width_mm:media.width_mm,anchor:'ABOVE_LINE in single column'});
  // Page 1 uses two threaded asymmetric columns. Text keeps its original order:
  // the Media/Caption paragraphs naturally enter the right portrait column after
  // their preceding prose. Page 2 resumes the unchanged 73mm/73mm body grid.
  doc.textPreferences.smartTextReflow=false;
  var first=SHAN.memoir.addFrame(doc,doc.pages[0],c.article_id,1),bounds=first.geometricBounds,pt=SHAN.utils.pt;
  // Reuse 4mm of the opener's footer clearance; keep page2/default margins.
  // Host/PDF checks below require all body glyphs to remain above the folio.
  bounds[2]=doc.pages[0].bounds[0]+pt(media.first_page_bottom_mm);
  a.check(media.first_page_columns_mm.length===2 && Math.abs(media.first_page_columns_mm[0]+media.first_page_columns_mm[1]+media.column_gutter_mm-(bounds[3]-bounds[1])*25.4/72)<.1,'Pancake columns do not fit live area');
  first.textFramePreferences.textColumnCount=1;first.geometricBounds=[bounds[0],bounds[1],bounds[2],bounds[1]+pt(media.first_page_columns_mm[0])];
  var right=SHAN.memoir.addFrame(doc,doc.pages[0],c.article_id,2);right.textFramePreferences.textColumnCount=1;
  right.geometricBounds=[bounds[0],bounds[1]+pt(media.first_page_columns_mm[0]+media.column_gutter_mm),bounds[2],bounds[3]];first.nextTextFrame=right;
  doc.paragraphStyles.itemByName('P_Article_Title').spanColumnType=SpanColumnTypeOptions.SINGLE_COLUMN;doc.paragraphStyles.itemByName('P_Author').spanColumnType=SpanColumnTypeOptions.SINGLE_COLUMN;
  var story=SHAN.memoir.importWord(first,File(root+'/'+c.source));story.label='SHAN_MEMOIR:'+c.article_id+':story';
  var before=SHAN.memoir.textOnly(story.contents),counts=SHAN.memoir.mapStory(doc,story);
  SHAN.memoir.placeMedia(doc,story,File(root+'/'+media.file),media.width_mm,media.height_mm);SHAN.memoir.flow(doc,story,right,c.article_id);
  a.check(SHAN.memoir.textOnly(story.contents)===before,'Pancake text changed in local frame layout');
  var result={story:story,pages:doc.pages.length,counts:counts,graphics:1,overset:story.overflows};
  runtime.setStage('pancake:flow',{pages:doc.pages.length});SHAN.publicationRefinements.pancake(doc,result,root,media);
  return {doc:doc,first:0,count:doc.pages.length,warnings:context.warnings,rendered:result};
 }
};
