var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
/* V8 display policy. Frozen renderers, source files and History are untouched. */
SHAN.ebookV8 = {
    style: function(doc,name){var s=doc.paragraphStyles.itemByName(name);SHAN.assemblyV0.check(s && s.isValid,'V8 missing style '+name);return s;},
    apply: function(doc,kind){
        var titles={feature:'P_Feature_Title',interview:'P_Article_Title',fiction:'P_Article_Title',memoir:'P_Article_Title',front_note:'P_FrontNote_Title'},
            names={feature:['P_Feature_Author'],interview:['P_Author','P_Metadata','P_Article_Subtitle'],fiction:['P_Author','P_Metadata'],memoir:['P_Author'],front_note:['P_FrontNote_Signature']},i,s;
        if(titles[kind]){this.style(doc,titles[kind]).justification=Justification.LEFT_ALIGN;}
        if(names[kind]){for(i=0;i<names[kind].length;i+=1){s=this.style(doc,names[kind][i]);s.fillColor=doc.colors.itemByName('C_TEXT');s.fillTint=100;}}
        if(kind==='feature'){this.style(doc,'P_Feature_Author').justification=Justification.LEFT_ALIGN;}
    },
    render: function(root,c,start,runtime){
        var a=SHAN.assemblyV0,context={warnings:[],runtime:runtime},doc=a.fresh(context,start),base=a.read(root,'spec/VISUAL_TOKENS.json'),t,media,result;
        runtime.document=doc;SHAN.styles.create(doc,context);SHAN.parents.create(doc,context);
        SHAN.typography.apply(doc,base,context);SHAN.runningSystem.apply(doc,base);
        runtime.setStage('standalone:'+c.kind+':styles',{start_page:start,source:c.source});
        if(c.kind==='interview'){
            SHAN.interviewSkin.apply(doc,base);this.apply(doc,c.kind);
            SHAN.interview.create(doc,File(root+'/'+c.source),c.article_id,context);
        }else if(c.kind==='fiction'){
            t=a.read(root,'spec/FICTION_TOKENS.json');SHAN.fictionSkin.apply(doc,t,base,context);this.apply(doc,c.kind);
            result=SHAN.fiction.create(doc,File(root+'/'+c.source),c.article_id);
            SHAN.publicationRefinements.fiction(doc,result,a.read(root,'content/FICTION_WORK_INFO.json'),c.id);
        }else if(c.kind==='memoir'){
            t=a.read(root,'spec/MEMOIR_TOKENS.json');media=a.read(root,c.media_manifest);
            if(c.id==='memoir_gloomy'){
                var spans=[],i;for(i=0;i<t.span_styles.length;i+=1){if(t.span_styles[i]!=='P_Memoir_Media' && t.span_styles[i]!=='P_Memoir_Caption'){spans.push(t.span_styles[i]);}}t.span_styles=spans;
                media.height_mm=media.height_mm*73/media.width_mm;media.width_mm=73;
                t.media_style.space_before_mm=1.5;t.media_style.space_after_mm=.8;t.caption_style.space_after_mm=2;
            }
            SHAN.memoirSkin.apply(doc,t,base,context);this.apply(doc,c.kind);
            if(c.id==='memoir_gloomy'){var ms=this.style(doc,'P_Memoir_Media');ms.pointSize=2;ms.leading=3;ms.keepWithNext=1;this.style(doc,'P_Memoir_Caption').keepWithNext=0;}
            result=SHAN.memoir.create(doc,File(root+'/'+c.source),c.id==='memoir_gloomy'?'memoir_gloomy_biologist_cry':c.article_id,File(root+'/'+media.file),media.width_mm,media.height_mm);
            if(c.id==='memoir_pancake'){SHAN.publicationRefinements.pancake(doc,result,root,a.read(root,'content/TASK16_DISPLAY.json').pancake);}
        }else if(c.kind==='feature'){
            t=a.read(root,'spec/FEATURE_TOKENS.json');media=a.read(root,c.media_manifest);
            // Half-column evidence image fits the current column; a full-width
            // portrait forced the image to the next column and added a tail page.
            if(c.id==='feature_beyond_ridge'){media.media[0].height_mm=media.media[0].height_mm*36.5/media.media[0].width_mm;media.media[0].width_mm=36.5;}
            SHAN.featureSkin.apply(doc,t,base,context);this.apply(doc,c.kind);
            if(c.id==='feature_monday_cup_backstage'){result=SHAN.mondayCup.create(doc,c,root);}else{result=SHAN.feature.create(doc,File(root+'/'+c.source),c.article_id,media,root);}
        }else if(c.kind==='front_note'){
            t=a.read(root,'spec/FRONT_NOTE_TOKENS.json');SHAN.frontNoteSkin.apply(doc,t,base,context);this.apply(doc,c.kind);
            result=SHAN.frontNote.create(doc,File(root+'/'+c.source),c.article_id,t,{hasSignature:false});SHAN.frontNote.assertRendered(doc,result,'写在《山》前','而新的地层，仍在形成。');
        }else if(c.kind==='association_profile'){
            t=a.read(root,'spec/ASSOCIATION_PROFILE_TOKENS.json');media=a.read(root,c.source);
            for(var n=0;n<media.fields.length;n+=1){if(media.fields[n].type==='image'){media.fields[n].value='assets/ebook_v8/ASSOCIATION_EMBLEM_USER_SUPPLIED.png';}}
            SHAN.associationProfileSkin.apply(doc,t,base,context);result=SHAN.associationProfile.render(doc,media,t,root);SHAN.associationProfile.assertRendered(doc,result,media,t);
        }else if(c.kind==='xingyue'){
            t=a.read(root,'spec/XINGYUE_TOKENS.json');SHAN.xingyueSkin.apply(doc,t,base,context);result=SHAN.xingyue.create(doc,root,t,runtime);
        }else{throw new Error('V8 prohibited/unsupported render '+c.id);}
        return {doc:doc,first:0,count:doc.pages.length,warnings:context.warnings,rendered:result};
    },
    audit: function(result,c,expected,start){
        var a=SHAN.assemblyV0,doc=result.doc,base=a.audit(result,start),stories=[],seen={},i,j,f,s,p,texts=[],styles=[],images=[],b,pb,g,link;
        for(i=0;i<doc.pages.length;i+=1){for(j=0;j<doc.pages[i].textFrames.length;j+=1){f=doc.pages[i].textFrames[j];s=f.parentStory;if(!seen[s.id]){seen[s.id]=true;stories.push(s);}}}
        // Only owned document-page stories, not Parent stories or a global error count.
        for(i=0;i<stories.length;i+=1){s=stories[i];for(j=0;j<s.paragraphs.length;j+=1){p=s.paragraphs[j];
            text=SHAN.historySource.paragraphText(p.contents,p.allGraphics.length);if(j===0 && text.charCodeAt(0)===0xFEFF){text=text.substring(1);}
            a.check(p.lines.length>0 && p.parentTextFrames.length>0,'V8 invisible paragraph '+c.id+' / '+(j+1));texts.push(text);
            styles.push({text:text,style:p.appliedParagraphStyle.name,justification:String(p.justification),color:p.fillColor.name,tint:p.fillTint});
        }}
        if(expected){a.check(texts.length===expected.length,'V8 paragraph count '+c.id+' actual='+texts.length+' expected='+expected.length);for(i=0;i<texts.length;i+=1){a.check(texts[i]===expected[i],'V8 source text mismatch '+c.id+' / paragraph '+(i+1)+' actual='+texts[i]+' expected='+expected[i]);}}
        for(i=0;i<doc.allGraphics.length;i+=1){g=doc.allGraphics[i];f=g.parent;pb=f.parentPage;a.check(pb && pb.isValid,'V8 graphic without document page '+c.id+' / '+i);b=f.geometricBounds;link=g.itemLink;
            a.check(link && link.isValid && link.status===LinkStatus.NORMAL,'V8 invalid image link '+c.id+' / '+i);
            a.check(Math.abs(g.horizontalScale-g.verticalScale)<.02,'V8 unexpected stretch '+c.id+' / '+i);
            images.push({file:link.filePath,label:f.label,page:Number(pb.name),width_mm:(b[3]-b[1])*25.4/72,height_mm:(b[2]-b[0])*25.4/72,bounds:b,proportional:true});
        }
        var out={status:'PASS',id:c.id,pages:doc.pages.length,start_page:start,end_page:start+doc.pages.length-1,paragraphs:texts,paragraph_equality:expected?true:null,styles:styles,images:images,overset:false,links_normal:true,fonts_installed:true,native_version:app.version};
        if(c.kind==='xingyue'){out.xingyue=SHAN.chapter.parseJSON(doc.extractLabel('SHAN_TASK21_XINGYUE'));a.check(out.xingyue.paragraphs===28 && out.xingyue.images.length===3,'V8 XingYue integrity');}
        out.focus=a.focus(doc);return out;
    }
};
