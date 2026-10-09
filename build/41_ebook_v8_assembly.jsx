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
(function(){
 var root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/ebook_v8',runtime={stage:'initialise',planPath:'content/EBOOK_V8_MANIFEST.json',component_id:null,document:null,review:null,report:null};
 var unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel,originalToc=SHAN.editorialTocSkin.apply;
 SHAN.editorialTocSkin.apply=function(doc,t,base){originalToc.call(SHAN.editorialTocSkin,doc,t,base);var color=SHAN.utils.ensureNamed(doc.colors,'C_Ebook_Byline');color.model=ColorModel.PROCESS;color.space=ColorSpace.RGB;color.colorValue=[31,31,31];var s=doc.paragraphStyles.itemByName('P_ET_Author');s.fillColor=color;s.fillTint=100;};
 runtime.setStage=function(name,detail){this.stage=name;this.detail=detail || {};SHAN.assemblyV0.write(out+'/PRINT_PROGRESS.txt','stage='+name+';component='+this.component_id+';context='+SHAN.assemblyV0.json(this.detail));};
 try{app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var report=SHAN.printBook.run(root,runtime);if(report.status==='CAPACITY_CHANGED'){return 'REBUILD TOC;required_pages='+report.toc_required_pages;}return 'PASS Ebook V8;interior='+report.interior_pages+';reader='+report.total_reader_pdf_pages+';C2=blank';
 }catch(e){var error='stage='+runtime.stage+';component='+runtime.component_id+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+(e.source?';source='+e.source:'')+';context='+SHAN.assemblyV0.json(runtime.detail)+';stack='+$.stack;
  try{SHAN.assemblyV0.write(out+'/PRINT_RUNTIME_ERROR.txt',error);if(runtime.report){runtime.report.status='FAIL';runtime.report.error=error;SHAN.assemblyV0.write(out+'/FINAL_PRINT_REPORT.json',SHAN.assemblyV0.json(runtime.report));}}catch(log){$.writeln(error);}return 'FAIL stage='+runtime.stage+';message='+e.message+';log='+out+'/PRINT_RUNTIME_ERROR.txt';
 }finally{SHAN.editorialTocSkin.apply=originalToc;try{if(runtime.review && runtime.review.isValid){SHAN.assemblyV0.focus(runtime.review);}else if(runtime.document && runtime.document.isValid){SHAN.assemblyV0.focus(runtime.document);}}catch(focus){$.writeln(focus.message);}try{app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}catch(cleanup){$.writeln(cleanup.message);}}
}());