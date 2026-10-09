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
#include "../modules/monday_cup.jsx"
#include "../modules/ebook_v8.jsx"
#include "../modules/ebook_v8_r1.jsx"
(function(){
 var a=SHAN.assemblyV0,root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/ebook_v8_r1';
 var runtime={stage:'read-plan',component_id:null,document:null,detail:{}},unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel,report={status:'RUNNING',components:[]};
 runtime.setStage=function(n,d){this.stage=n;this.detail=d||{};a.write(out+'/STANDALONE_PROGRESS.txt','stage='+n+';component='+this.component_id+';context='+a.json(this.detail));};
 try{app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var manifest=a.read(root,'content/ASSEMBLY_V0_MANIFEST.json'),baseline=a.read(root,'exports/ebook_v8/RESOLVED_BOOK_PLAN.json'),fixture=a.read(root,'exports/ebook_v8/SOURCE_FIXTURE.json'),byId={},i,c,result,doc,row;
  for(i=0;i<baseline.components.length;i+=1){byId[baseline.components[i].id]=baseline.components[i];}
  for(i=0;i<manifest.interior.length;i+=1){c=manifest.interior[i];if(c.id!=='memoir_pancake' && c.id!=='xingyue'){continue;}runtime.component_id=c.id;
   runtime.setStage('standalone:render',{start_page:byId[c.id].start_page,source:c.source});result=SHAN.ebookV8R1.render(root,c,byId[c.id].start_page,runtime);doc=result.doc;
   runtime.setStage('standalone:source-and-visibility');row=SHAN.ebookV8.audit(result,c,fixture.paragraphs[c.id],byId[c.id].start_page);
   row.file='exports/ebook_v8_r1/components/'+c.id+'.pdf';runtime.setStage('standalone:save-export');doc.save(File(root+'/'+row.file.replace(/\.pdf$/,'.indd')));SHAN.printBook.exportPDF(doc,File(root+'/'+row.file),false);
   report.components.push(row);a.write(out+'/STANDALONE_RUNTIME.json',a.json(report));doc.close(SaveOptions.NO);runtime.document=null;
  }
  a.check(report.components.length===2,'R1 expected two targeted components');report.status='PASS';report.native_version=app.version;a.write(out+'/STANDALONE_RUNTIME.json',a.json(report));return 'PASS V8 R1 standalone;source equality;fonts/links;overset=false';
 }catch(e){var error='stage='+runtime.stage+';component='+runtime.component_id+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+(e.source?';source='+e.source:'')+';context='+a.json(runtime.detail)+';stack='+$.stack;
  report.status='FAIL';report.error=error;a.write(out+'/STANDALONE_RUNTIME.json',a.json(report));a.write(out+'/STANDALONE_RUNTIME_ERROR.txt',error);return 'FAIL '+error;
 }finally{try{if(runtime.document && runtime.document.isValid){a.focus(runtime.document);}}catch(focus){$.writeln(focus.message);}app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}
}());
