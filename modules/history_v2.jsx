var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.historyV2 = {
    check: function (ok, message) { if (!ok) { throw new Error("HistoryV2: " + message); } },
    appendFootnoteText: function(foot,text){
        // The newly-created footnote already owns its automatic number marker.
        // Assigning Footnote.contents would delete it; append after that marker.
        foot.insertionPoints.item(-1).contents=text;
    },
    displayText: function(data,block){
        var mapped=data.layout.captions[block.id];
        this.check(!mapped || mapped.source===block.text,'Caption display source differs '+block.id);
        return mapped?mapped.display:block.text;
    },
    styleForBlock: function(block){
        if(block.type!=='media'){return block.style;}
        if(Number(block.span_columns)===2){return 'P_History_Media_Span';}
        if(block.caption_block){return 'P_History_Media_Caption';}
        return 'P_History_Media';
    },
    orderBlocks: function(blocks,layout){
        var moves=layout.flow_moves||[],result=blocks.slice(0),m,i,j,move,lookup,next,skip;
        for(m=0;m<moves.length;m+=1){move=moves[m];lookup={};next=[];
            for(i=0;i<result.length;i+=1){lookup['$'+result[i].id]=result[i];}
            this.check(lookup['$'+move.after],'Missing flow target '+move.after);
            for(i=0;i<result.length;i+=1){skip=false;for(j=0;j<move.ids.length;j+=1){if(result[i].id===move.ids[j]){skip=true;}}if(!skip){next.push(result[i]);}
                if(result[i].id===move.after){for(j=0;j<move.ids.length;j+=1){this.check(lookup['$'+move.ids[j]],'Missing flow unit '+move.ids[j]);next.push(lookup['$'+move.ids[j]]);}}
            }
            this.check(next.length===result.length,'Flow move changed source count');result=next;
        }
        return result;
    },
    inspectLayout: function(doc,data){
        if(doc.extractLabel('SHAN_HISTORY_V2_FLOW_MOVES')){data.blocks=this.orderBlocks(data.blocks,data.layout);}
        var story=null,i,j,p,rows=[],ids=['early_p160','early_p161','early_p162','early_g23','early_p164','early_p188','early_g28','early_p190','early_g29','early_p191','early_p192','early_p201'];
        for(i=0;i<doc.stories.length;i+=1){if(doc.stories[i].label==='SHAN_HISTORY_V2:main'){story=doc.stories[i];break;}}
        this.check(story,'Missing History for inspection');
        for(i=0;i<data.blocks.length;i+=1){var wanted=false;for(j=0;j<ids.length;j+=1){if(ids[j]===data.blocks[i].id){wanted=true;}}if(!wanted){continue;}p=story.paragraphs.item(i);var r={id:data.blocks[i].id,page:Number(p.parentTextFrames[0].parentPage.name),style:p.appliedParagraphStyle.name,keep_next:Number(p.keepWithNext),keep_all:p.keepAllLinesTogether,space_before:Number(p.spaceBefore),space_after:Number(p.spaceAfter),leading:String(p.leading),start:String(p.startParagraph),span:String(p.spanColumnType),lines:[]};
            for(j=0;j<p.lines.length;j+=1){var line=p.lines[j],l={text:String(line.contents).replace(/\uFFFC/g,'[image]'),baseline:Number(line.baseline),x:Number(line.horizontalOffset)};try{l.ascent=Number(line.ascent);l.descent=Number(line.descent);l.end_x=Number(line.endHorizontalOffset);}catch(metric){l.metric_error=metric.message;}r.lines.push(l);}
            rows.push(r);
        }
        return {pages:doc.pages.length,footnotes_across_columns:doc.footnoteOptions.enableStraddling,paragraphs:rows};
    },
    reviseCaptions: function(doc,data,baseline,tokens,root,runtime){
        var current=data.layout,i,p,lastUsed=0,page,prior,baselineRuntime=SHAN.assemblyV0.read(root,'exports/history_v2/CAPTION_BASELINE_RUNTIME.json');
        data.layout=baseline;prior=this.auditExisting(doc,data,runtime);data.layout=current;
        doc.save(File(root+'/exports/history_v2/SHAN_HISTORY_CAPTIONS_R1_PRESERVED_'+new Date().getTime()+'.indd'));
        runtime.setStage('caption-spacing-only');
        for(i=0;i<data.blocks.length;i+=1){
            if(current.captions[data.blocks[i].id]){
                p=prior.story.paragraphs.item(i);
                // Keep the paragraph terminator: replacing its CR can transfer
                // the caption style to the following body paragraph.
                p.characters.itemByRange(0,p.characters.length-2).contents=current.captions[data.blocks[i].id].display;
            }
        }
        for(var key in tokens.paragraph_styles){if(tokens.paragraph_styles.hasOwnProperty(key) && key.indexOf('P_History_Caption')===0){doc.paragraphStyles.itemByName(key).spaceAfter=SHAN.utils.pt(tokens.paragraph_styles[key].space_after_mm);}}
        doc.recompose();this.check(!prior.story.overflows,'Caption-only edit overflowed existing frames');
        for(i=0;i<data.blocks.length;i+=1){this.check(prior.story.paragraphs.item(i).appliedParagraphStyle.name===baselineRuntime.paragraphs[i].style,'Caption edit changed paragraph style '+data.blocks[i].id);}
        // Remove a trailing page only when no source paragraph or image owns it.
        for(i=0;i<prior.story.paragraphs.length;i+=1){p=prior.story.paragraphs.item(i);for(var j=0;j<p.parentTextFrames.length;j+=1){page=p.parentTextFrames[j].parentPage;lastUsed=Math.max(lastUsed,page.documentOffset);}}
        for(i=0;i<doc.allGraphics.length;i+=1){page=doc.allGraphics[i].parentPage;if(page){lastUsed=Math.max(lastUsed,page.documentOffset);}}
        while(doc.pages.length-1>lastUsed){doc.pages.item(-1).remove();}
        doc.recompose();return this.auditExisting(doc,data,runtime);
    },
    groupGeometry: function (block) {
        // Geometry is calculated once in Python with the updated Skill utility.
        // JSX places that plan and reports independently measured DOM geometry.
        var plan=block.geometry,rows=[],i,j,f,item;
        this.check(plan && plan.frames.length===block.items.length,'Missing geometry '+block.id);
        for(i=0;i<plan.frames.length;i+=1){
            f=plan.frames[i];item=null;
            for(j=0;j<block.items.length;j+=1){if(block.items[j].id===f.image_id){item=block.items[j];}}
            this.check(item,'Unmapped geometry source '+f.image_id);
            rows.push({item:item,x:f.x,y:f.y,width:f.width,height:f.height,graphic:f.graphic,linked_file:f.source.path,linked_sha256:f.source.sha256,fit_mode:f.fit_mode});
        }
        return {width:plan.width,height:plan.height,inline_leading_mm:plan.height+plan.inline_clearance_mm,placements:rows};
    },
    placeGroup: function(doc,page,story,index,block,root,runtime){
        var geom=this.groupGeometry(block),pt=SHAN.utils.pt,rects=[],records=[],i,p,rect,graphic,anchor;
        runtime.setStage('image-group',{block:block.id,images:block.items.length});
        for(i=0;i<geom.placements.length;i+=1){
            p=geom.placements[i];rect=page.rectangles.add();rect.label='SHAN_HISTORY_V2:'+p.item.id;
            rect.appliedObjectStyle=doc.objectStyles.itemByName('O_Image_Archive');rect.strokeWeight=0;
            rect.fillColor=doc.swatches.itemByName('None');rect.strokeColor=doc.swatches.itemByName('None');
            rect.geometricBounds=[pt(p.y),pt(p.x),pt(p.y+p.height),pt(p.x+p.width)];
            var file=File(root+'/'+p.linked_file);this.check(file.exists,'Missing '+p.linked_file);
            var placed=rect.place(file,false);this.check(placed && placed.length===1,'Place '+p.item.id);
            rect.fit(FitOptions.PROPORTIONALLY);rect.fit(FitOptions.CENTER_CONTENT);graphic=placed[0];
            var g=p.graphic;graphic.geometricBounds=[pt(g.y),pt(g.x),pt(g.y+g.height),pt(g.x+g.width)];
            rects.push(rect);records.push({id:p.item.id,file:p.item.file,source_sha256:p.item.sha256,linked_file:p.linked_file,linked_sha256:p.linked_sha256,block:block.id,caption_block:block.caption_block,rect:rect,graphic:graphic});
        }
        if(rects.length>1){anchor=doc.groups.add(rects);anchor.label='SHAN_HISTORY_V2_GROUP:'+block.id;}else{anchor=rects[0];}
        var paragraph=story.paragraphs.item(index),ip=paragraph.insertionPoints.item(0);
        anchor.anchoredObjectSettings.insertAnchoredObject(ip,AnchorPosition.INLINE_POSITION);
        anchor.anchoredObjectSettings.anchorYoffset=0;
        // Span-column balancing must see the real inline block height, rather
        // than estimating this object-only line from the body's small type.
        story.paragraphs.item(index).leading=pt(geom.inline_leading_mm);
        return {anchor:anchor,records:records,height_mm:geom.height,width_mm:geom.width};
    },
    render: function(doc,data,tokens,section,root,runtime){
        data.blocks=this.orderBlocks(data.blocks,data.layout);doc.insertLabel('SHAN_HISTORY_V2_FLOW_MOVES',data.layout.version);
        doc.footnoteOptions.enableStraddling=true;
        var check=this.check,blocks=data.blocks,first=SHAN.history.addFrame(doc,doc.pages[0],true,tokens),strings=[],i,j;
        first.textFramePreferences.footnotesEnableOverrides=true;first.textFramePreferences.footnotesSpanAcrossColumns=true;
        SHAN.history.chapterMarker(doc,doc.pages[0],section);
        doc.textPreferences.smartTextReflow=false;
        for(i=0;i<blocks.length;i+=1){strings.push(blocks[i].type==='text'?this.displayText(data,blocks[i]):'');}
        first.contents=strings.join('\r')+'\r';var story=first.parentStory;story.label='SHAN_HISTORY_V2:main';
        check(story.paragraphs.length===blocks.length,'Initial paragraphs '+story.paragraphs.length);
        var indexById={};
        for(i=0;i<blocks.length;i+=1){
            var block=blocks[i],p=story.paragraphs.item(i),name=this.styleForBlock(block);
            if(i>0 && blocks[i-1].type==='media' && blocks[i-1].span_columns===2){name='P_History_Caption_Span';}
            p.applyParagraphStyle(doc.paragraphStyles.itemByName(name),true);indexById['$'+block.id]=i;
            if(name==='P_History_Roster' && (i+1===blocks.length || blocks[i+1].style!=='P_History_Roster')){p.keepWithNext=0;p.spaceAfter=SHAN.utils.pt(4);}
            if(i+1<blocks.length && blocks[i+1].type==='media' && blocks[i+1].description_block===block.id){p.keepWithNext=1;}
            var kept=data.layout.activity_image_keeps||[];
            for(j=0;j<kept.length;j+=1){if(block.id===kept[j].paragraph){check(i+1<blocks.length && blocks[i+1].id===kept[j].image,'Activity/image keep is not adjacent');p.keepWithNext=1;}}
        }
        // Source footnote offsets are measured before generated anchor characters.
        var notes=[];doc.footnoteOptions.footnoteTextStyle=doc.paragraphStyles.itemByName('P_History_Footnote');
        doc.footnoteOptions.restartNumbering=FootnoteRestarting.DONT_RESTART;
        doc.footnoteOptions.startAt=1;
        doc.footnoteOptions.noSplitting=false;doc.footnoteOptions.enableStraddling=true;
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
        var originalAdd=SHAN.history.addFrame,frames;
        SHAN.history.addFrame=function(d,page,isFirst,t){var f=originalAdd.call(SHAN.history,d,page,isFirst,t);f.textFramePreferences.footnotesEnableOverrides=true;f.textFramePreferences.footnotesSpanAcrossColumns=true;return f;};
        try{frames=SHAN.history.flow(doc,story,first,tokens,null);}finally{SHAN.history.addFrame=originalAdd;}doc.recompose();
        frames[frames.length-1].textFramePreferences.verticalBalanceColumns=true;doc.recompose();
        return this.audit(doc,data,story,imageRecords,notes,runtime);
    },
    auditExisting: function(doc,data,runtime){
        if(doc.extractLabel('SHAN_HISTORY_V2_FLOW_MOVES')){data.blocks=this.orderBlocks(data.blocks,data.layout);}
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
            check(actual===(block.type==='text'?this.displayText(data,block):''),'Text differs '+block.id+' actual='+actual.slice(0,90));
            check(p.lines.length>0 && p.parentTextFrames.length>0,'Invisible paragraph '+block.id);
            var firstLine=p.lines[0],lastLine=p.lines[p.lines.length-1],page=p.parentTextFrames[0].parentPage;
            paragraphReport.push({id:block.id,type:block.type,style:p.appliedParagraphStyle.name,text:block.type==='text'?block.text:'',display_text:actual,page:Number(page.name),first_baseline:firstLine.baseline,last_baseline:lastLine.baseline,space_after_pt:Number(p.spaceAfter),source_paragraph:block.source_paragraph,origin:block.origin});
            if(block.style==='P_History_Year'){years.push({text:block.text,page:Number(page.name),source:block.id});}
        }
        for(i=0;i<imageRecords.length;i+=1){
            var record=imageRecords[i],rect=record.rect,page=rect.parentPage,gb=rect.geometricBounds,pb=page.bounds;
            check(page && page.isValid,'Missing image page '+record.id);
            check(record.graphic.itemLink.status===LinkStatus.NORMAL,'Broken link '+record.id);
            if(gb[1]<pb[1]+SHAN.utils.pt(14)-.5 || gb[3]>pb[3]-SHAN.utils.pt(14)+.5){runtime.setStage('image-bounds-failure',{id:record.id,block:record.block,page:Number(page.name),frame:gb,page_bounds:pb,style:story.paragraphs.item(indexById['$'+record.block]).appliedParagraphStyle.name});}
            check(gb[0]>=pb[0]+SHAN.utils.pt(16)-.5 && gb[2]<=pb[2]-SHAN.utils.pt(19)+.5,'Image outside vertical body '+record.id);
            check(gb[1]>=pb[1]+SHAN.utils.pt(14)-.5 && gb[3]<=pb[3]-SHAN.utils.pt(14)+.5,'Image outside horizontal body '+record.id);
            var capPage=null;
            if(record.caption_block){var cap=story.paragraphs.item(indexById['$'+record.caption_block]);capPage=Number(cap.parentTextFrames[0].parentPage.name);check(capPage===Number(page.name),'Caption split '+record.id);}
            if(record.block==='approved_tail_g62'){var activity=story.paragraphs.item(indexById['$approved_tail_p215']);check(Number(activity.parentTextFrames[0].parentPage.name)===Number(page.name),'Final event separated from its poster');}
            var mediaP=story.paragraphs.item(indexById['$'+record.block]),tf=mediaP.parentTextFrames[0],tb=tf.geometricBounds;
            var columns=Number(tf.textFramePreferences.textColumnCount),gutter=Number(tf.textFramePreferences.textColumnGutter),columnWidth=(tb[3]-tb[1]-(columns-1)*gutter)/columns;
            var columnLeft=tb[1];if(blocks[indexById['$'+record.block]].span_columns!==2 && (gb[1]+gb[3])/2>tb[1]+columnWidth){columnLeft+=columnWidth+gutter;}
            var parent=rect.parent,anchor=parent.constructor.name==='Group'?parent:rect,ab=anchor.geometricBounds;
            function mmBox(b){return {x:(b[1]-pb[1])*25.4/72,y:(b[0]-pb[0])*25.4/72,width:(b[3]-b[1])*25.4/72,height:(b[2]-b[0])*25.4/72};}
            var linked=record.linked_file || String(record.graphic.itemLink.filePath).replace(/\\/g,'/');
            imageReport.push({id:record.id,file:record.file,source_sha256:record.source_sha256,linked_file:linked,linked_sha256:record.linked_sha256,block:record.block,caption_block:record.caption_block,page:Number(page.name),page_id:page.id,caption_page:capPage,bounds_pt:gb,width_mm:(gb[3]-gb[1])*25.4/72,height_mm:(gb[2]-gb[0])*25.4/72,frame_mm:mmBox(gb),graphic_mm:mmBox(record.graphic.geometricBounds),column_origin_x_mm:(columnLeft-pb[1])*25.4/72,column_width_mm:columnWidth*25.4/72,anchor_height_mm:(ab[2]-ab[0])*25.4/72,reserved_line_height_mm:Number(mediaP.leading)*25.4/72,effective_ppi:record.graphic.effectivePpi,rotation:Number(record.graphic.rotationAngle),shear:Number(record.graphic.shearAngle),link_status:'NORMAL'});
        }
        for(i=0;i<notes.length;i+=1){
            var n=notes[i],fn=n.nativeObject,nativeText=String(fn.contents),prefix=nativeText.slice(0,nativeText.length-n.text.length);
            check(nativeText.slice(prefix.length)===n.text && prefix.length>0 && prefix.length<5 && prefix.charCodeAt(0)!==9 && prefix.charCodeAt(0)!==32,'Footnote text/automatic number mismatch '+n.source_id+' prefix_codes='+prefix.charCodeAt(0)+','+prefix.charCodeAt(1));
            check(fn.storyOffset.parentTextFrames.length>0,'Footnote anchor invisible '+n.source_id);
            var noteLines=fn.texts[0].lines,noteWidths=[],maxWidth=0;
            for(j=0;j<noteLines.length;j+=1){var nw=(Number(noteLines[j].endHorizontalOffset)-Number(noteLines[j].horizontalOffset))*25.4/72;noteWidths.push(nw);maxWidth=Math.max(maxWidth,nw);}
            if(data.layout.footnotes_across_columns){check(doc.footnoteOptions.enableStraddling && maxWidth>76,'Footnote did not span both columns '+n.source_id+' width='+maxWidth);}
            footReport.push({source_id:n.source_id,block:n.block,text:n.text,automatic_number_prefix_codes:[prefix.charCodeAt(0),prefix.charCodeAt(1)],automatic_number_marker:true,anchor_page:Number(fn.storyOffset.parentTextFrames[0].parentPage.name),native_id:fn.id,marker_story_index:fn.storyOffset.index,span_across_columns:doc.footnoteOptions.enableStraddling,line_widths_mm:noteWidths,max_line_width_mm:maxWidth});
        }
        check(imageReport.length===data.images,'Image count');
        for(i=0;i<doc.fonts.length;i+=1){check(doc.fonts[i].status===FontStatus.INSTALLED,'Missing font '+doc.fonts[i].name);}
        return {status:'PASS',pages:doc.pages.length,source_sha256:data.source_sha256,paragraphs:paragraphReport,images:imageReport,footnotes:footReport,years:years,overset:false,missing_links:false,native_version:app.version,story:story};
    }
};
