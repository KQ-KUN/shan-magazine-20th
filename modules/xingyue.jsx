var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.xingyue = {
    check:function(value,message){if(!value){throw new Error("XingYue: "+message);}},
    frame:function(doc,page){
        page.appliedMaster=doc.masterSpreads.itemByName("I-FRONT");
        var b=page.bounds,m=SHAN.spec.marginsMM,p=SHAN.utils.pt,left=page.side===PageSideOptions.LEFT_HAND;
        var f=page.textFrames.add();f.label="SHAN_XINGYUE:body";f.appliedObjectStyle=doc.objectStyles.itemByName("O_Text_Main");
        f.fillColor=doc.swatches.item(0);f.strokeColor=doc.swatches.item(0);
        f.geometricBounds=[b[0]+p(m.top),b[1]+p(left?m.outside:m.inside),b[2]-p(m.bottom),b[3]-p(left?m.inside:m.outside)];return f;
    },
    create:function(doc,root,t,runtime){
        var data=SHAN.assemblyV0.read(root,"content/XINGYUE.json"),audit=SHAN.assemblyV0.read(root,"spec/TASK16_SOURCE_AUDIT.json");
        var helper=SHAN.historySource, first=this.frame(doc,doc.pages.item(0)),story=first.parentStory,texts=[],i,j,records=[];
        function stage(name,detail){if(runtime && runtime.setStage){runtime.setStage("xingyue:"+name,detail);}}
        stage("verify-source");
        this.check(helper.sha256(helper.read(File(root+"/"+audit.source),"BINARY"))===audit.sha256,"Source DOCX hash changed");
        doc.textPreferences.smartTextReflow=false;
        for(i=0;i<data.paragraphs.length;i+=1){texts.push(data.paragraphs[i].text);}
        story.contents=texts.join("\r");story.label="SHAN_XINGYUE:main";
        for(i=0;i<data.paragraphs.length;i+=1){story.paragraphs[i].applyParagraphStyle(doc.paragraphStyles.itemByName("P_XingYue_"+data.paragraphs[i].role),true);}
        // Reverse insertion keeps the explicit paragraph indices stable. Objects
        // are attached only to their own empty Media paragraph, never to a sentence.
        for(i=data.paragraphs.length-1;i>=0;i-=1){
            var item=data.paragraphs[i];if(!item.image){continue;}
            var image=audit.images[item.image-1],width=t.image_widths_mm[String(item.image)];
            stage("image-"+item.image,{image_index:item.image,source_paragraph:i+1,anchor:"empty_media_paragraph_start"});
            var file=File(root+"/"+image.file);this.check(file.exists,"Missing image "+item.image);
            this.check(helper.sha256(helper.read(file,"BINARY"))===image.sha256,"Image bytes changed "+item.image);
            var paragraph=story.paragraphs[i];this.check(paragraph && paragraph.isValid,"Missing image paragraph "+item.image);
            var points=paragraph.insertionPoints;this.check(points && points.length>0,"Missing image insertion point "+item.image);
            var rect=doc.pages.item(0).rectangles.add();rect.label="SHAN_XINGYUE:image:"+item.image;
            rect.fillColor=doc.swatches.item(0);rect.strokeColor=doc.swatches.item(0);
            rect.geometricBounds=[0,0,SHAN.utils.pt(width*image.height_px/image.width_px),SHAN.utils.pt(width)];
            var placed=rect.place(file,false);this.check(placed && placed.length===1,"Placement failed image "+item.image);
            rect.fit(FitOptions.PROPORTIONALLY);rect.fit(FitOptions.CENTER_CONTENT);
            var settings=rect.anchoredObjectSettings;this.check(settings,"Missing anchored settings image "+item.image);
            settings.insertAnchoredObject(points[0],AnchorPosition.ABOVE_LINE);settings.anchorSpaceAbove=0;settings.anchorYoffset=0;
            records.push({index:item.image,paragraph:i,rect:rect});
        }
        stage("flow");var last=first,end=-1;
        doc.recompose();
        while(story.overflows){
            this.check(doc.pages.length<3,"Flow exceeds page safety limit");
            var now=last.insertionPoints[last.insertionPoints.length-1].index;this.check(now>end,"Flow made no progress");end=now;
            var next=this.frame(doc,doc.pages.add(LocationOptions.AT_END));last.nextTextFrame=next;last=next;doc.recompose();
        }
        stage("validate");this.check(story.paragraphs.length===texts.length,"Paragraph count changed");
        for(i=0;i<texts.length;i+=1){
            var p=story.paragraphs[i],anchors=data.paragraphs[i].image?1:0;
            this.check(helper.paragraphText(p.contents,anchors)===texts[i],"Approved text changed at paragraph "+(i+1));
            this.check(p.lines.length>0 && p.parentTextFrames.length>0,"Invisible paragraph "+(i+1));
        }
        this.check(records.length===3 && story.allGraphics.length===3 && !story.overflows,"Images/overset failed");
        for(i=0;i<records.length;i+=1){
            var record=records[i],r=record.rect,page=r.parentPage,graphics=r.graphics;
            this.check(page && page.isValid && graphics && graphics.length===1,"Image without actual page "+record.index);
            var g=graphics[0];this.check(g.itemLink && g.itemLink.status===LinkStatus.NORMAL,"Invalid image link "+record.index);
            this.check(Math.abs(g.horizontalScale-g.verticalScale)<.01,"Stretched image "+record.index);
            var caption=story.paragraphs[record.paragraph+1],owners=caption.parentTextFrames;
            this.check(owners && owners.length>0 && owners[0].parentPage.id===page.id,"Caption separated from image "+record.index);
        }
        doc.insertLabel("SHAN_TASK16_REPORT","PASS XingYue; pages="+doc.pages.length+"; approved paragraphs="+texts.length+"; images=3; exact text; source/image SHA=PASS; overset=false");
        return {story:story,images:records};
    }
};
