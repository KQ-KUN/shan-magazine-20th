#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../modules/interview.jsx"
#include "../visual/interview_skin.jsx"
#include "../modules/fiction.jsx"
#include "../visual/fiction_skin.jsx"
#include "../modules/memoir.jsx"
#include "../visual/memoir_skin.jsx"
#include "../modules/feature.jsx"
#include "../visual/feature_skin.jsx"
#include "../modules/front_note.jsx"
#include "../visual/front_note_skin.jsx"
#include "../modules/association_profile.jsx"
#include "../visual/association_profile_skin.jsx"
#include "../modules/history_source.jsx"
#include "../modules/history.jsx"
#include "../visual/history_skin.jsx"
#include "../modules/editorial_info.jsx"
#include "../visual/editorial_info_skin.jsx"
#include "../modules/publication_refinements.jsx"
#include "../modules/xingyue.jsx"
#include "../visual/xingyue_skin.jsx"
#include "../modules/assembly_v0.jsx"

#include "../modules/chapter_art.jsx"
#include "../modules/print_book.jsx"
#include "../modules/toc.jsx"
#include "../visual/toc_skin.jsx"
#include "../modules/editorial_toc.jsx"
#include "../visual/editorial_toc_skin.jsx"
#include "../modules/ebook_v8.jsx"
#include "../modules/messages.jsx"
#include "../visual/messages_skin.jsx"
#include "../modules/publication_compact.jsx"
(function(){
var a=SHAN.assemblyV0,root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/back_cover_release_20261102',stage='start',doc=null,unit=app.scriptPreferences.measurementUnit,ui=app.scriptPreferences.userInteractionLevel;
try{
app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
var reports=[],ids=['memoir_gloomy','feature_now'];
for(var i=0;i<ids.length;i++){
 stage='open:'+ids[i];doc=app.open(File(root+'/exports/image_review_20261102/'+ids[i]+'.indd'),false,OpenOptions.OPEN_COPY);
 var story=null;for(var si=0;si<doc.stories.length;si++){if(String(doc.stories[si].label).indexOf(ids[i]==='memoir_gloomy'?'SHAN_MEMOIR:':'SHAN_FEATURE:')===0){story=doc.stories[si];break;}}
 a.check(story,'Missing owned story '+ids[i]);stage='compact:'+ids[i];
 var endingMove=null;
 if(ids[i]==='feature_now'){
  var notes=null;for(var ni=0;ni<doc.allGraphics.length;ni++){if(/now_02_notes/.test(doc.allGraphics[ni].itemLink.filePath)){notes=doc.allGraphics[ni].parent.getElements()[0];}}
  a.check(notes && notes.parent.constructor.name==='Character','Missing anchored notes graphic');
  var anchorIndex=notes.parent.index,mi=-1;for(var ai=0;ai<story.paragraphs.length;ai++){var ap=story.paragraphs[ai];if(ap.insertionPoints[0].index<=anchorIndex && ap.insertionPoints.item(-1).index>anchorIndex){mi=ai;break;}}a.check(mi>=0,'Notes anchor paragraph unresolved');var mp=story.paragraphs[mi].getElements()[0],cap=story.paragraphs[mi+1].getElements()[0];
  a.check(cap.appliedParagraphStyle.name==='P_Feature_Caption','Notes caption not adjacent');
  var captionText=String(cap.contents),lastPage=doc.pages.item(-1),pb=lastPage.bounds,pt=SHAN.utils.pt;
  var cf=lastPage.textFrames.add();cf.label='SHAN_FEATURE_NOTES_CAPTION';cf.textFramePreferences.textColumnCount=1;cf.textFramePreferences.insetSpacing=0;cf.contents=captionText;cf.parentStory.paragraphs.everyItem().appliedParagraphStyle=doc.paragraphStyles.itemByName('P_Feature_Caption');
  a.check(String(cf.parentStory.contents)===captionText,'Caption clone differs');cap.remove();
  var notesFile=File(notes.graphics[0].itemLink.filePath),notesOldBounds=notes.geometricBounds;notes.remove();notes=lastPage.rectangles.add();notes.label='SHAN_FEATURE_NOTES_ENDING';notes.strokeWeight=0;notes.fillColor=doc.swatches.itemByName('None');notes.geometricBounds=notesOldBounds;notes.place(notesFile);mp=story.paragraphs[mi].getElements()[0];mp.pointSize=.1;mp.leading=.1;mp.spaceBefore=0;mp.spaceAfter=0;mp.keepWithNext=0;
  var lastBody=null;for(var fi=0;fi<lastPage.textFrames.length;fi++){var candidate=lastPage.textFrames[fi];if(candidate.parentStory.id===story.id){lastBody=candidate;break;}}
  a.check(lastBody,'Missing final two-column body frame');var original=lastBody.geometricBounds,nb=notes.geometricBounds,ratio=(nb[2]-nb[0])/(nb[3]-nb[1]),chosen=100;
  for(var attempt=0;attempt<6;attempt++){
   var w=[100,90,80,73,60,50][attempt],h=w*ratio,x=(185-w)/2,y=232-h;
   lastBody.geometricBounds=[original[0],original[1],pb[0]+pt(y-5.5),original[3]];lastBody.textFramePreferences.verticalBalanceColumns=true;
   notes.geometricBounds=[pb[0]+pt(y),pb[1]+pt(x),pb[0]+pt(232),pb[1]+pt(x+w)];notes.fit(FitOptions.PROPORTIONALLY);notes.fit(FitOptions.CENTER_CONTENT);
   cf.geometricBounds=[pb[0]+pt(234),pb[1]+pt(x),pb[0]+pt(250),pb[1]+pt(x+w)];doc.recompose();chosen=w;if(!story.overflows){break;}
  }
  a.write(out+'/NOTES_DIAGNOSTIC.json',a.json({width:w,paragraph:mi,body_frame:lastBody.geometricBounds,notes_bounds:notes.geometricBounds,caption_bounds:cf.geometricBounds,source_frame:original,body_chars:lastBody.characters.length,body_overflows:story.overflows,body_total:String(story.contents).length,paragraphs:story.paragraphs.length,caption_overflows:cf.overflows}));a.check(!story.overflows,'Closing notes body does not fit');a.check(!cf.overflows,'Closing notes caption does not fit');a.check(notes.parentPage.id===lastPage.id && cf.parentPage.id===lastPage.id,'Closing caption/photo split');
  a.check(lastBody.geometricBounds[2]<notes.geometricBounds[0] && notes.geometricBounds[2]<cf.geometricBounds[0],'Closing notes overlaps body/caption');
  endingMove={source_media_paragraph:mi,caption:captionText,after:'last_complete_body_paragraph',width_mm:chosen,reason:'Pull all remaining prose into upper columns; place original notes and exact caption in a separated bottom panel',body_image_clearance_pt:notes.geometricBounds[0]-lastBody.geometricBounds[2]};
 }
 var result=SHAN.publicationCompact.refine(doc,story);if(endingMove){result.ending_media_move=endingMove;}
 doc.recompose();while(doc.pages.length>1){var last=doc.pages.item(-1),owned=null;for(var fi=0;fi<last.textFrames.length;fi++){var f=last.textFrames[fi];if(f.parentStory.id===story.id){owned=f;break;}}if(!owned || owned.characters.length){break;}last.remove();doc.recompose();}
 for(var li=0;li<doc.links.length;li++){a.check(doc.links[li].status===LinkStatus.NORMAL,'Broken image');}
 result.id=ids[i];result.pages=doc.pages.length;result.images=doc.allGraphics.length;result.overset=story.overflows;
 a.check(!result.overset,'Overset');doc.save(File(out+'/'+ids[i]+'.indd'));SHAN.printBook.exportIsolatedPages(doc,File(out+'/'+ids[i]+'.pdf'),{});reports.push(result);doc.close(SaveOptions.NO);doc=null;
}
var message=null;if(File(out+'/MESSAGES_RUNTIME.json').exists && File(out+'/messages.pdf').exists){message=a.read(root,'exports/back_cover_release_20261102/MESSAGES_RUNTIME.json');a.check(message.status==='PASS' && message.people===31 && message.source_paragraphs===148,'Cached Messages invalid');}else{
stage='messages:read';var map=a.read(root,'content/MESSAGES_IMPORT_MAP.json'),data=a.read(root,'exports/messages_v2/SOURCE_IMPORT.json'),t=a.read(root,'spec/MESSAGES_COMPACT_TOKENS.json'),base=a.read(root,'spec/VISUAL_TOKENS.json'),context={warnings:[]};
a.check(data.source_sha256===map.sha256 && SHAN.historySource.sha256(SHAN.historySource.read(File(root+'/'+map.source),'BINARY'))===map.sha256,'Messages source changed');
doc=a.fresh(context,86);SHAN.styles.create(doc,context);SHAN.parents.create(doc,context);SHAN.typography.apply(doc,base,context);SHAN.runningSystem.apply(doc,base);SHAN.messagesSkin.apply(doc,t,base,context);doc.paragraphStyles.itemByName('P_Message_Empty').keepWithNext=2;
var runtime={setStage:function(n,d){stage=n;a.write(out+'/REFINE_PROGRESS.txt',n);}};
var message=SHAN.messages.render(doc,data,map,t,runtime);message.source_sha256=map.sha256;message.focus=a.focus(doc);a.check(message.people===31 && message.source_paragraphs===148,'Messages inventory changed');
doc.save(File(out+'/messages.indd'));SHAN.printBook.exportIsolatedPages(doc,File(out+'/messages.pdf'),{});a.write(out+'/MESSAGES_RUNTIME.json',a.json(message));doc.close(SaveOptions.NO);doc=null;}
a.write(out+'/REFINE_RUNTIME.json',a.json({status:'PASS',articles:reports,messages:{pages:message.pages,people:message.people,paragraphs:message.source_paragraphs,overset:false},native_version:app.version}));return 'PASS compact native;messages='+message.pages;
}catch(e){var err='stage='+stage+';message='+e.message+';file='+e.fileName+';line='+e.line+';stack='+$.stack;a.write(out+'/REFINE_ERROR.txt',err);return 'FAIL '+err;
}finally{app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=ui;}
}());