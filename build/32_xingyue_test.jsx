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
 var root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/print_v6',a=SHAN.assemblyV0;
 var runtime={stage:'read-plan',component_id:'xingyue',document:null},unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel;
 runtime.setStage=function(n,d){this.stage=n;this.detail=d||{};a.write(out+'/XINGYUE_PROGRESS.txt','stage='+n+';context='+a.json(this.detail));};
 try{
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var folder=Folder(out);a.check(folder.exists || folder.create(),'Cannot create XingYue output');
  var manifest=a.read(root,'content/ASSEMBLY_V0_MANIFEST.json'),prior=a.read(root,'exports/print_v5/FINAL_PRINT_REPORT.json'),byId={},i,start=1,c;
  for(i=0;i<prior.components.length;i+=1){byId[prior.components[i].id]=prior.components[i];}
  for(i=0;i<manifest.interior.length;i+=1){c=manifest.interior[i];if(c.start_on_recto && start%2===0){start+=1;}if(c.id==='xingyue'){break;}a.check(byId[c.id],'Missing approved component count '+c.id);start+=byId[c.id].page_count;}
  a.check(c && c.id==='xingyue','XingYue not in current plan');runtime.setStage('render');
  var result=a.render(root,c,start,runtime),doc=result.doc;a.audit(result,start);
  var report=SHAN.chapter.parseJSON(doc.extractLabel('SHAN_TASK21_XINGYUE'));a.check(report.status==='PASS','Missing XingYue native audit');
  report.start_page=start;report.end_page=start+doc.pages.length-1;report.focus=a.focus(doc);
  runtime.setStage('save');doc.save(File(out+'/XINGYUE_NATIVE.indd'));
  runtime.setStage('export');SHAN.printBook.exportIsolatedPages(doc,File(out+'/XINGYUE_NATIVE.pdf'),runtime);
  runtime.setStage('write-report');a.write(out+'/XINGYUE_RUNTIME.json',a.json(report));
  return 'PASS XingYue;pages='+doc.pages.length+';paragraphs='+report.paragraphs+';images=3;overset=false;fonts/links=PASS';
 }catch(e){var error='stage='+runtime.stage+';component='+runtime.component_id+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+';context='+a.json(runtime.detail)+';stack='+$.stack;
  try{a.write(out+'/XINGYUE_RUNTIME_ERROR.txt',error);}catch(log){$.writeln(error);}return 'FAIL '+error;
 }finally{try{if(runtime.document && runtime.document.isValid){a.focus(runtime.document);}}catch(focus){$.writeln(focus.message);}app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}
}());
