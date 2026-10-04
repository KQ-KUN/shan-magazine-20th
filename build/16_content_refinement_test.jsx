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

(function(){
 var root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/task16';
 var unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel;
 var runtime={stage:'initialise',component_id:null,document:null},reports=[];
 runtime.setStage=function(name,detail){runtime.stage=name;runtime.detail=detail||{};SHAN.assemblyV0.write(out+'/PROGRESS.txt','stage='+name+';component='+runtime.component_id);};
 try{
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var folder=Folder(out);if(!folder.exists && !folder.create()){throw new Error('Cannot create task16 exports');}
  var manifest=SHAN.assemblyV0.read(root,'content/ASSEMBLY_V0_MANIFEST.json'),info=SHAN.assemblyV0.read(root,'content/FICTION_WORK_INFO.json');
  for(var i=0;i<manifest.interior.length;i++){
   var c=manifest.interior[i];if(c.kind!=='fiction' && c.kind!=='memoir' && c.kind!=='xingyue'){continue;}
   runtime.component_id=c.id;runtime.setStage('render:'+c.id);
   var result=SHAN.assemblyV0.render(root,c,1,runtime),doc=result.doc;
   runtime.setStage('validate:'+c.id);var audit=SHAN.assemblyV0.audit(result,1);
   var report={id:c.id,status:'PASS',pages:doc.pages.length,overset:false,fonts_links:'PASS',detail:doc.extractLabel('SHAN_TASK16_REPORT')};
   if(c.kind==='fiction'){
    var frames=doc.pages.item(0).textFrames,story=null;
    for(var f=0;f<frames.length;f++){if(frames[f].label.indexOf('SHAN_FICTION:')===0){story=frames[f].parentStory;break;}}
    if(!story || !report.detail){throw new Error('Missing Fiction source-preservation report');}
    var metadata=null,author=-1,title=null;
    for(var j=0;j<story.paragraphs.length;j++){
     var p=story.paragraphs[j],name=p.appliedParagraphStyle.name;
     if(name==='P_Author'){author=j;}
     if(name==='P_Article_Title'){title=p;}
     if(SHAN.historySource.paragraphText(p.contents,0)===info[c.id]){if(metadata){throw new Error('Duplicate work-info');}metadata=p;report.metadata_paragraph=j+1;}
    }
    if(!metadata || !title || report.metadata_paragraph!==author+2 || metadata.appliedParagraphStyle.name!=='P_Metadata' || metadata.pointSize>=title.pointSize || metadata.fillColor.name!=='C_MUTED'){throw new Error('Invalid secondary work-info hierarchy');}
    report.metadata=info[c.id];report.metadata_size_pt=metadata.pointSize;report.title_size_pt=title.pointSize;report.paragraphs=story.paragraphs.length;
   }
   if(c.id==='memoir_pancake'){
    if(!report.detail){throw new Error('Missing Pancake source-preservation report');}
    var rect=null;
    for(var k=0;k<doc.allPageItems.length;k++){if(doc.allPageItems[k].label==='SHAN_MEMOIR_MEDIA'){rect=doc.allPageItems[k];break;}}
    if(!rect || !rect.parentPage){throw new Error('Pancake media invisible');}
    var b=rect.geometricBounds,g=rect.graphics[0];report.image_width_mm=(b[3]-b[1])*25.4/72;report.image_height_mm=(b[2]-b[0])*25.4/72;
    if(report.image_width_mm>73.1 || Math.abs(g.horizontalScale-g.verticalScale)>.01){throw new Error('Pancake spans or stretches');}
    var parent=rect.parent,ps=parent.parentStory;if(!ps){throw new Error('Pancake anchor has no source story');}
    for(var k=0;k<ps.paragraphs.length;k++){var p=ps.paragraphs[k];if(p.appliedParagraphStyle.name==='P_Memoir_Media' || p.appliedParagraphStyle.name==='P_Memoir_Caption'){if(p.spanColumnType!==SpanColumnTypeOptions.SINGLE_COLUMN){throw new Error('Pancake media/caption still spans');}}}
   }
   if(c.kind==='xingyue'){
    if(!report.detail || doc.links.length!==3){throw new Error('Missing XingYue source/image report');}
    report.images=3;
   }
   runtime.setStage('export:'+c.id);
   var filename=out+'/'+c.id+'_NATIVE.indd';
   for(var n=app.documents.length-1;n>=0;n--){var old=app.documents[n],path='';if(old.id===doc.id){continue;}try{path=old.fullName.fsName.replace(/\\/g,'/');}catch(unsaved){}if(path===filename){if(old.modified){old.save(File(path.replace(/\.indd$/,'_PRESERVED_'+new Date().getTime()+'.indd')));}else{old.close(SaveOptions.NO);}}}
   doc.save(File(filename));SHAN.assemblyV0.exportPDF(doc,File(out+'/'+c.id+'_NATIVE.pdf'));
   report.focus=SHAN.assemblyV0.focus(doc);reports.push(report);
   if(c.kind!=='xingyue'){doc.close(SaveOptions.NO);runtime.document=null;}
  }
  if(reports.length!==6){throw new Error('Expected 3 Fiction + 2 Memoir + XingYue');}
  SHAN.assemblyV0.write(out+'/RUNTIME.json',SHAN.assemblyV0.json(reports));
  return 'PASS TASK16 standalone: 3 Fiction / 2 Memoir / XingYue / exact original text / no overset / fonts and links';
 }catch(e){
  var original='FAIL TASK16;stage='+runtime.stage+';component='+runtime.component_id+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+(e.source?';source='+e.source:'')+';context='+SHAN.assemblyV0.json(runtime.detail)+';stack='+$.stack;
  try{SHAN.assemblyV0.write(out+'/RUNTIME_ERROR.txt',original);}catch(logError){$.writeln(original);}return 'FAIL TASK16;stage='+runtime.stage+';message='+e.message+';log='+out+'/RUNTIME_ERROR.txt';
 }finally{
  try{if(runtime.document && runtime.document.isValid){SHAN.assemblyV0.focus(runtime.document);}}catch(focusError){$.writeln(focusError.message);}
  try{app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}catch(cleanupError){$.writeln(cleanupError.message);}
 }
}());
