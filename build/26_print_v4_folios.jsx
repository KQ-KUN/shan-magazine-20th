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
 var root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/print_v4',a=SHAN.assemblyV0,stage='read-plan',doc=null;
 var unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel;
 try{app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var plan=a.read(root,'exports/print_v4/RESOLVED_BOOK_PLAN.json'),base=a.read(root,'spec/VISUAL_TOKENS.json'),context={warnings:[]},i,row,page,b,m=SHAN.spec.marginsMM,pt=SHAN.utils.pt;
  stage='create-folio-only-document';doc=a.fresh(context,1);SHAN.styles.create(doc,context);SHAN.typography.apply(doc,base,context);
  doc.documentPreferences.pagesPerDocument=plan.interior_pages;
  for(i=0;i<doc.pages.length;i+=1){doc.pages[i].appliedMaster=NothingEnum.NOTHING;doc.pages[i].label='FOLIO_ONLY:'+String(i+1);}
  for(i=0;i<plan.folio_rebase.length;i+=1){row=plan.folio_rebase[i];stage='folio:'+row.component_id+':'+row.component_page;
   page=doc.pages[row.new_folio-1];b=page.bounds;var left=b[1]+pt(page.side===PageSideOptions.LEFT_HAND?m.outside:m.inside),right=b[3]-pt(page.side===PageSideOptions.LEFT_HAND?m.inside:m.outside);
   var frame=SHAN.runningSystem.text(doc,page,'AUTHORIZED_REBASED_FOLIO:'+row.new_folio,SpecialCharacters.AUTO_PAGE_NUMBER,[b[0]+pt(base.running_system.footer_y_mm),left,b[2],right],base.running_system.folio_style,page.side===PageSideOptions.LEFT_HAND?Justification.LEFT_ALIGN:Justification.RIGHT_ALIGN);
   doc.recompose();a.check(!frame.overflows && frame.lines.length===1,'Folio frame missing/overset '+row.new_folio);
  }
  stage='save-folio-only-document';doc.save(File(out+'/FOLIO_ONLY_V4.indd'));
  stage='export-folio-only-pdf';SHAN.printBook.exportIsolatedPages(doc,File(out+'/FOLIO_ONLY_V4.pdf'),{});
  a.write(out+'/FOLIO_RUNTIME.json',a.json({status:'PASS',pages:doc.pages.length,changed_folios:plan.folio_rebase.length,body_objects:0,native_version:app.version}));
  return 'PASS native folio layer;pages='+doc.pages.length+';footers='+plan.folio_rebase.length;
 }catch(e){var error='stage='+stage+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+';stack='+$.stack;try{a.write(out+'/FOLIO_RUNTIME_ERROR.txt',error);}catch(log){$.writeln(error);}return 'FAIL '+error;
 }finally{try{if(doc && doc.isValid){a.focus(doc);}}catch(focus){$.writeln(focus.message);}app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}
}());
