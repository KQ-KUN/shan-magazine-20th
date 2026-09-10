$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).Replace('\','/')
$app = New-Object -ComObject InDesign.Application.2026
$code = ''
foreach ($file in @('core/utils.jsx','core/document.jsx','core/styles.jsx','core/parents.jsx','modules/chapter.jsx','modules/interview.jsx','visual/tokens.jsx','visual/typography.jsx','visual/running_system.jsx','visual/chapter_skin.jsx','visual/interview_skin.jsx','visual/apply_visual_system.jsx')) {
 $code += '#include "' + $root + '/' + $file + '"' + "`n"
}
$code += @'
(function(){
 var context={warnings:[],document:null},unit=app.scriptPreferences.measurementUnit;
 try {
  app.scriptPreferences.measurementUnit=MeasurementUnits.POINTS;
  var doc=SHAN.visualSystem.createTestDocument("__ROOT__",context),i,j,p,frame,over=0;
  if(doc.pages.item(0).appliedMaster.name!=="H-CHAPTER"){throw new Error("Missing chapter opener");}
  for(i=0;i<doc.pages.length;i++){
   p=doc.pages.item(i);
   if(i>0&&p.appliedMaster.name!=="B-INTERVIEW"){throw new Error("Wrong interview parent");}
   for(j=0;j<p.textFrames.length;j++){if(p.textFrames.item(j).overflows){over++;}}
  }
  if(over){throw new Error("Page text frames overset: "+over);}
  if(doc.pages.length-1<2||doc.pages.length-1>4){throw new Error("Expected 2-4 excerpt pages, got "+(doc.pages.length-1));}
  for(i=0;i<doc.masterSpreads.length;i++){
   var master=doc.masterSpreads.item(i);
   for(j=0;j<master.pages.length;j++){
    p=master.pages.item(j);
    if((master.name==="H-CHAPTER"||master.name==="I-FRONT")&&p.textFrames.length){throw new Error("Hidden running text remains");}
    var k;for(k=0;k<p.textFrames.length;k++){if(p.textFrames.item(k).overflows){throw new Error("Running frame overset: "+master.name+":"+p.textFrames.item(k).label);}}
   }
  }
  return "PASS InDesign "+app.version+"; pages="+doc.pages.length+"; "+doc.extractLabel("SHAN_VISUAL_EXCERPT")+"\nFONTS\n"+doc.extractLabel("SHAN_VISUAL_FONTS")+"\nWARNINGS\n"+context.warnings.join("\n");
 }catch(e){return "FAIL "+e.number+" line "+e.line+": "+e.message;}
 finally{if(context.document&&context.document.isValid){context.document.close(SaveOptions.NO);}app.scriptPreferences.measurementUnit=unit;}
}());
'@
$code=$code.Replace('__ROOT__',$root)
$result=$app.DoScript($code,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
if($result -notlike 'PASS*'){throw $result}
Write-Output $result
