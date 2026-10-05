var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.toc = {
    check:function(value,message){if(!value){throw new Error("TOC: "+message);}},
    contains:function(items,value){for(var i=0;i<items.length;i+=1){if(items[i]===value){return true;}}return false;},
    entries:function(manifest,report,config,sections){
        this.check(report && report.status==="PASS","Actual Assembly runtime report required");
        var records={},rows=[],pending=[],i,c,r,meta,s,index;
        for(i=0;i<report.components.length;i+=1){r=report.components[i];this.check(!records[r.id],"Duplicate runtime component "+r.id);records[r.id]=r;}
        for(i=0;i<manifest.interior.length;i+=1){c=manifest.interior[i];r=records[c.id];
            if(c.kind==="placeholder"){pending.push({component_id:c.id,title:c.title,status:"PENDING"});continue;}
            if(this.contains(config.exclude_kinds,c.kind)){continue;}
            this.check(r && r.status==="COMPLETED" && r.start_page>0,"Missing completed runtime start_page "+c.id);
            meta=config.metadata[c.id] || c.toc || {};s=null;index=null;
            if(c.kind==="chapter"){for(var j=0;j<sections.length;j+=1){if(sections[j].id===c.section_id){s=sections[j];}}this.check(s,"Unknown chapter "+c.id);index=s.display_index;}
            var title=s?s.cn:(meta.title || c.title),author=s?"":(meta.author || c.author || "");
            this.check(!this.contains(config.exclude_titles,title),"Deleted content entered TOC "+title);
            this.check(c.kind!=="chapter" || r.start_page%2===1,"Chapter entry does not point to recto opener "+c.id);
            rows.push({component_id:c.id,kind:c.kind,title:title,author:author,display_index:index,
                start_page:r.start_page,interior_page:r.start_page,printed_folio:r.start_page,review_pdf_page:r.start_page+2});
        }
        return {entries:rows,pending:pending,page_numbers_source:"CURRENT_ASSEMBLY_RUNTIME_COMPONENT_START_PAGE",normalization:"NONE"};
    },
    frame:function(doc,page,label,text,style,box){
        var f=page.textFrames.add(),b=page.bounds,p=SHAN.utils.pt;
        f.label="SHAN_TOC:"+label;f.appliedObjectStyle=doc.objectStyles.item(0);f.fillColor=doc.swatches.itemByName("None");f.strokeColor=doc.swatches.itemByName("None");
        f.textFramePreferences.insetSpacing=[0,0,0,0];f.textFramePreferences.textColumnCount=1;
        f.geometricBounds=[b[0]+p(box[1]),b[1]+p(box[0]),b[0]+p(box[1]+box[3]),b[1]+p(box[0]+box[2])];
        f.contents=String(text);f.insertLabel("SHAN_TOC_EXPECTED",String(text));f.parentStory.paragraphs[0].applyParagraphStyle(doc.paragraphStyles.itemByName(style),true);return f;
    },
    measure:function(doc,page,entry,width,t){
        if(entry.kind==="chapter"){return {height:t.chapter_height_mm+t.section_gap_mm+t.chapter_after_mm,lines:1};}
        var probe=this.frame(doc,page,"owned-measure",entry.title,"P_TOC_Article",[0,0,width-t.number_axis_mm,40]);doc.recompose();
        this.check(!probe.overflows,"TOC title exceeds measurement frame "+entry.component_id);
        var lines=probe.lines.length;this.check(lines>0,"TOC title has no rendered line "+entry.component_id);probe.remove();
        return {lines:lines,title_height:lines*t.styles.P_TOC_Article.leading_pt*25.4/72+.4,
            height:lines*t.styles.P_TOC_Article.leading_pt*25.4/72+.4+(entry.author?t.styles.P_TOC_Author.leading_pt*25.4/72+t.author_gap_mm:0)+t.entry_after_mm};
    },
    layout:function(doc,page,data,t,config){
        var m=SHAN.spec.marginsMM,width=(SHAN.spec.widthMM-m.inside-m.outside-t.gutter_mm)/2,measures=[],i,rows=[],column=0,y=t.main_top_mm,entry,need;
        for(i=0;i<data.entries.length;i+=1){measures.push(this.measure(doc,page,data.entries[i],width,t));}
        for(i=0;i<data.entries.length;i+=1){entry=data.entries[i];
            if(entry.component_id===config.preferred_column_split_before && column===0){column=1;y=t.main_top_mm;}
            need=measures[i].height;
            if(entry.kind==="chapter" && i+1<data.entries.length && data.entries[i+1].kind!=="chapter"){need+=measures[i+1].height;}
            if(y+need>t.main_bottom_mm){column+=1;y=t.main_top_mm;}
            this.check(column<2*t.max_pages,"Directory needs more than two readable pages");
            rows.push({entry:entry,measure:measures[i],page_index:Math.floor(column/2),column:column%2,y:y});y+=measures[i].height;
        }
        return {rows:rows,required_pages:Math.floor(column/2)+1,column_width_mm:width};
    },
    render:function(doc,pages,data,t,config){
        this.check(pages.length>0,"Missing actual document TOC page");var plan=this.layout(doc,pages[0],data,t,config);
        if(plan.required_pages>pages.length){return {status:"CAPACITY_CHANGED",required_pages:plan.required_pages};}
        var i,row,e,page,b,p=SHAN.utils.pt,m=SHAN.spec.marginsMM,left,x,y,f,owned=[],width=plan.column_width_mm;
        for(i=0;i<pages.length;i+=1){page=pages[i];b=page.bounds;left=page.side===PageSideOptions.LEFT_HAND?m.outside:m.inside;
            var paper=page.rectangles.add();paper.label="SHAN_TOC:paper";paper.geometricBounds=[b[0]-p(3),b[1]-p(3),b[2]+p(3),b[3]+p(3)];paper.fillColor=doc.colors.itemByName("C_TOC_Paper");paper.strokeWeight=0;paper.sendToBack();
            owned.push(this.frame(doc,page,"display:"+i,i===0?"目录":"目录（续）","P_TOC_Display",[left,18,130,14]));
            owned.push(this.frame(doc,page,"english:"+i,"CONTENTS","P_TOC_English",[left,34.5,110,7]));
            var rule=page.graphicLines.add();rule.label="SHAN_TOC:short-rule";rule.geometricBounds=[b[0]+p(44),b[1]+p(left),b[0]+p(44),b[1]+p(left+27)];rule.strokeWeight=.5;rule.strokeColor=doc.colors.itemByName("C_TOC_Red");
            f=this.frame(doc,page,"folio:"+i,page.name,"P_TOC_Page",[left,248,SHAN.spec.widthMM-m.inside-m.outside,7]);f.parentStory.paragraphs[0].justification=page.side===PageSideOptions.LEFT_HAND?Justification.LEFT_ALIGN:Justification.RIGHT_ALIGN;owned.push(f);
        }
        for(i=0;i<plan.rows.length;i+=1){row=plan.rows[i];e=row.entry;page=pages[row.page_index];left=page.side===PageSideOptions.LEFT_HAND?m.outside:m.inside;x=left+row.column*(width+t.gutter_mm);y=row.y;
            if(e.kind==="chapter"){
                y+=t.section_gap_mm;
                if(e.display_index){owned.push(this.frame(doc,page,e.component_id+":index",e.display_index,"P_TOC_Chapter_Number",[x,y,12,t.chapter_height_mm]));}
                owned.push(this.frame(doc,page,e.component_id+":title",e.title,"P_TOC_Chapter_Name",[x+(e.display_index?14:0),y+1.5,width-t.number_axis_mm-(e.display_index?14:0),6.5]));
                f=this.frame(doc,page,e.component_id+":page",e.printed_folio,"P_TOC_Page",[x+width-t.number_axis_mm,y+2.5,t.number_axis_mm,6]);owned.push(f);
            }else{
                owned.push(this.frame(doc,page,e.component_id+":title",e.title,"P_TOC_Article",[x,y,width-t.number_axis_mm,row.measure.title_height]));
                f=this.frame(doc,page,e.component_id+":page",e.printed_folio,"P_TOC_Page",[x+width-t.number_axis_mm,y,t.number_axis_mm,6]);owned.push(f);
                if(e.author){owned.push(this.frame(doc,page,e.component_id+":author",e.author,"P_TOC_Author",[x,y+row.measure.title_height+t.author_gap_mm,width-t.number_axis_mm,5]));}
            }
            f.parentStory.paragraphs[0].justification=Justification.RIGHT_ALIGN;
        }
        doc.recompose();
        var records=[];
        for(i=0;i<owned.length;i+=1){f=owned[i];this.check(f.isValid && f.parentPage && !f.overflows,"Missing/overset directory frame "+f.label);
            this.check(f.contents===f.extractLabel("SHAN_TOC_EXPECTED"),"Directory display text changed "+f.label);
            this.check(f.lines.length>0,"Directory frame has no visible lines "+f.label);
            records.push({label:f.label,text:f.contents,interior_page:Number(f.parentPage.name),lines:f.lines.length,overset:false});
        }
        return {status:"PASS",required_pages:plan.required_pages,entries:data.entries.length,overset:false,owned_text_frames:owned.length,frames:records};
    }
};
