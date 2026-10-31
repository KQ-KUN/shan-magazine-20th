var SHAN = typeof SHAN === 'undefined' ? {} : SHAN;
SHAN.historyReflow = {
    linePosition: function(line){
        var tf=line.parentTextFrames[0],page=tf.parentPage,b=tf.geometricBounds;
        var count=Number(tf.textFramePreferences.textColumnCount),gap=Number(tf.textFramePreferences.textColumnGutter);
        var width=(b[3]-b[1]-(count-1)*gap)/count,x=Number(line.horizontalOffset);
        return {page:Number(page.name),column:count===2 && x>b[1]+width+gap/2?1:0,baseline:Number(line.baseline),bottom:Number(b[2])};
    },
    ends: function(p){
        if(!p.lines.length){return null;}
        return {first:this.linePosition(p.lines.item(0)),last:this.linePosition(p.lines.item(p.lines.length-1))};
    },
    bottom: function(story,pos){
        var bottom=pos.bottom;
        for(var i=0;i<story.footnotes.length;i+=1){var f=story.footnotes[i];if(!f.lines.length){continue;}var n=this.linePosition(f.lines.item(0));if(n.page===pos.page){bottom=Math.min(bottom,n.baseline-18);}}
        return bottom;
    },
    probe: function(){
        // Verify native Text.move with an inline anchor before touching the saved history.
        var d=null;
        try{
            d=app.documents.add(false);var f=d.pages[0].textFrames.add();f.geometricBounds=[20,20,500,350];f.contents='A\rM\rCAP\rB\rC\rD\r';var s=f.parentStory;
            var rect=d.pages[0].rectangles.add();rect.geometricBounds=[0,0,10,10];rect.anchoredObjectSettings.insertAnchoredObject(s.paragraphs.item(1).insertionPoints.item(0),AnchorPosition.INLINE_POSITION);
            var lo=s.paragraphs.item(1).insertionPoints.item(0).index,hi=s.paragraphs.item(2).insertionPoints.item(-1).index-1;
            s.characters.itemByRange(lo,hi).move(LocationOptions.AFTER,s.paragraphs.item(3));d.recompose();
            SHAN.assemblyV0.check(String(s.contents).replace(/\uFFFC/g,'')==='A\rB\rM\rCAP\rC\rD\r','Native anchored paragraph move probe failed');
            SHAN.assemblyV0.check(rect.isValid && rect.parent.constructor.name==='Character','Move lost inline anchor');
        }finally{if(d && d.isValid){d.close(SaveOptions.NO);}}
    },
    snapshot: function(doc,story,view){
        var rows=[],gaps=[],occupied={},bottoms={},noteBottoms={},i,j,p,line,pos,key,box;
        for(i=0;i<story.footnotes.length;i+=1){var fn=story.footnotes[i];if(fn.lines.length){pos=this.linePosition(fn.lines.item(0));noteBottoms[pos.page]=Math.min(noteBottoms[pos.page]||pos.bottom,pos.baseline-18);}}
        for(i=0;i<view.length;i+=1){
            p=story.paragraphs.item(i);box=this.ends(p);rows.push({id:view[i].id,type:view[i].type,style:p.appliedParagraphStyle.name,position:box});
            for(j=0;j<p.lines.length;j+=1){line=p.lines.item(j);pos=this.linePosition(line);key=String(pos.page)+':'+pos.column;occupied[key]=Math.max(occupied[key]||0,pos.baseline);bottoms[key]=Math.min(pos.bottom,noteBottoms[pos.page]||pos.bottom);}
        }
        for(key in occupied){if(occupied.hasOwnProperty(key)){gaps.push({column:key,gap_mm:Math.max(0,bottoms[key]-occupied[key])*25.4/72,last_baseline:occupied[key],body_bottom:bottoms[key]});}}
        return {pages:doc.pages.length,paragraphs:rows,column_end_gaps:gaps};
    },
    compact: function(doc,data,layout,runtime){
        var story=null,i,j;
        for(i=0;i<doc.stories.length;i+=1){if(doc.stories[i].label==='SHAN_HISTORY_V2:main'){story=doc.stories[i];break;}}
        var check=SHAN.assemblyV0.check;check(story && story.paragraphs.length===data.blocks.length,'Wrong saved History story');
        var view=SHAN.historyV2.orderBlocks(data.blocks,layout),before=this.snapshot(doc,story,view),moves=[],deferrals={};
        // Keep headings and their first text; remove only accidental body/roster-to-image chains.
        for(i=0;i<view.length;i+=1){var p=story.paragraphs.item(i),b=view[i],name=p.appliedParagraphStyle.name;
            if(b.type==='media'){p.keepWithNext=b.caption_block?1:0;continue;}
            if(name==='P_History_Event' || name==='P_History_Event_Image' || name==='P_History_Editorial' || name==='P_History_Roster'){p.keepWithNext=0;}
            if(name==='P_History_Event' || name==='P_History_Event_Image' || name==='P_History_Editorial'){p.keepAllLinesTogether=false;}
        }
        doc.recompose();var relaxed=this.snapshot(doc,story,view),options=layout.text_first_reflow,pass,changed;
        for(pass=0;pass<options.max_passes;pass+=1){
            changed=false;
            for(i=1;i<view.length-2;i+=1){
                b=view[i];if(b.type!=='media' || (deferrals[b.id]||0)>=options.max_deferrals_per_unit){continue;}
                var previous=this.ends(story.paragraphs.item(i-1)),current=this.ends(story.paragraphs.item(i));
                if(!previous || !current || (previous.last.page===current.first.page && previous.last.column===current.first.column)){continue;}
                var available=this.bottom(story,previous.last)-previous.last.baseline-Number(story.paragraphs.item(i-1).spaceAfter);
                if(available<options.min_gap_pt){continue;}
                // Consecutive media/caption units travel together, retaining picture order.
                var end=i,ids=[],candidate=i;
                while(candidate<view.length && view[candidate].type==='media'){
                    ids.push(view[candidate].id);end=candidate;
                    if(view[candidate].caption_block){check(view[candidate+1].id===view[candidate].caption_block,'Nonadjacent caption '+view[candidate].id);end=candidate+1;ids.push(view[end].id);}
                    candidate=end+1;
                }
                if(candidate>=view.length || view[candidate].type!=='text'){continue;}
                var target=candidate;
                // Do not insert an image between a heading and its roster/first body paragraph.
                while(target<view.length && view[target].type==='text' && (view[target].style==='P_History_Year' || view[target].style==='P_History_Roster_Intro' || view[target].style==='P_History_Roster')){target+=1;}
                if(target>=view.length || view[target].type!=='text' || String(view[target].style).indexOf('P_History_Caption')===0){continue;}
                var targetPosition=this.ends(story.paragraphs.item(target));
                if(!targetPosition || targetPosition.first.page>current.first.page+1){continue;}
                runtime.setStage('fill-column-with-text',{media:b.id,after:view[target].id,gap_mm:available*25.4/72,pass:pass+1});
                var startIndex=story.paragraphs.item(i).insertionPoints.item(0).index;
                var endIndex=story.paragraphs.item(end).insertionPoints.item(-1).index-1;
                var targetId=view[target].id,oldAnchor=view[i-1].id,moving=view.slice(i,end+1);
                story.characters.itemByRange(startIndex,endIndex).move(LocationOptions.AFTER,story.paragraphs.item(target));
                view.splice(i,moving.length);var newIndex=target-moving.length+1;
                for(j=0;j<moving.length;j+=1){view.splice(newIndex+j,0,moving[j]);if(moving[j].type==='media'){deferrals[moving[j].id]=(deferrals[moving[j].id]||0)+1;}}
                var move={ids:ids,after:targetId,previous_after:oldAnchor,reason:'Pull following complete prose forward into unused column space; defer intact image-caption unit',gap_before_mm:available*25.4/72};
                moves.push(move);layout.flow_moves.push(move);changed=true;doc.recompose();
                check(story.paragraphs.length===view.length,'Paragraph count changed during move');
            }
            if(!changed){break;}
        }
        // Flow may now need fewer pages. Remove only actually empty trailing task-owned frames/pages.
        doc.recompose();var removed=0;
        while(doc.pages.length>1){
            var last=doc.pages.item(-1),body=null;
            for(i=0;i<last.textFrames.length;i+=1){if(last.textFrames[i].label==='SHAN_HISTORY:body'){body=last.textFrames[i];break;}}
            if(!body || body.lines.length || last.allGraphics.length || story.overflows){break;}
            last.remove();removed+=1;doc.recompose();
        }
        var ending=doc.pages.item(-1);
        for(i=0;i<ending.textFrames.length;i+=1){if(ending.textFrames[i].label==='SHAN_HISTORY:body'){ending.textFrames[i].textFramePreferences.verticalBalanceColumns=true;break;}}
        doc.recompose();var after=this.snapshot(doc,story,view);check(!story.overflows,'Reflow overset');check(doc.allGraphics.length===data.images,'Image count changed');
        doc.insertLabel('SHAN_HISTORY_V2_FLOW_MOVES',layout.version);
        return {before:before,after_keep_relaxation:relaxed,after:after,moves:moves,layout:layout,removed_empty_trailing_pages:removed};
    }
};
