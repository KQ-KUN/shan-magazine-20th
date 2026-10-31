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
#include "../modules/history_reflow.jsx"
(function(){
 var a=SHAN.assemblyV0,root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/history_reflow',doc=null;
 var runtime={stage:'read-source',detail:{}};runtime.setStage=function(n,d){this.stage=n;this.detail=d||{};a.write(out+'/HISTORY_PROGRESS.txt','stage='+n+';context='+a.json(this.detail));};
 var unit=app.scriptPreferences.measurementUnit,level=app.scriptPreferences.userInteractionLevel,redraw=app.scriptPreferences.enableRedraw;
 try{
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;app.scriptPreferences.enableRedraw=false;
  var data=a.read(root,'content/HISTORY_FULL_IMPORT.json'),layout=a.read(root,'content/HISTORY_REFLOW_LAYOUT.json'),guard=a.read(root,'exports/history_reflow/SOURCE_HOST_GUARD.json');
  a.check(guard.source===data.source && guard.sha256===data.source_sha256 && File(root+'/'+data.source).length===guard.bytes,'Source host guard differs');
  a.check(SHAN.historySource.sha256(SHAN.historySource.read(File(root+'/content/HISTORY_FULL_IMPORT.json'),'BINARY'))===guard.import_sha256,'Import map changed');
  a.check(SHAN.historySource.sha256(SHAN.historySource.read(File(root+'/content/HISTORY_REFLOW_LAYOUT.json'),'BINARY'))===guard.layout_sha256,'Reflow input changed');
  var request=a.read(root,'exports/history_reflow/REQUEST.json'),baseline=root+'/exports/history_full/SHAN_HISTORY_FULL.indd';
  if(request.inspect_only){doc=app.open(File(out+'/SHAN_HISTORY_REFLOW.indd'),true);var known=a.read(root,'exports/history_reflow/HISTORY_RUNTIME.json');a.check(doc.pages.length===known.pages && doc.allGraphics.length===170,'Saved result differs');a.focus(doc);return 'PASS native reflow compile and saved-page/image check;pages='+doc.pages.length;}
  var flow;
  if(request.finalize_only || request.refine_current || request.balance_ending){
   runtime.setStage('read-saved-reflow');doc=app.open(File(out+'/SHAN_HISTORY_REFLOW.indd'),true);flow=a.read(root,'exports/history_reflow/REFLOW_DIAGNOSTIC.json');
   if(request.balance_ending){var ending=doc.pages.item(-1),endFrame=null;for(var ei=0;ei<ending.textFrames.length;ei+=1){if(ending.textFrames[ei].label==='SHAN_HISTORY:body'){endFrame=ending.textFrames[ei];break;}}a.check(endFrame,'Missing final History body frame');endFrame.textFramePreferences.verticalBalanceColumns=true;doc.recompose();flow.after=SHAN.historyReflow.snapshot(doc,endFrame.parentStory,SHAN.historyV2.orderBlocks(data.blocks,flow.layout));a.write(out+'/REFLOW_DIAGNOSTIC.json',a.json(flow));}
   if(request.refine_current){var previous=flow;flow=SHAN.historyReflow.compact(doc,data,previous.layout,runtime);flow.before_refinement=flow.before;flow.before=previous.before;flow.after_keep_relaxation=previous.after_keep_relaxation;flow.moves=previous.moves.concat(flow.moves);flow.removed_empty_trailing_pages+=previous.removed_empty_trailing_pages;a.write(out+'/REFLOW_DIAGNOSTIC.json',a.json(flow));}
  }else{
  runtime.setStage('native-move-probe');SHAN.historyReflow.probe();
  runtime.setStage('open-history-copy');doc=app.open(File(baseline),true);
  if(doc.modified){doc.save(File(out+'/BASELINE_PRESERVED_'+new Date().getTime()+'.indd'));doc.close(SaveOptions.NO);doc=app.open(File(baseline),true);}
  doc.save(File(out+'/SHAN_HISTORY_REFLOW.indd'));
  flow=SHAN.historyReflow.compact(doc,data,layout,runtime);a.write(out+'/REFLOW_DIAGNOSTIC.json',a.json(flow));
  }
  data.layout=flow.layout;var result=SHAN.historyV2.auditExisting(doc,data,runtime);
  result.reflow_moves=flow.moves;result.before_pages=flow.before.pages;result.body_order='PRESERVED; image/caption units may move relative to body';
  runtime.setStage('save-export');doc.save(File(out+'/SHAN_HISTORY_REFLOW.indd'));if(!request.finalize_only){SHAN.printBook.exportPDF(doc,File(out+'/SHAN_HISTORY_REFLOW.pdf'),false);}
  result.focus=a.focus(doc);delete result.story;delete result.frames;a.write(out+'/HISTORY_RUNTIME.json',a.json(result));
  return 'PASS History reflow;pages='+result.pages+';moves='+flow.moves.length+';images='+result.images.length+';notes='+result.footnotes.length+';overset=false';
 }catch(e){var error='FAIL History reflow;stage='+runtime.stage+';context='+a.json(runtime.detail)+';message='+e.message+';file='+e.fileName+';line='+e.line+';stack='+$.stack;try{a.write(out+'/HISTORY_RUNTIME_ERROR.txt',error);}catch(log){}return error;
 }finally{app.scriptPreferences.enableRedraw=redraw;app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=level;try{if(doc && doc.isValid){a.focus(doc);}}catch(focus){}}
}());
