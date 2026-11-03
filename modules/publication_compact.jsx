var SHAN = typeof SHAN === 'undefined' ? {} : SHAN;
SHAN.publicationCompact = {
    position:function(line){
        var frame=line.parentTextFrames[0],b=frame.geometricBounds,n=Number(frame.textFramePreferences.textColumnCount),gap=Number(frame.textFramePreferences.textColumnGutter),w=(b[3]-b[1]-(n-1)*gap)/n;
        return {frame:frame.id,page:frame.parentPage.id,column:n===2 && line.horizontalOffset>b[1]+w+gap/2?1:0,bottom:b[2],baseline:line.baseline};
    },
    same:function(a,b){return a.frame===b.frame && a.column===b.column;},
    refine:function(doc,story){
        var check=SHAN.assemblyV0.check,view=[],body=[],captions=[],moves=[],gaps=[],i,j,p;
        function role(p){var s=p.appliedParagraphStyle.name;return /Media/.test(s)?'media':/Caption/.test(s)?'caption':'body';}
        for(i=0;i<story.paragraphs.length;i++){
            p=story.paragraphs[i];var r=role(p);view.push({id:i,role:r,text:String(p.contents)});
            if(r==='body'){body.push(String(p.contents));if(/Body|Lead/.test(p.appliedParagraphStyle.name)){p.keepWithNext=0;p.keepAllLinesTogether=false;}}
            if(r==='caption'){captions.push(String(p.contents));p.keepWithNext=0;}
            if(r==='media'){p.keepWithNext=1;}
        }
        doc.recompose();
        for(var pass=0;pass<5;pass++){
            var changed=false;
            for(i=1;i<view.length-2;i++){
                if(view[i].role!=='media' || view[i+1].role!=='caption'){continue;}
                var prev=story.paragraphs[i-1],cur=story.paragraphs[i];
                if(!prev.lines.length || !cur.lines.length){continue;}
                var a=this.position(prev.lines.item(-1)),b=this.position(cur.lines[0]);
                if(this.same(a,b) || a.bottom-a.baseline-Number(prev.spaceAfter)<22){continue;}
                var k=i+2;
                while(k<view.length && !String(view[k].text).replace(/[\r\s]/g,'')){k++;}
                if(k>=view.length || !/Body|Lead/.test(story.paragraphs[k].appliedParagraphStyle.name)){continue;}
                var lo=story.paragraphs[i].insertionPoints[0].index,hi=story.paragraphs[i+1].insertionPoints.item(-1).index-1;
                story.characters.itemByRange(lo,hi).move(LocationOptions.AFTER,story.paragraphs[k]);
                var moving=view.splice(i,2);view.splice(k-1,0,moving[0],moving[1]);
                moves.push({media_id:moving[0].id,caption_id:moving[1].id,after_id:view[k-2].id,reason:'Pull following complete body paragraph into unused column region'});
                changed=true;doc.recompose();
            }
            if(!changed){break;}
        }
        for(i=0;i<view.length-1;i++){
            if(view[i].role!=='caption'){continue;}
            p=story.paragraphs[i];j=i+1;
            while(j<view.length && !String(story.paragraphs[j].contents).replace(/[\r\s]/g,'')){
                var empty=story.paragraphs[j];empty.pointSize=.1;empty.leading=.1;empty.spaceBefore=0;empty.spaceAfter=0;j++;
            }
            if(j>=view.length || !/Body|Lead/.test(story.paragraphs[j].appliedParagraphStyle.name)){continue;}
            var next=story.paragraphs[j];next.spaceBefore=0;doc.recompose();
            if(!p.lines.length || !next.lines.length){continue;}
            var capLine=p.lines.item(-1),bodyLine=next.lines[0],cp=this.position(capLine),bp=this.position(bodyLine);
            if(!this.same(cp,bp)){continue;}
            // Native glyph ascent/descent measure ink rather than a padded text-frame box.
            var bottom=Number(capLine.baseline)+Number(capLine.descent),top=Number(bodyLine.baseline)-Number(bodyLine.ascent),target=Number(next.leading),before=top-bottom;
            p.spaceAfter=Math.max(0,Number(p.spaceAfter)+target-before);doc.recompose();
            capLine=story.paragraphs[i].lines.item(-1);bodyLine=story.paragraphs[j].lines[0];
            var actual=Number(bodyLine.baseline)-Number(bodyLine.ascent)-Number(capLine.baseline)-Number(capLine.descent);
            check(Math.abs(actual-target)<.7,'Caption/body ink gap mismatch '+i+': '+actual+' expected '+target);
            gaps.push({caption_id:view[i].id,body_id:view[j].id,before_pt:before,actual_pt:actual,target_pt:target});
        }
        var actualBody=[],actualCaptions=[];
        for(i=0;i<view.length;i++){p=story.paragraphs[i];check(String(p.contents)===view[i].text,'Moved paragraph text changed '+view[i].id);if(view[i].role==='body'){actualBody.push(String(p.contents));}if(view[i].role==='caption'){actualCaptions.push(String(p.contents));}}
        check(body.join('')===actualBody.join(''),'Body reading order changed');check(captions.join('')===actualCaptions.join(''),'Caption sequence changed');check(!story.overflows,'Compact story overset');
        return {body_exact:true,caption_exact:true,display_moves:moves,caption_gaps:gaps};
    }
};
