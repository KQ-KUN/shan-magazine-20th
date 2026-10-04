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
#include "../modules/editorial_info.jsx"
#include "../visual/editorial_info_skin.jsx"
#include "../modules/assembly_v0.jsx"

(function(){
 var root=File($.fileName).parent.parent.fsName, unit=app.scriptPreferences.measurementUnit;
 var interaction=app.scriptPreferences.userInteractionLevel, stage="editorial-info:render", runtime={setStage:function(){},document:null};
 var output=root+"/exports/task15", folder=Folder(output), result=null;
 try {
  if(!folder.exists && !folder.create()){throw new Error("Cannot create task15 exports");}
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var manifest=SHAN.assemblyV0.read(root,"content/ASSEMBLY_V0_MANIFEST.json"),component=null,i;
  for(i=0;i<manifest.interior.length;i++){if(manifest.interior[i].id==="editorial_info"){component=manifest.interior[i];}}
  if(!component){throw new Error("No editorial_info component");}
  result=SHAN.assemblyV0.render(root,component,1,runtime);
  stage="editorial-info:validate";SHAN.assemblyV0.audit(result,1);
  stage="editorial-info:export";
  result.doc.save(File(output+"/EDITORIAL_INFO_NATIVE.indd"));
  SHAN.assemblyV0.exportPDF(result.doc,File(output+"/EDITORIAL_INFO_NATIVE.pdf"));
  var report=result.doc.extractLabel("SHAN_EDITORIAL_INFO_REPORT");SHAN.assemblyV0.write(output+"/EDITORIAL_INFO_RUNTIME.txt",report);
  return report;
 }catch(e){
  var error="FAIL Editorial info;stage="+stage+";name="+e.name+";message="+e.message+";file="+e.fileName+";line="+e.line+(e.source?";source="+e.source:"")+";stack="+$.stack;
  try{SHAN.assemblyV0.write(output+"/EDITORIAL_INFO_RUNTIME_ERROR.txt",error);}catch(logError){$.writeln(error);}
  return error;
 }finally{
  try{if(runtime.document && runtime.document.isValid){SHAN.assemblyV0.focus(runtime.document);}}catch(focusError){$.writeln(focusError.message);}
  try{app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}catch(cleanupError){$.writeln(cleanupError.message);}
 }
}());
