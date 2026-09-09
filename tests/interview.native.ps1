param([ValidateSet("shao", "xiao")][string]$Sample = "shao")
# Loads trusted JSX definitions and imports only the contract sample.
# Creates and closes its own unsaved document; leaves existing documents untouched.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).Replace('\', '/')
$indesign = New-Object -ComObject InDesign.Application.2026
$sampleFile = if ($Sample -eq 'shao') { '01_interview_邵珠瑜_贾锦阳.docx' } else { '01_interview_肖兆旭_河流.docx' }
$code = ''
foreach ($file in @('core/utils.jsx','core/document.jsx','core/styles.jsx','core/parents.jsx','modules/interview.jsx')) {
    $code += '#include "' + $root + '/' + $file + '"' + "`n"
}
$code += @'
(function () {
 var context={warnings:[],document:null}, oldUnit=app.scriptPreferences.measurementUnit;
 var oldPrefs=app.wordRTFImportPreferences.properties.toSource(), originalCount=app.documents.length;
 try {
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;
  var doc=SHAN.document.create(context);
  SHAN.styles.create(doc,context); SHAN.parents.create(doc,context);
  var result=SHAN.interview.create(doc,File("__ROOT__/manuscripts/__SAMPLE_FILE__"),"interview___SAMPLE__",context);
  if(result.overset || result.pages < 2 || result.story.paragraphs.length < 1){throw new Error("Unexpected native layout result");}
  if("__SAMPLE__"==="shao" && (result.story.paragraphs.length!==41 || result.counts.InterviewQuestion!==13 || result.counts.InterviewAnswer!==24)){throw new Error("Unexpected Q/A counts");}
  if("__SAMPLE__"==="xiao" && (result.story.paragraphs.length!==37 || result.counts.InterviewQuestion!==13 || result.counts.InterviewAnswer!==18)){throw new Error("Unexpected Xiao sample counts");}
  if(doc.allGraphics.length!==0){throw new Error("Unexpected graphics");}
  var i,p,style,counts={};
  for(i=0;i<doc.pages.length;i++){
   p=doc.pages.item(i);
   if(p.appliedMaster.name!=="B-INTERVIEW"){throw new Error("Wrong Parent");}
   if(p.textFrames.item(0).appliedObjectStyle.name!=="O_Text_Main"){throw new Error("Wrong Object Style");}
   if(p.textFrames.item(0).textFramePreferences.textColumnCount!==2){throw new Error("Wrong columns");}
  }
  for(i=0;i<result.story.paragraphs.length;i++){
   style=result.story.paragraphs.item(i).appliedParagraphStyle.name;
   counts[style]=(counts[style]||0)+1;
  }
  var required=["ArticleTitle","ArticleSubtitle","Author","Metadata","InterviewQuestion","InterviewAnswer"];
  for(i=0;i<required.length;i++){
   style=required[i];
   if(!result.counts[style] || counts[SHAN.interview.styleMap[style]]!==result.counts[style]){throw new Error("Wrong final mapped style: "+style);}
  }
  if(app.wordRTFImportPreferences.properties.toSource()!==oldPrefs){throw new Error("Import preferences not restored");}
  return "PASS InDesign "+app.version+": "+doc.extractLabel("SHAN_INTERVIEW_REPORT")+"; Q="+result.counts.InterviewQuestion+"; A="+result.counts.InterviewAnswer+"; mapped styles/2 columns/B-INTERVIEW/graphics=0/preferences restored";
 } catch(e){return "FAIL "+e.number+" line "+e.line+": "+e.message;}
 finally{
  if(context.document&&context.document.isValid){context.document.close(SaveOptions.NO);}
  app.scriptPreferences.measurementUnit=oldUnit;
  if(app.documents.length!==originalCount){throw new Error("Document count changed");}
 }
}());
'@
$code = $code.Replace('__ROOT__', $root).Replace('__SAMPLE_FILE__', $sampleFile).Replace('__SAMPLE__', $Sample)
$result = $indesign.DoScript($code, 1246973031, [Type]::Missing, [Type]::Missing, [Type]::Missing)
if ($result -notlike 'PASS*') { throw $result }
Write-Output $result
