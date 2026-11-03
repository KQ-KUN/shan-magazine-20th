var SHAN = typeof SHAN === 'undefined' ? {} : SHAN;
SHAN.backCover = {
    append:function(root,doc,artwork){
        var a=SHAN.assemblyV0,check=SHAN.printBook.check;
        check(artwork.status==='APPROVED_FOR_DIGITAL','Back cover lacks digital approval');
        var blank=a.page(doc,'COVER_INSIDE_BACK_BLANK');
        check(blank.side===PageSideOptions.RIGHT_HAND && blank.pageItems.length===0 && blank.appliedMaster===null,'Inside back cover is not truly blank recto');
        var page=a.page(doc,'APPROVED_EXTERNAL_BACK_COVER'),file=SHAN.printBook.verify(root,artwork.file,artwork.sha256),crop=app.pdfPlacePreferences.pdfCrop,number=app.pdfPlacePreferences.pageNumber;
        try{
            app.pdfPlacePreferences.pdfCrop=PDFCrop.CROP_MEDIA;app.pdfPlacePreferences.pageNumber=1;
            var frame=page.rectangles.add();frame.label='APPROVED_EXTERNAL_BACK_COVER';frame.strokeWeight=0;frame.fillColor=doc.swatches.itemByName('None');frame.geometricBounds=page.bounds;
            var graphics=frame.place(file);check(graphics.length===1,'Missing back PDF');var g=graphics[0];g.horizontalScale=100;g.verticalScale=100;frame.fit(FitOptions.CENTER_CONTENT);
            var b=g.geometricBounds,pb=page.bounds;
            check(Math.abs((b[3]-b[1])-(pb[3]-pb[1]))<.05 && Math.abs((b[2]-b[0])-(pb[2]-pb[0]))<.05,'Back cover dimensions/scale changed');
            check(g.itemLink.status===LinkStatus.NORMAL && page.side===PageSideOptions.LEFT_HAND && page.textFrames.length===0 && page.pageItems.length===1,'Back cover furniture/side/link mismatch');
            return {status:'PASS',source_sha256:artwork.sha256,inside_back_pdf_page:blank.documentOffset+1,back_pdf_page:page.documentOffset+1,inside_back_items:0,back_extra_text_frames:0,proportional_scale:100,linked_pdf:true};
        }finally{app.pdfPlacePreferences.pdfCrop=crop;app.pdfPlacePreferences.pageNumber=number;}
    }
};
