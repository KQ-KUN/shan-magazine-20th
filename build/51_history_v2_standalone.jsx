#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../modules/history_source.jsx"
#include "../modules/history.jsx"
#include "../modules/assembly_v0.jsx"
#include "../modules/print_book.jsx"
#include "../visual/history_skin.jsx"
#include "../modules/history_v2.jsx"
(function(){
 var a=SHAN.assemblyV0,root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/history_v2',doc=null;
 var runtime={stage:'read-source',detail:{}};runtime.setStage=function(n,d){this.stage=n;this.detail=d||{};a.write(out+'/HISTORY_PROGRESS.txt','stage='+n+';context='+a.json(this.detail));};
 var unit=app.scriptPreferences.measurementUnit,level=app.scriptPreferences.userInteractionLevel;
 try{
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var data=a.read(root,'content/HISTORY_V2_IMPORT.json'),tokens=a.read(root,'spec/HISTORY_V2_TOKENS.json'),base=a.read(root,'spec/VISUAL_TOKENS.json');
  var guard=a.read(root,'exports/history_v2/SOURCE_HOST_GUARD.json');
  a.check(guard.source===data.source && guard.sha256===data.source_sha256 && File(root+'/'+data.source).length===guard.bytes,'Runner source hash/size guard differs');
  a.check(SHAN.historySource.sha256(SHAN.historySource.read(File(root+'/content/HISTORY_V2_IMPORT.json'),'BINARY'))===guard.import_sha256,'Import map differs from runner-verified source');
  a.check(SHAN.historySource.sha256(SHAN.historySource.read(File(root+'/content/HISTORY_V2_LAYOUT.json'),'BINARY'))===guard.layout_sha256,'Geometry differs from runner-verified plan');
  data.layout=a.read(root,'content/HISTORY_V2_LAYOUT.json');
  for(var bi=0;bi<data.blocks.length;bi+=1){if(data.blocks[bi].type==='media'){data.blocks[bi].geometry=data.layout.groups[data.blocks[bi].id];}}
  var context={warnings:[],runtime:runtime},request=a.read(root,'exports/history_v2/REQUEST.json'),result;
  if(request.resume_only){doc=app.activeDocument.getElements()[0];result=SHAN.historyV2.auditExisting(doc,data,runtime);}
  else{
  doc=a.fresh(context,data.first_page);
  SHAN.styles.create(doc,context);SHAN.parents.create(doc,context);SHAN.typography.apply(doc,base,context);SHAN.runningSystem.apply(doc,base);SHAN.historySkin.apply(doc,tokens,base,context);
  var span=doc.paragraphStyles.itemByName('P_History_Media_Span');span.spanColumnType=SpanColumnTypeOptions.SPAN_COLUMNS;span.spanSplitColumnCount=2;
  span=doc.paragraphStyles.itemByName('P_History_Caption_Span');span.spanColumnType=SpanColumnTypeOptions.SPAN_COLUMNS;span.spanSplitColumnCount=2;
  var sections=a.read(root,'spec/CONTENT_MANIFEST.json').sections,section=null;
  for(var i=0;i<sections.length;i+=1){if(sections[i].id==='strata'){section=sections[i];}}
  result=SHAN.historyV2.render(doc,data,tokens,section,root,runtime);
  }
  var target=out+'/SHAN_HISTORY_V2.indd';
  for(var di=app.documents.length-1;di>=0;di-=1){var prior=app.documents[di].getElements()[0],priorPath='';if(prior.id===doc.id){continue;}try{priorPath=prior.fullName.fsName.replace(/\\/g,'/');}catch(unsaved){}
    if(priorPath===target){if(prior.modified){prior.save(File(out+'/SHAN_HISTORY_PRESERVED_'+new Date().getTime()+'.indd'));}else{prior.close(SaveOptions.NO);}}
  }
  runtime.setStage('save-export');doc.save(File(out+'/SHAN_HISTORY_V2.indd'));
  SHAN.printBook.exportPDF(doc,File(out+'/SHAN_HISTORY_V2.pdf'),false);
  result.focus=a.focus(doc);delete result.story;delete result.frames;result.warnings=context.warnings;
  a.write(out+'/HISTORY_RUNTIME.json',a.json(result));
  return 'PASS History V2;pages='+result.pages+';images='+result.images.length+';native_footnotes='+result.footnotes.length+';overset=false';
 }catch(e){var error='FAIL HistoryV2;stage='+runtime.stage+';context='+a.json(runtime.detail)+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+';stack='+$.stack;
  try{a.write(out+'/HISTORY_RUNTIME_ERROR.txt',error);}catch(log){$.writeln(error);}return error;
 }finally{try{if(doc && doc.isValid){a.focus(doc);}}catch(focus){}app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=level;}
}());
