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
(function(){
 var root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/print_v2';
 var runtime={stage:'initialise',component_id:null,document:null},unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel;
 runtime.setStage=function(name,detail){this.stage=name;this.detail=detail || {};};
 try{
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  if(!Folder(out).exists){Folder(out).create();}
  var t=SHAN.assemblyV0.read(root,'spec/CHAPTER_ART_TOKENS.json'),base=SHAN.assemblyV0.read(root,'spec/VISUAL_TOKENS.json'),sections=SHAN.assemblyV0.read(root,'spec/CONTENT_MANIFEST.json').sections;
  var ids=['origin','strata','constellations'],reports=[],i,j,doc,section,left,right,records;
  for(i=0;i<ids.length;i++){
   runtime.component_id=ids[i];runtime.setStage('sample:create-document');doc=SHAN.assemblyV0.fresh({document:null},2);runtime.document=doc;
   section=null;for(j=0;j<sections.length;j++){if(sections[j].id===ids[i]){section=sections[j];}}
   if(!section){throw new Error('Sample section missing');}
   left=doc.pages.item(0);right=doc.pages.add(LocationOptions.AT_END);records=[];
   runtime.setStage('sample:transition');records.push(SHAN.chapterArt.render(doc,left,section,t,base,true));
   runtime.setStage('sample:opener');records.push(SHAN.chapterArt.render(doc,right,section,t,base,false));
   for(j=0;j<doc.fonts.length;j++){if(doc.fonts[j].status!==FontStatus.INSTALLED){throw new Error('Missing sample font');}}
   runtime.setStage('sample:export');doc.save(File(out+'/SAMPLE_'+ids[i]+'.indd'));SHAN.printBook.exportIsolatedPages(doc,File(out+'/SAMPLE_'+ids[i]+'.pdf'),runtime);
   reports.push({id:ids[i],status:'PASS',pages:2,records:records,focus:SHAN.assemblyV0.focus(doc)});
   if(i<ids.length-1){doc.close(SaveOptions.NO);runtime.document=null;}
  }
  SHAN.assemblyV0.write(out+'/SAMPLE_RUNTIME.json',SHAN.assemblyV0.json(reports));return 'PASS ChapterArt samples: origin / strata / constellations';
 }catch(e){var error='stage='+runtime.stage+';section='+runtime.component_id+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+(e.source?';source='+e.source:'')+';context='+SHAN.assemblyV0.json(runtime.detail)+';stack='+$.stack;try{SHAN.assemblyV0.write(out+'/SAMPLE_ERROR.txt',error);}catch(log){$.writeln(error);}return 'FAIL stage='+runtime.stage+';message='+e.message+';log='+out+'/SAMPLE_ERROR.txt';}
 finally{try{if(runtime.document && runtime.document.isValid){SHAN.assemblyV0.focus(runtime.document);}}catch(focus){$.writeln(focus.message);}app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}
}());
