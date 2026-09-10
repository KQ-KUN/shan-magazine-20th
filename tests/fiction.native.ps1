$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).Replace('\','/')
$fixture = & python (Join-Path $PSScriptRoot 'fiction_source.py')
if ($LASTEXITCODE -ne 0) { throw 'DOCX fixture extraction failed' }
$app = New-Object -ComObject InDesign.Application.2026
$code = ''
foreach ($file in @('core/utils.jsx','core/document.jsx','core/styles.jsx','core/parents.jsx','modules/chapter.jsx','visual/tokens.jsx','visual/typography.jsx','visual/running_system.jsx','modules/fiction.jsx','visual/fiction_skin.jsx')) {
 $code += '#include "' + $root + '/' + $file + '"' + "`n"
}
$code += @'
(function(){
 var context={warnings:[],document:null},unit=app.scriptPreferences.measurementUnit;
 try {
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;
  var base=SHAN.visualTokens.read(File("__ROOT__/spec/VISUAL_TOKENS.json"));
  var file=File("__ROOT__/spec/FICTION_TOKENS.json"),t;
  file.encoding="UTF-8";if(!file.open("r")){throw new Error("tokens missing");}
  try{t=SHAN.chapter.parseJSON(file.read());}finally{file.close();}
  var doc=SHAN.document.create(context);
  SHAN.styles.create(doc,context);SHAN.parents.create(doc,context);
  SHAN.typography.apply(doc,base,context);SHAN.runningSystem.apply(doc,base);
  SHAN.fictionSkin.apply(doc,t,base,context);
  var result=SHAN.fiction.create(doc,File("__ROOT__/manuscripts/04_fiction_四叠半_笠原JunE.docx"),"fiction_fourfold");
  var expected=__FIXTURE__,story=result.story,i,p,role,text,frame;
  if(story.paragraphs.length!==expected.roles.length){throw new Error("Paragraph count mismatch");}
  for(i=0;i<expected.roles.length;i++){
   p=story.paragraphs.item(i);role=expected.roles[i];text=p.contents;
   // Word paragraph separators become CR; the final paragraph may omit its terminator.
   if(text.charAt(text.length-1)==="\r"){text=text.substring(0,text.length-1);}
   if(text!==expected.texts[i]){throw new Error("DOCX text mismatch at paragraph "+(i+1));}
   if(p.appliedParagraphStyle.name!==SHAN.fiction.styleMap[role]){throw new Error("Style mismatch");}
   if(role==="ArticleTitle"||role==="Author"||role==="FictionChapter"){
    if(p.spanColumnType!==SpanColumnTypeOptions.SPAN_COLUMNS||p.spanSplitColumnCount!==2){throw new Error("Span mismatch");}
   }
   if(role==="Body"&&p.spanColumnType!==SpanColumnTypeOptions.SINGLE_COLUMN){throw new Error("Body span mismatch");}
  }
  if(expected.texts[1]!=="笠原JunE"||result.counts.FictionChapter!==6){throw new Error("Sample author/chapter mismatch");}
  if(result.pages<2||story.overflows){throw new Error("Continuation/overset failed");}
  for(i=0;i<doc.pages.length;i++){
   p=doc.pages.item(i);frame=p.textFrames.item(0);
   if(p.appliedMaster.name!=="D-FICTION"||frame.textFramePreferences.textColumnCount!==2){throw new Error("Parent/columns mismatch");}
   if(Math.abs(frame.textFramePreferences.textColumnGutter-SHAN.utils.pt(6))>0.001){throw new Error("Gutter mismatch");}
   if(frame.overflows){throw new Error("Frame overset");}
   if(i+1<doc.pages.length&&frame.nextTextFrame.id!==doc.pages.item(i+1).textFrames.item(0).id){throw new Error("Thread broken");}
  }
  return "PASS InDesign "+app.version+"; "+doc.extractLabel("SHAN_FICTION_REPORT")+"; DOCX all paragraphs equal; author verified; spans/columns/thread verified\n"+doc.extractLabel("SHAN_VISUAL_FONTS");
 }catch(e){return "FAIL "+e.number+" line "+e.line+": "+e.message;}
 finally{if(context.document&&context.document.isValid){context.document.close(SaveOptions.NO);}app.scriptPreferences.measurementUnit=unit;}
}());
'@
$code=$code.Replace('__ROOT__',$root).Replace('__FIXTURE__',$fixture)
$result=$app.DoScript($code,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
if($result -notlike 'PASS*'){throw $result}
Write-Output $result
