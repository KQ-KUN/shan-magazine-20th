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
(function(){
 var root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/print_v7',a=SHAN.assemblyV0;
 var runtime={stage:'read-plan',component_id:'interview_xiao',document:null},unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel;
 runtime.setStage=function(n,d){this.stage=n;this.detail=d||{};a.write(out+'/TARGETED_PROGRESS.txt','stage='+n+';component='+this.component_id+';context='+a.json(this.detail));};
 try{
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var folder=Folder(out);a.check(folder.exists || folder.create(),'Cannot create targeted output');
  var manifest=a.read(root,'content/ASSEMBLY_V0_MANIFEST.json'),prior=a.read(root,'exports/print_v6/FINAL_PRINT_REPORT.json'),byId={},i,j,c,start,result,doc,map,report;
  for(i=0;i<prior.components.length;i+=1){byId[prior.components[i].id]=prior.components[i];}
  map=a.read(root,'content/INTERVIEW_NAME_CORRECTION_MAP.json');
  a.check(SHAN.historySource.sha256(SHAN.historySource.read(File(root+'/'+map.source),'BINARY'))===map.source_sha256,'Original interview changed');
  a.check(SHAN.historySource.sha256(SHAN.historySource.read(File(root+'/'+map.layout_source),'BINARY'))===map.layout_sha256,'Layout interview hash mismatch');
  for(j=0;j<2;j+=1){
   runtime.component_id=j===0?'interview_xiao':'xingyue';
   for(i=0;i<manifest.interior.length;i+=1){if(manifest.interior[i].id===runtime.component_id){c=SHAN.chapter.parseJSON(a.json(manifest.interior[i]));break;}}
   a.check(c && c.id===runtime.component_id,'Missing targeted component');start=byId[c.id].start_page;
   if(j===0){c.source=map.layout_source;}
   runtime.setStage('render',{source:c.source,start_page:start});result=a.render(root,c,start,runtime);doc=result.doc;a.audit(result,start);
   a.check(doc.pages.length===byId[c.id].page_count,'Targeted refinement changed page count '+c.id);
   if(j===0){
    var story=result.rendered && result.rendered.story,frame,seen=[],p,actual,expected;
    // Resolve only the owned interview frame/story, never global error scans.
    if(!story){for(i=0;i<doc.pages.length;i+=1){for(var k=0;k<doc.pages[i].textFrames.length;k+=1){frame=doc.pages[i].textFrames[k];if(frame.label.indexOf('SHAN_INTERVIEW:interview_xiao:frame:')===0){story=frame.parentStory;break;}}if(story){break;}}}
    a.check(story && story.isValid && story.label==='SHAN_INTERVIEW:interview_xiao:story','Missing owned interview story');
    a.check(!story.overflows,'Interview overset');a.check(story.paragraphs.length===map.paragraph_count,'Interview paragraph count');
    for(i=0;i<map.paragraph_count;i+=1){p=story.paragraphs[i];actual=SHAN.historySource.paragraphText(p.contents,0);expected=map.layout_paragraphs[i];
     a.check(actual===expected,'Interview exact text mismatch source paragraph '+(i+1));
     a.check(p.lines.length>0 && p.parentTextFrames.length>0,'Invisible interview source paragraph '+(i+1));seen.push(actual);
    }
    a.check(seen.join('\r').indexOf('邵珠渝')<0 && seen.join('\r').indexOf('邵珠瑜')>=0,'Interview name correction missing');
    report={status:'PASS',pages:doc.pages.length,start_page:start,end_page:start+doc.pages.length-1,paragraphs_exact:true,paragraphs:seen,source_sha256:map.source_sha256,layout_sha256:map.layout_sha256,overset:false,native_version:app.version};
   }else{report=SHAN.chapter.parseJSON(doc.extractLabel('SHAN_TASK21_XINGYUE'));a.check(report.status==='PASS','Missing XingYue audit');report.start_page=start;report.end_page=start+doc.pages.length-1;}
   report.focus=a.focus(doc);runtime.setStage('save');var stem=j===0?'INTERVIEW_XIAO_NATIVE':'XINGYUE_NATIVE';doc.save(File(out+'/'+stem+'.indd'));
   // Export the editable component in its approved facing-page geometry.
   // Isolating spreads is safe for PDF wrappers, but moves live Parent items.
   runtime.setStage('export');SHAN.printBook.exportPDF(doc,File(out+'/'+stem+'.pdf'),false);
   runtime.setStage('write-report');a.write(out+'/'+(j===0?'INTERVIEW_NAME_RUNTIME':'XINGYUE_RUNTIME')+'.json',a.json(report));
  }
  return 'PASS targeted;interview paragraphs=37;name correction=1;xingyue pages=2;images=3;overset=false;fonts/links=PASS';
 }catch(e){var error='stage='+runtime.stage+';component='+runtime.component_id+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+';context='+a.json(runtime.detail)+';stack='+$.stack;
  try{a.write(out+'/TARGETED_RUNTIME_ERROR.txt',error);}catch(log){$.writeln(error);}return 'FAIL '+error;
 }finally{try{if(runtime.document && runtime.document.isValid){a.focus(runtime.document);}}catch(focus){$.writeln(focus.message);}app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}
}());
