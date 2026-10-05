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
#include "../modules/toc.jsx"
#include "../visual/toc_skin.jsx"
(function(){
 var root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/print_v4',a=SHAN.assemblyV0,stage='credits-render',runtime={setStage:function(){},document:null},credits=null,tocDoc=null;
 var unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel;
 try{app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var m=a.read(root,'content/ASSEMBLY_V0_MANIFEST.json'),c=null,i;for(i=0;i<m.interior.length;i+=1){if(m.interior[i].id==='editorial_info'){c=m.interior[i];}}
  a.check(c,'Credits component missing');credits=a.render(root,c,4,runtime);a.audit(credits,4);a.check(credits.count===1,'Approved credits no longer fit fixed front page');
  credits.doc.save(File(out+'/editorial_info.indd'));SHAN.printBook.exportPDF(credits.doc,File(out+'/editorial_info.pdf'),false);
  stage='toc-data';var actual=a.read(root,'exports/print_v3/FINAL_PRINT_REPORT.json'),config=a.read(root,'content/TOC_MANIFEST.json'),t=a.read(root,'spec/TOC_TOKENS.json'),base=a.read(root,'spec/VISUAL_TOKENS.json');
  var data=SHAN.toc.entries(m,actual,config,a.read(root,'spec/CONTENT_MANIFEST.json').sections);
  stage='toc-native-document';tocDoc=a.fresh({document:null},5);tocDoc.pages[0].appliedMaster=NothingEnum.NOTHING;SHAN.tocSkin.apply(tocDoc,t,base);
  var measured=SHAN.toc.layout(tocDoc,tocDoc.pages[0],data,t,config),pages=[tocDoc.pages[0]];
  if(measured.required_pages===2){var extra=tocDoc.pages.add(LocationOptions.AT_END);extra.appliedMaster=NothingEnum.NOTHING;pages.push(extra);}
  stage='toc-render';var rendered=SHAN.toc.render(tocDoc,pages,data,t,config);a.check(rendered.status==='PASS','TOC preview failed');
  stage='save-preview';tocDoc.save(File(out+'/TOC_PREVIEW_NATIVE.indd'));SHAN.printBook.exportPDF(tocDoc,File(out+'/TOC_PREVIEW_NATIVE.pdf'),false);
  a.write(out+'/TOC_REQUIRED_PAGES.json',a.json({required_pages:rendered.required_pages}));
  var report={status:'PASS',credits_start_page:Number(credits.doc.pages[0].name),credits_side:a.side(credits.doc.pages[0]),credits_report:credits.doc.extractLabel('SHAN_EDITORIAL_INFO_REPORT'),toc_start_page:Number(tocDoc.pages[0].name),toc_side:a.side(tocDoc.pages[0]),toc_pages:rendered.required_pages,toc_entries:data.entries,overset:false,preview_page_source:'APPROVED_PREVIOUS_ACTUAL_ASSEMBLY_RUNTIME; final book refreshes from its own actual ranges',native_version:app.version};
  a.write(out+'/FRONT_MATTER_RUNTIME.json',a.json(report));return 'PASS front matter;credits=LEFT;TOC=RIGHT;entries='+data.entries.length+';TOC pages='+rendered.required_pages;
 }catch(e){var error='stage='+stage+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+(e.source?';source='+e.source:'')+';stack='+$.stack;try{a.write(out+'/FRONT_MATTER_ERROR.txt',error);}catch(log){$.writeln(error);}return 'FAIL '+error;
 }finally{try{if(tocDoc && tocDoc.isValid){a.focus(tocDoc);}else if(credits && credits.doc.isValid){a.focus(credits.doc);}}catch(focus){$.writeln(focus.message);}app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}
}());
