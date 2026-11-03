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
#include "../modules/back_cover.jsx"
#include "../modules/toc.jsx"
#include "../visual/toc_skin.jsx"
#include "../modules/editorial_toc.jsx"
#include "../visual/editorial_toc_skin.jsx"
#include "../modules/ebook_v8.jsx"
(function(){
var a=SHAN.assemblyV0,root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/back_cover_release_20261102',stage='reader-resume',doc=null,unit=app.scriptPreferences.measurementUnit,ui=app.scriptPreferences.userInteractionLevel,verify=SHAN.printBook.verify;
try{
app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
var guard=a.read(root,'exports/back_cover_release_20261102/READER_RESUME_GUARD.json'),plan=a.read(root,'content/BACK_COVER_BOOK.json'),report=a.read(root,'exports/back_cover_release_20261102/FINAL_PRINT_REPORT.json');
SHAN.printBook.verify=function(r,path,sha){var f=File(r+'/'+path),row=guard.files[path];this.check(row && row.sha256===sha && f.exists && f.length===row.bytes && Math.floor(f.modified.getTime()/1000)===row.modified_seconds,'Reader guard mismatch '+path);return f;};
var input=SHAN.printBook.verify(root,guard.interior_file,guard.interior_sha256);
stage='audit-saved-interior';doc=app.open(File(out+'/SHAN_INTERIOR_PRINT_BACK_RELEASE.indd'),false,OpenOptions.OPEN_COPY);a.check(doc.pages.length===guard.interior_pages,'Saved interior count');SHAN.printBook.auditPages(doc,false);doc.close(SaveOptions.NO);doc=null;
stage='reader-cover';doc=a.fresh({document:null},1);var page=a.page(doc,'FRONT_COVER');SHAN.printBook.placeBleed(doc,page,SHAN.printBook.verify(root,plan.approved_cover,guard.files[plan.approved_cover].sha256),1,'APPROVED_EXTERNAL_FRONT_COVER');SHAN.printBook.coverInsideBlank(doc);
for(var i=0;i<guard.interior_pages;i++){stage='reader-page:'+i;a.write(out+'/READER_PROGRESS.txt',stage);page=a.page(doc,'READER_INTERIOR:'+(i+1));SHAN.printBook.placeBleed(doc,page,input,i+1,page.label);}
stage='native-back-cover';report.back_cover=SHAN.backCover.append(root,doc,plan.digital_back);SHAN.printBook.auditPages(doc,true);a.check(doc.pages.length===guard.interior_pages+4,'Reader page count mismatch');
report.total_reader_pdf_pages=doc.pages.length;report.reader_cover_pages=4;report.c2_blank=true;report.c3_blank=true;report.reader_page_model=['Front Cover','Blank Inside Front Cover','Continuous Interior','Blank Inside Back Cover','Approved Digital Back Cover'];
report.resolved_prior_error=report.error;delete report.error;report.runtime_recovery='Reuse accepted saved interior; rebuild only failed reader/cover integration';report.focus=a.focus(doc);doc.save(File(out+'/SHAN_REVIEW_BACK_RELEASE.indd'));
stage='export-reader';SHAN.printBook.exportIsolatedPages(doc,File(out+'/SHAN_REVIEW_BACK_RELEASE.pdf'),{});SHAN.printBook.clipReaderInsideBleed(doc);doc.save();
report.status='PASS';report.print_release_status='DIGITAL_ONLY_PRINT_CANDIDATE_NOT_APPROVED';report.toc_validation.chapters_point_to_recto_openers=false;report.toc_validation.chapter_policy='DIGITAL_CONTINUOUS_ANY_SIDE';a.write(out+'/FINAL_PRINT_REPORT.json',a.json(report));a.write(out+'/READER_PROGRESS.txt','PASS');return 'PASS native reader;pages='+doc.pages.length+';C3=blank;back='+report.back_cover.back_pdf_page;
}catch(e){var err='stage='+stage+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+';stack='+$.stack;a.write(out+'/READER_ERROR.txt',err);return 'FAIL '+err;
}finally{SHAN.printBook.verify=verify;app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=ui;}
}());