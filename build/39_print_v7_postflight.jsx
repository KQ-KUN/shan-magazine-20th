#target "indesign"
#include "../core/utils.jsx"
#include "../modules/chapter.jsx"
#include "../modules/assembly_v0.jsx"
#include "../modules/print_book.jsx"
(function(){
    var root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/print_v7',a=SHAN.assemblyV0;
    var stage='read-finished-report',context={},report,review=null,unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel;
    try{
        app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
        report=a.read(root,'exports/print_v7/FINAL_PRINT_REPORT.json');
        a.check(report.status==='PASS' && report.pdf_finishing && report.pdf_finishing.status==='PASS','PDF finishing has not passed');
        var names=['SHAN_INTERIOR_PRINT_V7.indd','SHAN_REVIEW_V7.indd'],counts=[report.interior_pages,report.total_reader_pdf_pages],records=[],i,j,d,found,path,link;
        for(i=0;i<names.length;i+=1){
            stage='resolve-owned-document';context={document:names[i]};found=null;
            for(j=0;j<app.documents.length;j+=1){d=app.documents[j];path='';try{path=d.fullName.fsName.replace(/\\/g,'/');}catch(unsaved){}
                if(path.toLowerCase()===(out+'/'+names[i]).toLowerCase()){found=d;break;}}
            a.check(found && found.isValid,'Owned print document not open: '+names[i]);d=found;
            a.check(d.pages.length===counts[i] && d.documentPreferences.facingPages,'Physical document model changed');
            stage='refresh-finished-links';
            for(j=0;j<d.links.length;j+=1){link=d.links[j];context={document:names[i],link:link.name,index:j};
                if(link.status===LinkStatus.LINK_OUT_OF_DATE){link.update();}
                a.check(link.status===LinkStatus.NORMAL,'Finished link is not normal: '+link.name);}
            stage='audit-finished-document';SHAN.printBook.auditPages(d,i===1);
            if(i===1){
                review=d;a.check(d.pages[1].label==='COVER_INSIDE_FRONT_BLANK' && d.pages[1].pageItems.length===0,'Finished C2 contains objects');
                for(j=0;j<d.pages.length;j+=1){var page=d.pages[j],rects=page.rectangles,k,rect,graphics,g,b=page.bounds;
                    for(k=0;k<rects.length;k+=1){rect=rects[k];graphics=rect.allGraphics;a.check(graphics && graphics.length===1,'Reader graphic missing on '+page.name);g=graphics[0];
                        a.check(Math.abs(g.horizontalScale-100)<.01 && Math.abs(g.verticalScale-100)<.01,'Reader PDF scale changed on '+page.name);
                        var bounds=rect.geometricBounds;
                        a.check(page.side===PageSideOptions.RIGHT_HAND?bounds[1]>=b[1]-.1:bounds[3]<=b[3]+.1,'Inside bleed intrudes into facing page '+page.name);
                    }
                }
            }
            stage='save-finished-document';context={document:names[i]};d.save();
            records.push({document:names[i],pages:d.pages.length,links:d.links.length,all_links_normal:true,overset:false});
        }
        stage='export-finished-spread-proof';SHAN.printBook.exportSpreads(review,File(out+'/SHAN_REVIEW_SPREADS_V7.pdf'));
        stage='focus-finished-review';report.focus=a.focus(review);report.finished_native_documents=records;
        report.final_links_verified=true;report.native_version=app.version;
        stage='write-finished-report';a.write(out+'/SHAN_ASSEMBLY_REPORT.json',a.json(report));a.write(out+'/FINAL_PRINT_REPORT.json',a.json(report));a.write(out+'/FINAL_PRINT_REPORT.txt',a.json(report));
        return 'PASS Print postflight: dynamic physical pages; final links normal; C2 empty; actual document focus';
    }catch(e){var error='stage='+stage+';context='+a.json(context)+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+(e.source?';source='+e.source:'')+';stack='+$.stack;
        try{a.write(out+'/PRINT_POSTFLIGHT_ERROR.txt',error);}catch(log){$.writeln(error);}return 'FAIL Print postflight: '+error;
    }finally{try{if(review && review.isValid){a.focus(review);}}catch(focus){$.writeln(focus.message);}try{app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}catch(cleanup){$.writeln(cleanup.message);}}
}());
