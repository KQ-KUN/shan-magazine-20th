var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.printBook = {
    check: function(value,message){if(!value){throw new Error("PrintBook: "+message);}},
    section: function(sections,id){var i;for(i=0;i<sections.length;i+=1){if(sections[i].id===id){return sections[i];}}throw new Error("Unknown section "+id);},
    verify: function(root,file,sha){var f=File(root+"/"+file);this.check(f.exists,"Missing approved input "+file);this.check(SHAN.historySource.sha256(SHAN.historySource.read(f,"BINARY"))===sha,"Input hash changed "+file);return f;},
    // Unlike the V0 trim-only proof wrapper, retain the complete 3mm artwork
    // bleed at 100% scale. No fit-to-frame scale or independent X/Y adjustment.
    placeBleed: function(doc,page,file,number,label){
        var oldPage=app.pdfPlacePreferences.pageNumber,oldCrop=app.pdfPlacePreferences.pdfCrop,b=page.bounds,p=SHAN.utils.pt,rect,placed,g;
        try{
            app.pdfPlacePreferences.pageNumber=number;app.pdfPlacePreferences.pdfCrop=PDFCrop.CROP_BLEED;
            rect=page.rectangles.add();rect.label=label;rect.strokeWeight=0;rect.fillColor=doc.swatches.itemByName("None");
            rect.geometricBounds=[b[0]-p(3),b[1]-p(3),b[2]+p(3),b[3]+p(3)];
            placed=rect.place(file);this.check(placed && placed.length===1,"Missing PDF placement "+label);g=placed[0];
            this.check(g && g.isValid,"Invalid PDF graphic "+label);g.horizontalScale=100;g.verticalScale=100;rect.fit(FitOptions.CENTER_CONTENT);
            var gb=g.geometricBounds,tolerance=p(.15);
            this.check(Math.abs(gb[3]-gb[1]-p(191))<tolerance && Math.abs(gb[2]-gb[0]-p(266))<tolerance,"Wrong BleedBox "+label);
            this.check(g.pdfAttributes.pageNumber===number && g.itemLink && g.itemLink.status===LinkStatus.NORMAL,"PDF/link mismatch "+label);
            return rect;
        }finally{app.pdfPlacePreferences.pageNumber=oldPage;app.pdfPlacePreferences.pdfCrop=oldCrop;}
    },
    coverInsideBlank: function(doc){
        // No shared placeholder renderer, Parent, background or printed element.
        var page=SHAN.assemblyV0.page(doc,"COVER_INSIDE_FRONT_BLANK");
        this.check(page.side===PageSideOptions.LEFT_HAND,"C2 is not verso");
        var parent=page.appliedMaster;
        // InDesign 2026 returns null after assignment of NothingEnum.NOTHING.
        this.check(page.pageItems.length===0 && (parent===null || parent===NothingEnum.NOTHING),"C2 contains printing elements");return page;
    },
    auditPages: function(doc,allowBlank){
        var i,j,page,links=doc.links;
        for(i=0;i<doc.pages.length;i+=1){page=doc.pages[i];this.check(SHAN.assemblyV0.side(page)===(i%2?"LEFT_HAND":"RIGHT_HAND"),"Physical page parity "+(i+1));
            if(page.label==="COVER_INSIDE_FRONT_BLANK"){this.check(allowBlank && page.pageItems.length===0,"C2 not blank");}
            else{this.check(page.pageItems.length>0,"Unexpected blank "+(i+1));}
            for(j=0;j<page.textFrames.length;j+=1){this.check(!page.textFrames[j].overflows,"Overset "+page.textFrames[j].label);}
        }
        for(i=0;i<links.length;i+=1){this.check(links[i].status===LinkStatus.NORMAL,"Invalid link "+links[i].name);}
        for(i=0;i<doc.fonts.length;i+=1){this.check(doc.fonts[i].status===FontStatus.INSTALLED,"Missing font "+doc.fonts[i].name);}
    },
    exportIsolatedPages: function(doc,file,runtime){
        // Facing-page export includes neighbouring inside bleed. Export a copy
        // with one page per spread; the saved book retains physical page sides.
        var copy=app.open(doc.fullName,true,OpenOptions.OPEN_COPY),labels=[],counts=[],i,page;
        runtime.exportCopy=copy;
        for(i=0;i<doc.pages.length;i+=1){labels.push(doc.pages[i].label);counts.push(doc.pages[i].pageItems.length);}
        copy.documentPreferences.allowPageShuffle=true;
        copy.documentPreferences.facingPages=false;
        this.check(copy.pages.length===labels.length,"Isolation changed page count");
        for(i=0;i<copy.pages.length;i+=1){page=copy.pages[i];
            this.check(page.label===labels[i] && page.pageItems.length===counts[i] && page.parent.pages.length===1,"Isolation changed page ownership/order "+(i+1));
            for(var j=0;j<page.textFrames.length;j+=1){this.check(!page.textFrames[j].overflows,"Isolation overset "+page.textFrames[j].label);}
        }
        this.exportPDF(copy,file,false);
        copy.close(SaveOptions.NO);runtime.exportCopy=null;
    },
    clipReaderInsideBleed: function(doc){
        // Reader INDD/spread proof is a facing-page simulation. Hide only the
        // adjacent page's bleed at the spine, after exporting full-bleed singles.
        // No white object is added and PDF graphic scale/position is unchanged.
        var i,j,page,items,rect,b,pb;
        for(i=0;i<doc.pages.length;i+=1){page=doc.pages[i];pb=page.bounds;items=page.rectangles;
            for(j=0;j<items.length;j+=1){rect=items[j];b=rect.geometricBounds;
                if(page.side===PageSideOptions.RIGHT_HAND){b[1]=pb[1];}else{b[3]=pb[3];}
                rect.geometricBounds=b;
            }
        }
    },
    exportPDF: function(doc,file,spreads){
        var pref=app.pdfExportPreferences,old=pref.properties;
        try{pref.pageRange=PageRange.ALL_PAGES;pref.exportReaderSpreads=spreads;pref.useDocumentBleedWithPDF=true;
            // Preserve native Process CMYK and exact 100K. No guessed printer
            // profile; protected RGB photographs/cover remain unchanged.
            pref.pdfColorSpace=PDFColorSpace.UNCHANGED_COLOR_SPACE;
            pref.colorBitmapSampling=Sampling.NONE;pref.grayscaleBitmapSampling=Sampling.NONE;pref.monochromeBitmapSampling=Sampling.NONE;
            pref.colorBitmapCompression=BitmapCompression.ZIP;pref.grayscaleBitmapCompression=BitmapCompression.ZIP;pref.monochromeBitmapCompression=MonoBitmapCompression.ZIP;
            pref.cropMarks=false;pref.bleedMarks=false;pref.registrationMarks=false;pref.colorBars=false;pref.pageInformationMarks=false;pref.viewPDF=false;
            doc.exportFile(ExportFormat.PDF_TYPE,file,false);
        }finally{pref.properties=old;}
        this.check(file.exists && file.length>0,"Print PDF missing");
    },
    exportSpreads: function(doc,file){
        this.exportPDF(doc,file,true);
    },
    run: function(root,runtime){
        var out=root+"/exports/print_v2",a=SHAN.assemblyV0;
        runtime.setStage("read-print-plan");
        var plan=a.read(root,"content/PRINT_BOOK_MANIFEST.json"),baseline=a.read(root,plan.baseline),manifest=a.read(root,plan.source_plan);
        var t=a.read(root,plan.section_tokens),base=a.read(root,"spec/VISUAL_TOKENS.json"),sections=a.read(root,"spec/CONTENT_MANIFEST.json").sections;
        var inputs=a.read(root,"exports/print_v2/PRINT_COMPONENT_INPUTS.json"),byId={},i,j,c,entry,page,file,section,next=1;
        this.check(inputs.status==="PASS" && inputs.source_components_untouched,"Invalid production copies");
        for(i=0;i<inputs.components.length;i+=1){entry=inputs.components[i];byId[entry.id]=entry;}
        this.check(manifest.interior.length===baseline.components.length,"Component count changed");
        var doc=a.fresh({document:null},1),review,report={status:"RUNNING",binding_mode:plan.binding_mode,cover_pages:plan.cover_pages,
            cover_artwork_pages_supplied:plan.cover_artwork_pages_supplied,reader_cover_pages:2,components:[],intentional_transition_pages:[],
            openers:[],physical_pages:[],overset:false,missing_links:false,frozen_scope_changed:false};
        runtime.document=doc;runtime.report=report;
        for(i=0;i<manifest.interior.length;i+=1){
            c=manifest.interior[i];entry=baseline.components[i];runtime.component_id=c.id;
            this.check(c.id===entry.id,"Content order changed");
            if(c.start_on_recto && next%2===0){
                runtime.setStage("chapter-transition",{section_id:c.section_id,physical_page:next});
                section=this.section(sections,c.section_id);page=a.page(doc,"CHAPTER_TRANSITION_VERSO:"+c.section_id);
                report.intentional_transition_pages.push({page:next,before:c.id,section:c.section_id,art:SHAN.chapterArt.render(doc,page,section,t,base,true)});next+=1;
            }
            this.check(next===entry.start_page,"Approved body pagination changed "+c.id);
            if(c.kind==="chapter"){
                runtime.setStage("chapter-opener",{section_id:c.section_id,physical_page:next});section=this.section(sections,c.section_id);
                page=a.page(doc,"CHAPTER_OPENER:"+c.section_id);report.openers.push(SHAN.chapterArt.render(doc,page,section,t,base,false));
            }else{
                runtime.setStage("verify-component",{file:entry.file});this.verify(root,entry.file,entry.sha256);
                var input=byId[c.id];this.check(input && input.source_sha256===entry.sha256 && input.page_count===entry.page_count,"Production map mismatch "+c.id);
                file=this.verify(root,input.file,input.sha256);
                for(j=0;j<entry.page_count;j+=1){runtime.setStage("place-component-page",{frame_label:c.id+":"+(j+1),physical_page:next+j});
                    page=a.page(doc,"PRINT_COMPONENT:"+c.id+":"+(j+1));this.placeBleed(doc,page,file,j+1,page.label);}
            }
            report.components.push({id:c.id,kind:c.kind,start_page:next,end_page:next+entry.page_count-1,page_count:entry.page_count,status:entry.status,
                source_sha256:entry.sha256,production_sha256:c.kind==="chapter"?null:byId[c.id].sha256});next+=entry.page_count;
        }
        this.check(doc.pages.length===baseline.interior_pages && next-1===baseline.interior_pages,"Additional interior pages");
        this.check(report.intentional_transition_pages.length===baseline.parity_transitions.length,"Additional transitions");
        for(i=0;i<baseline.parity_transitions.length;i+=1){this.check(report.intentional_transition_pages[i].page===baseline.parity_transitions[i].page && report.intentional_transition_pages[i].before===baseline.parity_transitions[i].before,"Wrong transition replacement");}
        runtime.setStage("audit-interior");this.auditPages(doc,false);report.interior_pages=doc.pages.length;
        report.first_interior_side=a.side(doc.pages[0]);report.last_interior_side=a.side(doc.pages[doc.pages.length-1]);
        for(i=0;i<doc.pages.length;i+=1){report.physical_pages.push({interior_page:i+1,side:a.side(doc.pages[i]),type:doc.pages[i].label});}
        runtime.setStage("save-interior");doc.save(File(out+"/SHAN_INTERIOR_PRINT_V2.indd"));
        runtime.setStage("export-isolated-interior");this.exportIsolatedPages(doc,File(out+"/SHAN_INTERIOR_PRINT_V2.pdf"),runtime);
        runtime.setStage("create-reader");review=a.fresh({document:null},1);runtime.review=review;runtime.document=review;
        page=a.page(review,"FRONT_COVER");file=this.verify(root,plan.approved_cover,baseline.approved_cover_sha256);this.placeBleed(review,page,file,1,"APPROVED_EXTERNAL_FRONT_COVER");
        runtime.setStage("cover-inside-front-blank");this.coverInsideBlank(review);
        file=File(out+"/SHAN_INTERIOR_PRINT_V2.pdf");
        for(i=0;i<doc.pages.length;i+=1){runtime.setStage("reader-interior-page",{physical_page:i+1});page=a.page(review,"READER_INTERIOR:"+(i+1));this.placeBleed(review,page,file,i+1,page.label);
            this.check(a.side(page)===a.side(doc.pages[i]),"Reader/interior side disagreement");}
        runtime.setStage("audit-reader");this.auditPages(review,true);this.check(review.pages.length===doc.pages.length+2,"Reader page count");
        report.total_reader_pdf_pages=review.pages.length;report.c2_blank=true;report.reader_page_model=["Front Cover","Blank Inside Front Cover","Interior 1 RIGHT_HAND"];
        report.focus=a.focus(review);runtime.setStage("save-reader");review.save(File(out+"/SHAN_REVIEW_V2.indd"));
        runtime.setStage("export-isolated-reader");this.exportIsolatedPages(review,File(out+"/SHAN_REVIEW_V2.pdf"),runtime);
        runtime.setStage("reader-facing-view");this.clipReaderInsideBleed(review);review.save();
        report.single_page_export="ISOLATED_SPREAD_COPY_WITH_FULL_3MM_BLEED";
        report.reader_native_view="INSIDE_BLEED_CLIPPED_AT_SPINE_AFTER_SINGLE_PAGE_EXPORT";
        runtime.setStage("export-reader-spreads");this.exportSpreads(review,File(out+"/SHAN_REVIEW_SPREADS_V2.pdf"));
        runtime.setStage("write-print-report");report.status="PASS";report.print_release_status="PENDING_BINDING_PRINTER_PROFILE_AND_REMAINING_CONTENT";
        a.write(out+"/FINAL_PRINT_REPORT.json",a.json(report));a.write(out+"/FINAL_PRINT_REPORT.txt",a.json(report));
        return report;
    }
};
