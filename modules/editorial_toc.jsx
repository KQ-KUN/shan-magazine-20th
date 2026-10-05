var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.editorialToc = {
    render:function(doc,page,data,t,display,root){
        var toc=SHAN.toc,source=SHAN.editorialInfo.source(root),p=SHAN.utils.pt,b=page.bounds;
        toc.check(page.side===PageSideOptions.LEFT_HAND,"Editorial/contents must be a real verso");
        page.appliedMaster=NothingEnum.NOTHING;
        SHAN.editorialTocSkin.apply(doc,t,SHAN.assemblyV0.read(root,"spec/VISUAL_TOKENS.json"));
        var paper=page.rectangles.add();paper.label="SHAN_EDITORIAL_TOC:paper";paper.geometricBounds=[b[0]-p(3),b[1]-p(3),b[2]+p(3),b[3]+p(3)];paper.fillColor=doc.colors.itemByName("C_TOC_Paper");paper.strokeWeight=0;paper.sendToBack();
        var rule=page.graphicLines.add();rule.label="SHAN_EDITORIAL_TOC:divider";rule.geometricBounds=[b[0]+p(t.top_mm),b[1]+p(t.left_mm+t.editorial_width_mm+t.gap_mm/2),b[0]+p(t.bottom_mm),b[1]+p(t.left_mm+t.editorial_width_mm+t.gap_mm/2)];rule.strokeWeight=t.rule_pt;rule.strokeColor=doc.colors.itemByName("C_TOC_Muted");
        var paragraphs=source.paragraphs.slice(0,31),i,paragraph,key,f,owned=[],records=[],left;
        paragraphs=paragraphs.concat(display.short_copyright);
        left=toc.frame(doc,page,"editorial",paragraphs.join("\r"),"P_ET_Body",[t.left_mm,t.top_mm,t.editorial_width_mm,t.bottom_mm-t.top_mm]);owned.push(left);
        for(i=0;i<paragraphs.length;i+=1){
            key=source.audit.style_mapping[String(i+1)] || "P_Editorial_Body";
            if(i>=31){key="P_Editorial_Legal";}
            paragraph=left.parentStory.paragraphs[i];paragraph.applyParagraphStyle(doc.paragraphStyles.itemByName(key.replace("P_Editorial_","P_ET_")),true);
        }
        var x=t.left_mm+t.editorial_width_mm+t.gap_mm,width=t.contents_width_mm,y=t.contents_top_mm,e,probe,lines,titleHeight,rowHeight;
        owned.push(toc.frame(doc,page,"display","目录","P_ET_Contents_Title",[x,t.top_mm,width,13]));
        owned.push(toc.frame(doc,page,"english","CONTENTS","P_ET_Contents_English",[x,t.top_mm+13,width,6]));
        for(i=0;i<data.entries.length;i+=1){
            e=data.entries[i];
            if(e.kind==="chapter"){
                if(i>0){y+=t.section_gap_mm;}
                owned.push(toc.frame(doc,page,e.component_id+":title",(e.display_index?e.display_index+"　":"")+e.title,"P_ET_Chapter",[x,y,width-t.number_axis_mm,7]));
                f=toc.frame(doc,page,e.component_id+":page",e.printed_folio,"P_ET_Page",[x+width-t.number_axis_mm,y+.6,t.number_axis_mm,6]);owned.push(f);y+=t.chapter_height_mm;
            }else{
                probe=toc.frame(doc,page,"owned-measure",e.title,"P_ET_Article",[x,0,width-t.number_axis_mm,40]);doc.recompose();toc.check(!probe.overflows,"Combined TOC title too long "+e.component_id);lines=probe.lines.length;probe.remove();
                titleHeight=lines*t.styles.P_ET_Article.leading_pt*25.4/72+.5;
                owned.push(toc.frame(doc,page,e.component_id+":title",e.title,"P_ET_Article",[x,y,width-t.number_axis_mm,titleHeight]));
                f=toc.frame(doc,page,e.component_id+":page",e.printed_folio,"P_ET_Page",[x+width-t.number_axis_mm,y,t.number_axis_mm,6]);owned.push(f);
                rowHeight=titleHeight+t.entry_after_mm;
                if(e.author){owned.push(toc.frame(doc,page,e.component_id+":author",e.author,"P_ET_Author",[x,y+titleHeight+t.author_gap_mm,width-t.number_axis_mm,5]));rowHeight+=t.styles.P_ET_Author.leading_pt*25.4/72+t.author_gap_mm;}
                y+=rowHeight;
            }
            f.parentStory.paragraphs[0].justification=Justification.RIGHT_ALIGN;
            toc.check(y<=t.bottom_mm+.1,"Combined contents exceeds one page at "+e.component_id);
        }
        f=toc.frame(doc,page,"folio",page.name,"P_ET_Page",[t.left_mm,248,t.editorial_width_mm,7]);owned.push(f);
        doc.recompose();
        for(i=0;i<owned.length;i+=1){f=owned[i];toc.check(f.isValid && f.parentPage && f.parentPage.id===page.id && !f.overflows,"Missing/overset combined frame "+f.label);toc.check(f.contents===f.extractLabel("SHAN_TOC_EXPECTED"),"Combined text changed "+f.label);toc.check(f.lines.length>0,"Invisible combined frame "+f.label);
            records.push({label:f.label,text:f.contents,interior_page:Number(page.name),lines:f.lines.length,overset:false,bounds:f.geometricBounds});}
        for(i=0;i<paragraphs.length;i+=1){paragraph=left.parentStory.paragraphs[i];toc.check(SHAN.historySource.paragraphText(paragraph.contents,0)===paragraphs[i],"Editorial source/display mismatch "+(i+1));if(paragraphs[i]){toc.check(paragraph.lines.length>0 && paragraph.parentTextFrames.length>0,"Invisible editorial paragraph "+(i+1));}}
        var fullLegal=source.paragraphs.slice(31).join("\n");doc.insertLabel("SHAN_FULL_COPYRIGHT",fullLegal);doc.metadataPreferences.description=fullLegal;
        return {status:"PASS",page_count:1,entries:data.entries.length,overset:false,editorial_width_mm:t.editorial_width_mm,contents_width_mm:width,
            divider:true,source_sha256:source.audit.source_sha256,source_paragraphs:source.paragraphs.length,unchanged_editorial_paragraphs:31,
            short_copyright:display.short_copyright,full_copyright:source.paragraphs.slice(31),full_copyright_in_document_metadata:true,frames:records};
    }
};
