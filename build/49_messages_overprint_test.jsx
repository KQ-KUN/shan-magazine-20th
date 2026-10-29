#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../modules/history_source.jsx"
#include "../modules/assembly_v0.jsx"
#include "../modules/print_book.jsx"
#include "../modules/messages.jsx"
#include "../visual/messages_skin.jsx"
(function(){
    var a=SHAN.assemblyV0,root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/messages_revision_20261024',doc=null;
    var runtime={stage:'read-json',detail:{}};
    runtime.setStage=function(n,d){this.stage=n;this.detail=d||{};a.write(out+'/PROGRESS.txt','stage='+n+';context='+a.json(this.detail));};
    var unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel;
    try{
        app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
        var request=a.read(root,'exports/messages_revision_20261024/REQUEST.json'),map=a.read(root,'content/MESSAGES_IMPORT_MAP.json'),data=a.read(root,'exports/messages_v2/SOURCE_IMPORT.json'),t=a.read(root,'spec/MESSAGES_TOKENS.json'),base=a.read(root,'spec/VISUAL_TOKENS.json');
        runtime.setStage('verify-source',{source:map.source});a.check(data.source_sha256===map.sha256 && SHAN.historySource.sha256(SHAN.historySource.read(File(root+'/'+map.source),'BINARY'))===map.sha256,'Source DOCX hash mismatch');
        a.check(data.paragraphs.length===map.source_paragraphs && map.entries.length===map.people,'Unexpected source inventory');
        runtime.setStage('resolve-messages-document');var context={warnings:[]};
        for(var di=0;di<app.documents.length;di+=1){
            var candidate=app.documents[di].getElements()[0],tag=candidate.extractLabel('SHAN_MESSAGES_BUILD'),ownedPath='';
            try{ownedPath=candidate.fullName.fsName.replace(/\\/g,'/');}catch(unsaved){}
            if(tag==='overprint' && candidate.modified && ownedPath===out+'/SHAN_MESSAGES_REVISION_20261024.indd'){
                candidate.save(File(out+'/SHAN_MESSAGES_PRESERVED_'+new Date().getTime()+'.indd'));
                continue;
            }
            if(tag==='overprint' && !candidate.modified){doc=candidate;break;}
        }
        var saved=File(out+'/SHAN_MESSAGES_REVISION_20261024.indd');
        if(!doc && request.fast && saved.exists){runtime.setStage('open-saved-messages-document');doc=app.open(saved);a.check(!doc.modified,'Saved document has unsaved edits');}
        if(!doc){runtime.setStage('create-document');doc=a.fresh(context,request.first_page||1);
            runtime.setStage('foundation-styles');SHAN.styles.create(doc,context);runtime.setStage('parents');SHAN.parents.create(doc,context);
            runtime.setStage('base-typography');SHAN.typography.apply(doc,base,context);SHAN.runningSystem.apply(doc,base);
        }
        a.number(doc,request.first_page||1);doc.insertLabel('SHAN_MESSAGES_BUILD','overprint');
        runtime.setStage('messages-overprint-skin');SHAN.messagesSkin.apply(doc,t,base,context);
        if(request.sample){
            var sampleData={paragraphs:[]}, sampleMap={entries:[]}, selected=[0,6,7], sourceToSample={};
            for(var si=0;si<selected.length;si+=1){
                var original=map.entries[selected[si]], item={id:original.id,header_paragraph:sampleData.paragraphs.length+1,role_range:original.role_range,name_range:original.name_range,body_paragraphs:[]};
                sourceToSample["$"+original.header_paragraph]=sampleData.paragraphs.length+1;sampleData.paragraphs.push(data.paragraphs[original.header_paragraph-1]);
                for(var bi=0;bi<original.body_paragraphs.length;bi+=1){sourceToSample["$"+original.body_paragraphs[bi]]=sampleData.paragraphs.length+1;item.body_paragraphs.push(sampleData.paragraphs.length+1);sampleData.paragraphs.push(data.paragraphs[original.body_paragraphs[bi]-1]);}
                sampleMap.entries.push(item);
            }
            var centeredSample=[], underlineSample=[];
            for(si=0;si<map.centered_titles.length;si+=1){var cm=map.centered_titles[si];if(sourceToSample["$"+cm.source_paragraph]){centeredSample.push({source_paragraph:sourceToSample["$"+cm.source_paragraph],style:cm.style});}}
            for(si=0;si<map.double_underlines.length;si+=1){var um=map.double_underlines[si];if(sourceToSample["$"+um.source_paragraph]){underlineSample.push({source_paragraph:sourceToSample["$"+um.source_paragraph],start:um.start,end:um.end,character_style:um.character_style});}}
            data=sampleData;map.entries=sampleMap.entries;map.centered_titles=centeredSample;map.double_underlines=underlineSample;t.last_page_balance=false;
        }
        var report=SHAN.messages.render(doc,data,map,t,runtime);report.sample=!!request.sample;runtime.setStage('audit-final');
        report.focus=a.focus(doc);a.check(!report.focus.active_page_is_parent,'Focus stayed on Parent');report.source_sha256=map.sha256;
        report.skill_path='D:/Codex/skills/indesign-publication-production/SKILL.md';
        report.skill_references=['references/editorial-design-and-layout.md','references/indesign-runtime-guardrails.md'];
        var stem=request.sample?'SHAN_MESSAGES_REVISION_SAMPLES':'SHAN_MESSAGES_REVISION_20261024';
        var reportStem=request.sample?'SAMPLE_RUNTIME':'MESSAGES_RUNTIME';
        runtime.setStage('save-export',{file:stem});doc.save(File(out+'/'+stem+'.indd'));SHAN.printBook.exportPDF(doc,File(out+'/'+stem+'.pdf'),false);
        if(!request.sample && !request.fast){SHAN.printBook.exportSpreads(doc,File(out+'/SHAN_MESSAGES_OVERPRINT_SPREADS.pdf'));}
        report.focus=a.focus(doc);runtime.setStage('write-report');a.write(out+'/'+reportStem+'.json',a.json(report));
        a.write(out+'/'+reportStem+'.txt','PASS;version='+app.version+';people='+report.people+';source_paragraphs='+report.source_paragraphs+';pages='+doc.pages.length+';overset=false;paragraphs=exact;name-plates=2;role='+t.styles.P_Message_Header.size_pt+'pt-right-centered;name-font='+t.name_family+'/'+t.name_weight+';focus='+doc.pages[0].name);
        return 'PASS Messages overprint;people='+report.people+';source_paragraphs='+report.source_paragraphs+';pages='+doc.pages.length+';overset=false';
    }catch(e){var error='stage='+runtime.stage+';context='+a.json(runtime.detail)+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+(e.source?';source='+e.source:'')+';stack='+$.stack;
        try{a.write(out+'/MESSAGES_RUNTIME_ERROR.txt',error);}catch(log){$.writeln(error);}return 'FAIL '+error;
    }finally{try{if(doc && doc.isValid){a.focus(doc);}}catch(focus){$.writeln(focus.message);}try{app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}catch(restore){$.writeln(restore.message);}}
}());
