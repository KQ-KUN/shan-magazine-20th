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
#include "../modules/monday_cup.jsx"
(function(){
 var root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/print_v3',a=SHAN.assemblyV0,stage='read-source',doc=null;
 var unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel;
 try{app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var m=a.read(root,'content/ASSEMBLY_V0_MANIFEST.json'),c=null,i;for(i=0;i<m.interior.length;i+=1){if(m.interior[i].id===SHAN.mondayCup.id){c=m.interior[i];}}
  a.check(c,'MondayCup component missing');var approved=a.read(root,'content/PRINT_BOOK_BASELINE.json'),first=null;for(i=0;i<approved.components.length;i+=1){if(approved.components[i].id==='feature_beyond_ridge'){first=approved.components[i].end_page+1;}}a.check(first,'Preceding article missing');stage='create-document';doc=a.fresh({document:null},first);
  stage='foundation-styles';var context={warnings:[]},base=a.read(root,'spec/VISUAL_TOKENS.json');SHAN.styles.create(doc,context);SHAN.parents.create(doc,context);SHAN.typography.apply(doc,base,context);SHAN.runningSystem.apply(doc,base);
  stage='feature-skin';SHAN.featureSkin.apply(doc,a.read(root,'spec/FEATURE_TOKENS.json'),a.read(root,'spec/VISUAL_TOKENS.json'),{warnings:[]});
  stage='import-map-flow';var result=SHAN.mondayCup.create(doc,c,root);stage='audit';var audit=a.audit({doc:doc,first:0,count:doc.pages.length},first);
  var report={status:'PASS',component_id:c.id,start_page:Number(doc.pages[0].name),page_count:doc.pages.length,integrity:result.integrity,overset:result.story.overflows,audit:audit,focus:a.focus(doc),native_version:app.version};
  stage='save';doc.save(File(out+'/feature_monday_cup_backstage.indd'));
  stage='export';// This text-only article has no artwork outside trim. Keep the original
  // facing-page running Parents and away-from-binding folio alignment.
  SHAN.printBook.exportPDF(doc,File(out+'/feature_monday_cup_backstage.pdf'),false);
  stage='report';a.write(out+'/MONDAY_CUP_RUNTIME.json',a.json(report));return 'PASS MondayCup;pages='+doc.pages.length+';source paragraphs=18;overset=false';
 }catch(e){var error='stage='+stage+';component=feature_monday_cup_backstage;name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+(e.source?';source='+e.source:'')+';stack='+$.stack;try{a.write(out+'/MONDAY_CUP_ERROR.txt',error);}catch(log){$.writeln(error);}return 'FAIL '+error;
 }finally{try{if(doc && doc.isValid){a.focus(doc);}}catch(focus){$.writeln(focus.message);}app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}
}());
