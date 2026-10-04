param([string]$ProjectRoot = (Join-Path $PSScriptRoot '..'))
$ErrorActionPreference = 'Stop'
$task15Root = [IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
$task15Output = Join-Path $task15Root 'exports/task15'
New-Item -ItemType Directory -Force -Path $task15Output | Out-Null
$task15App = New-Object -ComObject InDesign.Application.2026
$task15Headers = ([IO.File]::ReadAllText((Join-Path $task15Root 'build/14_magazine_assembly_v0.jsx')) -split '\(function \(\) \{',2)[0]
$task15Headers = $task15Headers.Replace('../',($task15Root+'/'))
$task15Code = $task15Headers + @'
(function(){
 var unit=app.scriptPreferences.measurementUnit,interaction=app.scriptPreferences.userInteractionLevel,stage='interview:initialise',id=null;
 var root='__ROOT__',doc=null,reports=[];
 try{
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  // Repeated self-validation may replace only this runner's exact output documents.
  for(var previous=app.documents.length-1;previous>=0;previous--){
   var old=app.documents[previous],path='';try{path=old.fullName.fsName.replace(/\\/g,'/');}catch(unsaved){}
   if(path===root+'/exports/task15/interview_shao_NATIVE.indd' || path===root+'/exports/task15/interview_xiao_NATIVE.indd' || path===root+'/exports/task15/EDITORIAL_INFO_NATIVE.indd'){
    if(old.modified){throw new Error('A task15 output has user changes; preserve '+path);}old.close(SaveOptions.NO);
   }
  }
  var manifest=SHAN.assemblyV0.read(root,'content/ASSEMBLY_V0_MANIFEST.json'),base=SHAN.assemblyV0.read(root,'spec/VISUAL_TOKENS.json');
  for(var i=0;i<manifest.interior.length;i++){
   var c=manifest.interior[i];if(c.kind!=='interview'){continue;}id=c.id;stage='interview:render:'+id;
   var result=SHAN.assemblyV0.render(root,c,1,{setStage:function(){}});doc=result.doc;
   stage='interview:validate:'+id;SHAN.assemblyV0.audit(result,1);
   var frames=doc.pages[0].textFrames,story=null;
   for(var f=0;f<frames.length;f++){if(frames[f].label.indexOf('SHAN_INTERVIEW:')===0){story=frames[f].parentStory;break;}}
   if(!story){throw new Error('No actual Interview body');}
   var before=String(story.contents),q=[],slots={};
   for(var j=0;j<story.paragraphs.length;j++){
    var p=story.paragraphs[j];if(p.appliedParagraphStyle.name!=='P_Interview_Q'){continue;}
    if(!p.ruleAbove || p.ruleBelow || p.paragraphBorderOn || p.underline){throw new Error('Unexpected question rule/border/underline');}
    if(Math.abs(p.pointSize-base.paragraph_styles.P_Interview_Q.size_pt)>.01 || Math.abs(p.leading-base.paragraph_styles.P_Interview_Q.leading_pt)>.01){throw new Error('Question typography changed');}
    if(Math.abs(p.ruleAboveOffset-p.pointSize-SHAN.utils.pt(2))>.01 || !p.keepRuleAboveInFrame){throw new Error('Question separator gap/column-top guard not applied');}
    if(p.fillColor.name!=='C_TEXT' || p.ruleAboveColor.name!=='C_SDU_RED'){throw new Error('Question colors changed');}
    if(p.lines.length<1){throw new Error('Invisible question '+(q.length+1));}
    var localSlots={},positions=[];
    for(var k=0;k<p.lines.length;k++){
     var line=p.lines[k],owners=line.parentTextFrames;if(!owners || !owners.length){throw new Error('Overset question line '+(q.length+1));}
     var frame=owners[0],page=frame.parentPage;if(!page){throw new Error('Question line without document page');}
     var b=frame.geometricBounds,pitch=(b[3]-b[1]+frame.textFramePreferences.textColumnGutter)/2;
     var col=Math.max(0,Math.min(1,Math.floor((line.horizontalOffset-b[1]+.05)/pitch)));
     var slot=page.name+':'+col;localSlots[slot]=true;slots[col]=true;
     positions.push({page:page.name,column:col,baseline:line.baseline,ascent:line.ascent});
    }
    var slotCount=0;for(var key in localSlots){if(localSlots.hasOwnProperty(key)){slotCount++;}}
    q.push({question:q.length+1,source_paragraph:j+1,rule_offset_pt:p.ruleAboveOffset,weight_pt:p.ruleAboveLineWeight,crosses_frame_or_column:slotCount>1,lines:positions});
   }
   if(q.length!==13 || story.overflows || String(story.contents)!==before){throw new Error('Questions/source/overset validation failed');}
   if(!slots[0] || !slots[1]){throw new Error('Both columns were not exercised');}
   stage='interview:export:'+id;doc.save(File(root+'/exports/task15/'+id+'_NATIVE.indd'));
   SHAN.assemblyV0.exportPDF(doc,File(root+'/exports/task15/'+id+'_NATIVE.pdf'));
   reports.push({id:id,status:'PASS',pages:doc.pages.length,paragraphs:story.paragraphs.length,questions:q,overset:false,source_preserved:true});
   // All 13 questions, including first/middle/last and every column location, are validated.
   SHAN.assemblyV0.focus(doc);
   doc.close(SaveOptions.NO);doc=null;
  }
  SHAN.assemblyV0.write(root+'/exports/task15/INTERVIEW_RUNTIME.json',SHAN.assemblyV0.json(reports));
  stage='editorial-info:standalone';
  var editorial=app.doScript(File(root+'/build/15_editorial_info_test.jsx'),ScriptLanguage.JAVASCRIPT);
  if(String(editorial).indexOf('PASS Editorial info')!==0){throw new Error(editorial);}
  return 'PASS TASK 15 standalone: both Interviews / 26 questions / no overset / '+editorial;
 }catch(e){
  var error='FAIL TASK 15;stage='+stage+';component='+id+';name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+(e.source?';source='+e.source:'')+';stack='+$.stack;
  try{SHAN.assemblyV0.write(root+'/exports/task15/STANDALONE_RUNTIME_ERROR.txt',error);}catch(logError){$.writeln(error);}
  return error;
 }finally{try{app.scriptPreferences.measurementUnit=unit;app.scriptPreferences.userInteractionLevel=interaction;}catch(cleanupError){$.writeln(cleanupError.message);}}
}());
'@
$task15Code = $task15Code.Replace('__ROOT__',$task15Root)
$task15Runner = Join-Path $task15Output 'TASK15_NATIVE_RUNNER.jsx'
[IO.File]::WriteAllText($task15Runner,$task15Code,[Text.UTF8Encoding]::new($true))
$task15Result = $task15App.DoScript($task15Code,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
[IO.File]::WriteAllText((Join-Path $task15Output 'STANDALONE_HOST_RESULT.txt'),[string]$task15Result,[Text.UTF8Encoding]::new($false))
Write-Output $task15Result
if($null -eq $task15Result -or $task15Result -notlike 'PASS TASK 15*'){exit 1}
