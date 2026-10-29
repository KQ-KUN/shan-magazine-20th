var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.historyV2 = {
    check: function (ok, message) { if (!ok) { throw new Error("HistoryV2: " + message); } },
    appendFootnoteText: function(foot,text){
        // The newly-created footnote already owns its automatic number marker.
        // Assigning Footnote.contents would delete it; append after that marker.
        foot.insertionPoints.item(-1).contents=text;
    },
    mediaSize: function (item, width, maxHeight) {
        var crop = item.crop, ratio = item.pixel_height * (1-crop.t-crop.b) / (item.pixel_width * (1-crop.l-crop.r));
        width = Math.min(width, item.pixel_width * (1-crop.l-crop.r) * 25.4 / 150);
        var height = width * ratio;
        if (height > maxHeight) { width *= maxHeight/height; height=maxHeight; }
        return { width:width, height:height };
    },
    groupGeometry: function (block) {
        var items=block.items, width=block.span_columns===2?146:70, gap=2, rows=[],i,size,x=0,max=0;
        if (block.layout==='autograph_grid') {
            var rowY=0;
            for(var row=0;row<3;row+=1){
                var rowHeight=0;
                for(i=row*3;i<row*3+3;i+=1){size=this.mediaSize(items[i],(width-2*gap)/3,48);rows.push({item:items[i],x:(i%3)*((width-2*gap)/3+gap),y:rowY,width:size.width,height:size.height});rowHeight=Math.max(rowHeight,size.height);}
                rowY+=rowHeight+gap;
            }
            return {width:width,height:rowY-gap,placements:rows};
        }
        if(block.layout==='flyer_two_photos'){
            var flyer=null,photos=[];
            for(i=0;i<items.length;i+=1){if(items[i].relationship==='rId24'){flyer=items[i];}else{photos.push(items[i]);}}
            size=this.mediaSize(flyer,34,63);rows.push({item:flyer,x:0,y:0,width:size.width,height:size.height});max=size.height;
            var y=0;
            for(i=0;i<photos.length;i+=1){size=this.mediaSize(photos[i],34,31);rows.push({item:photos[i],x:36,y:y,width:size.width,height:size.height});y+=size.height+gap;}
            return {width:70,height:Math.max(max,y-gap),placements:rows};
        }
        var widths=[],sum=0;
        for(i=0;i<items.length;i+=1){
            var aspect=items[i].pixel_height/items[i].pixel_width;
            var requestedWidth=44,requestedHeight=64;
            if(Number(items.length)===1){requestedWidth=aspect>1.35?46:65;requestedHeight=84;}
            else if(aspect>1.35){requestedWidth=30;}
            size=this.mediaSize(items[i],requestedWidth,requestedHeight);
            widths.push(size);sum+=size.width;
        }
        var scale=Math.min(1,(width-gap*(items.length-1))/sum);
        for(i=0;i<items.length;i+=1){size=widths[i];rows.push({item:items[i],x:x,y:0,width:size.width*scale,height:size.height*scale});x+=size.width*scale+gap;max=Math.max(max,size.height*scale);}
        // Centre within a column without reserving invisible horizontal artwork.
        var occupied=x-gap,shift=(width-occupied)/2;
        for(i=0;i<rows.length;i+=1){rows[i].x+=shift;}
        return {width:width,height:max,placements:rows};
    },
    placeGroup: function(doc,page,story,index,block,root,runtime){
        var geom=this.groupGeometry(block),pt=SHAN.utils.pt,rects=[],records=[],i,p,rect,graphic,anchor;
        runtime.setStage('image-group',{block:block.id,images:block.items.length});
        for(i=0;i<geom.placements.length;i+=1){
            p=geom.placements[i];rect=page.rectangles.add();rect.label='SHAN_HISTORY_V2:'+p.item.id;
            rect.appliedObjectStyle=doc.objectStyles.itemByName('O_Image_Archive');rect.strokeWeight=0;
            rect.fillColor=doc.swatches.itemByName('None');rect.strokeColor=doc.swatches.itemByName('None');
            rect.geometricBounds=[pt(p.y),pt(p.x),pt(p.y+p.height),pt(p.x+p.width)];
            var file=File(root+'/'+p.item.file);this.check(file.exists,'Missing '+p.item.file);
            var placed=rect.place(file,false);this.check(placed && placed.length===1,'Place '+p.item.id);
            rect.fit(FitOptions.PROPORTIONALLY);rect.fit(FitOptions.CENTER_CONTENT);graphic=placed[0];
            var c=p.item.crop,fw=p.width/(1-c.l-c.r),fh=fw*p.item.pixel_height/p.item.pixel_width;
            graphic.geometricBounds=[pt(p.y-fh*c.t),pt(p.x-fw*c.l),pt(p.y+fh*(1-c.t)),pt(p.x+fw*(1-c.l))];
            rects.push(rect);records.push({id:p.item.id,file:p.item.file,source_sha256:p.item.sha256,block:block.id,caption_block:block.caption_block,rect:rect,graphic:graphic,width_mm:p.width,height_mm:p.height});
        }
        if(rects.length>1){anchor=doc.groups.add(rects);anchor.label='SHAN_HISTORY_V2_GROUP:'+block.id;}else{anchor=rects[0];}
        var paragraph=story.paragraphs.item(index),ip=paragraph.insertionPoints.item(0);
        anchor.anchoredObjectSettings.insertAnchoredObject(ip,AnchorPosition.INLINE_POSITION);
        anchor.anchoredObjectSettings.anchorYoffset=0;anchor.parent.leading=Leading.AUTO;
        return {anchor:anchor,records:records,height_mm:geom.height,width_mm:geom.width};
    },
    render: function(doc,data,tokens,section,root,runtime){
        var check=this.check,blocks=data.blocks,first=SHAN.history.addFrame(doc,doc.pages[0],true,tokens),strings=[],i,j;
        SHAN.history.chapterMarker(doc,doc.pages[0],section);
        doc.textPreferences.smartTextReflow=false;
        for(i=0;i<blocks.length;i+=1){strings.push(blocks[i].type==='text'?blocks[i].text:'');}
        first.contents=strings.join('\r')+'\r';var story=first.parentStory;story.label='SHAN_HISTORY_V2:main';
        check(story.paragraphs.length===blocks.length,'Initial paragraphs '+story.paragraphs.length);
        var indexById={};
        for(i=0;i<blocks.length;i+=1){
            var block=blocks[i],p=story.paragraphs.item(i),name=block.type==='media'?(block.span_columns===2?'P_History_Media_Span':'P_History_Media_Caption'):block.style;
            if(i>0 && blocks[i-1].type==='media' && blocks[i-1].span_columns===2){name='P_History_Caption_Span';}
            p.applyParagraphStyle(doc.paragraphStyles.itemByName(name),true);indexById['$'+block.id]=i;
            if(name==='P_History_Roster' && (i+1===blocks.length || blocks[i+1].style!=='P_History_Roster')){p.keepWithNext=0;p.spaceAfter=SHAN.utils.pt(4);}
            if(i+1<blocks.length && blocks[i+1].type==='media' && blocks[i+1].description_block===block.id){p.keepWithNext=1;}
        }
        // Source footnote offsets are measured before generated anchor characters.
        var notes=[];doc.footnoteOptions.footnoteTextStyle=doc.paragraphStyles.itemByName('P_History_Footnote');
        doc.footnoteOptions.restartNumbering=FootnoteRestarting.DONT_RESTART;
        doc.footnoteOptions.startAt=1;
        doc.footnoteOptions.noSplitting=false;doc.footnoteOptions.enableStraddling=false;
        for(i=blocks.length-1;i>=0;i-=1){
            block=blocks[i];
            for(j=(block.footnotes||[]).length-1;j>=0;j-=1){
                runtime.setStage('native-footnote',{block:block.id,id:block.footnotes[j].source_id});
                var note=block.footnotes[j],ip=story.paragraphs.item(i).insertionPoints.item(note.offset_utf16);
                var foot=story.footnotes.add(LocationOptions.BEFORE,ip);foot.label='WORD_FOOTNOTE_ID:'+note.source_id;
                this.appendFootnoteText(foot,note.text);
                foot.texts[0].applyParagraphStyle(doc.paragraphStyles.itemByName('P_History_Footnote'),true);
                notes.push({source_id:note.source_id,block:block.id,text:note.text,nativeObject:foot});
            }
        }
        doc.insertLabel('SHAN_HISTORY_V2_FOOTNOTE_API','APPEND_PRESERVES_NATIVE_MARKER');
        var groups=[],imageRecords=[];
        for(i=blocks.length-1;i>=0;i-=1){
            if(blocks[i].type!=='media'){continue;}
            var group=this.placeGroup(doc,doc.pages[0],story,i,blocks[i],root,runtime);groups.push(group);
            for(j=0;j<group.records.length;j+=1){imageRecords.push(group.records[j]);}
        }
        runtime.setStage('natural-flow');SHAN.history.runtime=null;
        var frames=SHAN.history.flow(doc,story,first,tokens,null);doc.recompose();
        frames[frames.length-1].textFramePreferences.verticalBalanceColumns=true;doc.recompose();
        return this.audit(doc,data,story,imageRecords,notes,runtime);
    },
    auditExisting: function(doc,data,runtime){
        var story=null,i,j,blocks=data.blocks,records=[],notes=[];
        for(i=0;i<doc.stories.length;i+=1){if(doc.stories[i].label==='SHAN_HISTORY_V2:main'){story=doc.stories[i];break;}}
        this.check(story && story.paragraphs.length===blocks.length,'Resume is not this task history story');
        for(i=0;i<blocks.length;i+=1){if(blocks[i].type!=='media'){continue;}
            for(j=0;j<blocks[i].items.length;j+=1){
                var item=blocks[i].items[j],rect=null,graphic=null;
                for(var k=0;k<doc.allGraphics.length;k+=1){var g=doc.allGraphics[k];if(g.parent.label==='SHAN_HISTORY_V2:'+item.id){rect=g.parent;graphic=g;break;}}
                this.check(rect && graphic,'Resume image missing '+item.id);var b=rect.geometricBounds;
                records.push({id:item.id,file:item.file,source_sha256:item.sha256,block:blocks[i].id,caption_block:blocks[i].caption_block,rect:rect,graphic:graphic,width_mm:(b[3]-b[1])*25.4/72,height_mm:(b[2]-b[0])*25.4/72});
            }
        }
        if(doc.extractLabel('SHAN_HISTORY_V2_FOOTNOTE_API')!=='APPEND_PRESERVES_NATIVE_MARKER'){
            for(i=story.footnotes.length-1;i>=0;i-=1){
                var broken=story.footnotes[i],wordId=String(broken.label),position=broken.storyOffset.index,sourceText=null;
                for(j=0;j<blocks.length;j+=1){for(var ni=0;ni<(blocks[j].footnotes||[]).length;ni+=1){if('WORD_FOOTNOTE_ID:'+blocks[j].footnotes[ni].source_id===wordId){sourceText=blocks[j].footnotes[ni].text;}}}
                this.check(sourceText!==null,'Cannot map native footnote repair '+wordId);broken.remove();
                var replacement=story.footnotes.add(LocationOptions.BEFORE,story.insertionPoints.item(position));replacement.label=wordId;
                this.appendFootnoteText(replacement,sourceText);replacement.texts[0].applyParagraphStyle(doc.paragraphStyles.itemByName('P_History_Footnote'),true);
            }
            doc.insertLabel('SHAN_HISTORY_V2_FOOTNOTE_API','APPEND_PRESERVES_NATIVE_MARKER');
        }
        for(i=0;i<story.footnotes.length;i+=1){var fn=story.footnotes[i],id=String(fn.label).replace('WORD_FOOTNOTE_ID:',''),found=null;
            for(j=0;j<blocks.length;j+=1){for(var f=0;f<(blocks[j].footnotes||[]).length;f+=1){if(blocks[j].footnotes[f].source_id===id){found={source_id:id,block:blocks[j].id,text:blocks[j].footnotes[f].text,nativeObject:fn};}}}
            this.check(found,'Resume unmapped footnote '+id);
            notes.push(found);
        }
        doc.recompose();
        return this.audit(doc,data,story,records,notes,runtime);
    },
    audit: function(doc,data,story,imageRecords,notes,runtime){
        var check=this.check,blocks=data.blocks,indexById={},i,j,block,p;
        for(i=0;i<blocks.length;i+=1){indexById['$'+blocks[i].id]=i;}
        runtime.setStage('native-exact-content-validation');
        var paragraphReport=[],imageReport=[],footReport=[],years=[],allNotes=story.footnotes;
        check(!story.overflows,'Story overset');check(allNotes.length===data.native_footnotes,'Footnote count');
        for(i=0;i<blocks.length;i+=1){
            block=blocks[i];p=story.paragraphs.item(i);var actual=String(p.contents);
            if(actual.charAt(actual.length-1)==='\r'){actual=actual.slice(0,-1);}
            var nativeNotes=p.footnotes;
            // Remove only actual generated footnote marker characters at their known offsets.
            for(j=nativeNotes.length-1;j>=0;j-=1){
                var off=nativeNotes[j].storyOffset.index-p.insertionPoints[0].index;
                actual=actual.slice(0,off)+actual.slice(off+1);
            }
            actual=actual.replace(/\uFFFC/g,'');
            check(actual===(block.type==='text'?block.text:''),'Text differs '+block.id+' actual='+actual.slice(0,90));
            check(p.lines.length>0 && p.parentTextFrames.length>0,'Invisible paragraph '+block.id);
            var firstLine=p.lines[0],lastLine=p.lines[p.lines.length-1],page=p.parentTextFrames[0].parentPage;
            paragraphReport.push({id:block.id,type:block.type,style:p.appliedParagraphStyle.name,text:actual,page:Number(page.name),first_baseline:firstLine.baseline,last_baseline:lastLine.baseline,source_paragraph:block.source_paragraph,origin:block.origin});
            if(block.style==='P_History_Year'){years.push({text:block.text,page:Number(page.name),source:block.id});}
        }
        for(i=0;i<imageRecords.length;i+=1){
            var record=imageRecords[i],rect=record.rect,page=rect.parentPage,gb=rect.geometricBounds,pb=page.bounds;
            check(page && page.isValid,'Missing image page '+record.id);
            check(record.graphic.itemLink.status===LinkStatus.NORMAL,'Broken link '+record.id);
            check(gb[0]>=pb[0]+SHAN.utils.pt(16)-.5 && gb[2]<=pb[2]-SHAN.utils.pt(19)+.5,'Image outside vertical body '+record.id);
            check(gb[1]>=pb[1]+SHAN.utils.pt(14)-.5 && gb[3]<=pb[3]-SHAN.utils.pt(14)+.5,'Image outside horizontal body '+record.id);
            var capPage=null;
            if(record.caption_block){var cap=story.paragraphs.item(indexById['$'+record.caption_block]);capPage=Number(cap.parentTextFrames[0].parentPage.name);check(capPage===Number(page.name),'Caption split '+record.id);}
            imageReport.push({id:record.id,file:record.file,source_sha256:record.source_sha256,block:record.block,caption_block:record.caption_block,page:Number(page.name),caption_page:capPage,bounds_pt:gb,width_mm:record.width_mm,height_mm:record.height_mm,link_status:'NORMAL'});
        }
        for(i=0;i<notes.length;i+=1){
            var n=notes[i],fn=n.nativeObject,nativeText=String(fn.contents),prefix=nativeText.slice(0,nativeText.length-n.text.length);
            check(nativeText.slice(prefix.length)===n.text && prefix.length>0 && prefix.length<5 && prefix.charCodeAt(0)!==9 && prefix.charCodeAt(0)!==32,'Footnote text/automatic number mismatch '+n.source_id+' prefix_codes='+prefix.charCodeAt(0)+','+prefix.charCodeAt(1));
            check(fn.storyOffset.parentTextFrames.length>0,'Footnote anchor invisible '+n.source_id);
            footReport.push({source_id:n.source_id,block:n.block,text:n.text,automatic_number_prefix_codes:[prefix.charCodeAt(0),prefix.charCodeAt(1)],automatic_number_marker:true,anchor_page:Number(fn.storyOffset.parentTextFrames[0].parentPage.name),native_id:fn.id,marker_story_index:fn.storyOffset.index});
        }
        check(imageReport.length===data.images,'Image count');
        for(i=0;i<doc.fonts.length;i+=1){check(doc.fonts[i].status===FontStatus.INSTALLED,'Missing font '+doc.fonts[i].name);}
        return {status:'PASS',pages:doc.pages.length,source_sha256:data.source_sha256,paragraphs:paragraphReport,images:imageReport,footnotes:footReport,years:years,overset:false,missing_links:false,native_version:app.version,story:story};
    }
};
