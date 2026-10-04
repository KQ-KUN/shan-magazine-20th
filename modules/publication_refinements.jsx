var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
/* TASK 16 display-only overlays. Frozen renderers and source DOCX stay intact. */
SHAN.publicationRefinements = {
    check: function (value, message) { if (!value) { throw new Error("TASK16: " + message); } },
    fiction: function (doc, result, info, id) {
        var text = info[id], story = result.story, before = String(story.contents), paragraphs = story.paragraphs;
        this.check(text && story && story.isValid, "Missing work-info/story " + id);
        var i, author = -1, first = doc.pages.item(0).textFrames.item(0);
        for (i = 0; i < paragraphs.length; i += 1) {
            if (paragraphs[i].appliedParagraphStyle.name === "P_Author") { this.check(author < 0, "Multiple author lines " + id); author = i; }
        }
        this.check(author >= 0, "Missing author line " + id);
        var authorParagraph = paragraphs[author], points = authorParagraph.insertionPoints;
        this.check(points && points.length > 0, "Missing author insertion point " + id);
        var point = points[points.length - 1], index = point.index;
        point.contents = text + "\r";
        var added = story.paragraphs[author + 1];
        this.check(added && added.isValid, "Work-info paragraph not created " + id);
        added.applyParagraphStyle(doc.paragraphStyles.itemByName("P_Metadata"), true);
        var expected = before.slice(0,index) + text + "\r" + before.slice(index);
        this.check(String(story.contents) === expected, "Unauthorized text change " + id);
        SHAN.fiction.flow(doc, story, doc.pages.item(doc.pages.length-1).textFrames.item(0), id);
        this.check(String(story.contents) === expected && !story.overflows, "Work-info flow/source failed " + id);
        this.check(added.lines.length > 0 && added.parentTextFrames.length > 0, "Invisible work-info " + id);
        doc.insertLabel("SHAN_TASK16_REPORT", "PASS work-info after author; original text exact; id="+id+"; metadata="+text);
        return result;
    },
    pancake: function (doc, result, root, settings) {
        var story = result.story, before = String(story.contents), i, rect = null;
        for (i=0;i<doc.allPageItems.length;i+=1) {
            if (doc.allPageItems[i].label === "SHAN_MEMOIR_MEDIA") { rect=doc.allPageItems[i]; break; }
        }
        this.check(rect && rect.isValid, "Missing Pancake media rectangle");
        var file = File(root + "/" + settings.file); this.check(file.exists, "Missing original Pancake image");
        // The old full-width transparent canvas is replaced by the exact original
        // DOCX member, without crop, redraw, or pixel conversion.
        var placed = rect.place(file, false); this.check(placed && placed.length===1, "Pancake original placement failed");
        rect.geometricBounds=[0,0,SHAN.utils.pt(settings.width_mm*settings.height_px/settings.width_px),SHAN.utils.pt(settings.width_mm)];
        rect.fit(FitOptions.PROPORTIONALLY); rect.fit(FitOptions.CENTER_CONTENT);
        for(i=0;i<story.paragraphs.length;i+=1) {
            var paragraph=story.paragraphs[i], name=paragraph.appliedParagraphStyle.name;
            if(name==="P_Memoir_Media" || name==="P_Memoir_Caption") {
                paragraph.spanColumnType=SpanColumnTypeOptions.SINGLE_COLUMN;
                paragraph.keepWithNext=name==="P_Memoir_Media"?1:0;
                paragraph.keepAllLinesTogether=true;
                if(name==="P_Memoir_Media"){paragraph.pointSize=2;paragraph.leading=3;paragraph.spaceBefore=SHAN.utils.pt(1.5);paragraph.spaceAfter=SHAN.utils.pt(.8);}
                else{paragraph.spaceAfter=SHAN.utils.pt(2);}
            }
        }
        doc.recompose();
        SHAN.memoir.flow(doc,story,doc.pages.item(doc.pages.length-1).textFrames.item(0),"memoir_pancake");
        // Flow can shrink after removing a span. Delete only proven empty trailing
        // component frames; never truncate the story or remove a nonempty page.
        while(doc.pages.length>1) {
            var last=doc.pages.item(doc.pages.length-1), frames=last.textFrames, empty=true;
            for(i=0;i<frames.length;i+=1) { if(frames[i].lines.length || String(frames[i].contents).length){empty=false;} }
            if(!empty){break;} last.remove(); doc.recompose();
        }
        this.check(String(story.contents)===before && !story.overflows,"Pancake text/flow changed");
        var graphics=rect.graphics;this.check(graphics && graphics.length===1,"Pancake graphic missing");
        var graphic=graphics[0];this.check(graphic.itemLink && graphic.itemLink.status===LinkStatus.NORMAL,"Pancake link invalid");
        this.check(Math.abs(graphic.horizontalScale-graphic.verticalScale)<.01,"Pancake image stretched");
        this.check(rect.parentPage && rect.parentPage.isValid,"Pancake graphic not on actual page");
        doc.insertLabel("SHAN_TASK16_REPORT","PASS Pancake single-column; original text exact; imageWidthMM="+settings.width_mm+"; pages="+doc.pages.length);
        return result;
    }
};
