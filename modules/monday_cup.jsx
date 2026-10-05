var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.mondayCup = {
    id: "feature_monday_cup_backstage",
    validate: function(doc,result,expected) {
        var a=SHAN.assemblyV0,story=result.story,rows=expected.paragraphs,i,j,p,text,lines,frames,visible=0;
        a.check(story && story.isValid && !story.overflows,"MondayCup: main story missing/overset");
        a.check(story.paragraphs.length===rows.length,"MondayCup: paragraph count differs from immutable DOCX");
        for(i=0;i<rows.length;i+=1){
            p=story.paragraphs[i];a.check(p && p.isValid,"MondayCup: invalid source paragraph "+(i+1));
            text=String(p.contents).replace(/\r$/,'');
            a.check(text===rows[i],"MondayCup: character equality failed at source paragraph "+(i+1));
            lines=p.lines;a.check(lines && lines.length>0,"MondayCup: source paragraph has no rendered lines "+(i+1));
            for(j=0;j<lines.length;j+=1){frames=lines[j].parentTextFrames;
                a.check(frames && frames.length>0 && frames[0].isValid && frames[0].parentPage && frames[0].parentPage.isValid,"MondayCup: invisible line in source paragraph "+(i+1)+" / line "+(j+1));}
            visible+=text.length;
        }
        a.check(result.graphics===0,"MondayCup: unexpected images");
        return {source_paragraphs:rows.length,visible_characters:visible,paragraph_equality:true,all_lines_on_document_pages:true,overset:false};
    },
    create: function(doc,c,root) {
        var a=SHAN.assemblyV0,map=a.read(root,c.import_map),fixture=a.read(root,"exports/print_v3/MONDAY_CUP_SOURCE_TEXT.json");
        a.check(SHAN.historySource.sha256(SHAN.historySource.read(File(root+"/"+map.source),"BINARY"))===map.source_sha256,"MondayCup: source DOCX hash changed");
        a.check(SHAN.historySource.sha256(SHAN.historySource.read(File(root+"/"+map.layout_source),"BINARY"))===map.layout_sha256,"MondayCup: layout DOCX hash changed");
        a.check(fixture.source_sha256===map.source_sha256,"MondayCup: source fixture does not match source");
        var result=SHAN.feature.create(doc,File(root+"/"+c.layout_source),c.article_id,a.read(root,c.media_manifest),root);
        var story=result.story;
        // Word import adds a leading U+FEFF encoding marker on this host. Only
        // remove that one marker when the verified source has none. All 18
        // paragraph strings must then compare exactly, without normalization.
        var removedImportBOM=false;
        if(String(story.contents).charCodeAt(0)===0xFEFF && fixture.paragraphs[0].charCodeAt(0)!==0xFEFF){story.characters[0].remove();removedImportBOM=true;}
        var i,p,mark=SHAN.utils.ensureNamed(doc.characterStyles,"C_MondayCup_Number");
        mark.fillColor=doc.swatches.itemByName("C_SDU_RED");
        // These are long body paragraphs. Style only the literal circled number;
        // no splitting, new headings, change to body size or full-paragraph keep.
        for(i=0;i<map.paragraphs.length;i+=1){p=story.paragraphs[i];
            if(map.paragraphs[i].number_marker){p.characters[0].appliedCharacterStyle=mark;p.spaceBefore=SHAN.utils.pt(1.4);}
            if(i===0){p.keepWithNext=2;}else if(i===1){p.keepWithNext=1;}else{p.keepWithNext=0;p.keepAllLinesTogether=false;p.keepFirstLines=2;p.keepLastLines=2;}
        }
        result.pages=SHAN.feature.flow(doc,story,story.textContainers[story.textContainers.length-1],c.article_id);
        // flow() returns newly added frames + 1; document pages is authoritative.
        result.pages=doc.pages.length;result.overset=story.overflows;result.integrity=this.validate(doc,result,fixture);result.integrity.removed_single_import_encoding_marker=removedImportBOM;
        return result;
    }
};
