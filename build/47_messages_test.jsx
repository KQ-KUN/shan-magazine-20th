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
    var a=SHAN.assemblyV0,root=File($.fileName).parent.parent.fsName.replace(/\\/g,'/'),out=root+'/exports/messages_v2',doc=null;
    var runtime={stage:'read-json',detail:{}};
    runtime.setStage=function(n,d){this.stage=n;this.detail=d||{};a.write(out+'/PROGRESS.txt','stage='+n+';context='+a.json(this.detail));};
    var unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel;
    try{
        app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
        var request=a.read(root,'exports/messages_v2/REQUEST.json'),map=a.read(root,'content/MESSAGES_IMPORT_MAP.json'),data=a.read(root,'exports/messages_v2/SOURCE_IMPORT.json'),t=a.read(root,'spec/MESSAGES_TOKENS.json'),base=a.read(root,'spec/VISUAL_TOKENS.json');
        runtime.setStage('verify-source',{source:map.source});a.check(data.source_sha256===map.sha256 && SHAN.historySource.sha256(SHAN.historySource.read(File(root+'/'+map.source),'BINARY'))===map.sha256,'Source DOCX hash mismatch');
        a.check(data.paragraphs.length===130 && map.entries.length===28,'Unexpected source inventory');
        runtime.setStage('resolve-messages-document');var context={warnings:[]};
        for(var di=0;di<app.documents.length;di+=1){var candidate=app.documents[di],tag=candidate.extractLabel('SHAN_MESSAGES_BUILD');if(tag==='v2' || tag==='rendered'){doc=candidate;break;}}
        if(!doc){runtime.setStage('create-document');doc=a.fresh(context,request.first_page||1);
            runtime.setStage('foundation-styles');SHAN.styles.create(doc,context);runtime.setStage('parents');SHAN.parents.create(doc,context);
            runtime.setStage('base-typography');SHAN.typography.apply(doc,base,context);SHAN.runningSystem.apply(doc,base);
        }
        a.number(doc,request.first_page||1);doc.insertLabel('SHAN_MESSAGES_BUILD','v2');
        runtime.setStage('messages-v2-skin');SHAN.messagesSkin.apply(doc,t,base,context);
        var report=SHAN.messages.render(doc,data,map,t,runtime);runtime.setStage('audit-final');
        report.focus=a.focus(doc);a.check(!report.focus.active_page_is_parent,'Focus stayed on Parent');report.source_sha256=map.sha256;
        report.skill_path='D:/Codex/skills/indesign-publication-production/SKILL.md';
        report.skill_references=['references/editorial-design-and-layout.md','references/indesign-runtime-guardrails.md'];
        var stem=request.component?'components/SHAN_MESSAGES_COMPONENT_V2':'SHAN_MESSAGES_REVIEW_V2';
        var reportStem=request.component?'COMPONENT_RUNTIME':'MESSAGES_RUNTIME_V2';
        runtime.setStage('save-export',{file:stem});doc.save(File(out+'/'+stem+'.indd'));SHAN.printBook.exportPDF(doc,File(out+'/'+stem+'.pdf'),false);
        if(!request.component){SHAN.printBook.exportSpreads(doc,File(out+'/SHAN_MESSAGES_SPREADS_V2.pdf'));}
        report.focus=a.focus(doc);runtime.setStage('write-report');a.write(out+'/'+reportStem+'.json',a.json(report));
        a.write(out+'/'+reportStem+'.txt','PASS;version='+app.version+';people=28;source_paragraphs=130;pages='+doc.pages.length+';overset=false;paragraphs=exact;name-fill=solid;role=right-same-line;focus='+doc.pages[0].name);
        return 'PASS Messages V2;people=28;source_paragraphs=130;pages='+doc.pages.length+';overset=false';
    }catch(e){var error='stage='+runtime.stage+';context='+a.json(runtime.detail)+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+(e.source?';source='+e.source:'')+';stack='+$.stack;
        try{a.write(out+'/MESSAGES_RUNTIME_ERROR_V2.txt',error);}catch(log){$.writeln(error);}return 'FAIL '+error;
    }finally{try{if(doc && doc.isValid){a.focus(doc);}}catch(focus){$.writeln(focus.message);}try{app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}catch(restore){$.writeln(restore.message);}}
}());
