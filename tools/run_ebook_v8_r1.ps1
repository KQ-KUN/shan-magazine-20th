param([ValidateSet('all','standalone','assembly','postflight')][string]$Phase='all',[string]$ProjectRoot=(Join-Path $PSScriptRoot '..'),[string]$PythonExecutable=(Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'))
$ErrorActionPreference='Stop'
$ebookRoot=[IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
$ebookOut=Join-Path $ebookRoot 'exports/ebook_v8_r1'
New-Item -ItemType Directory -Force (Join-Path $ebookOut 'components') | Out-Null
function Invoke-EbookPython([string]$Script,[string[]]$Arguments){
 & $PythonExecutable -X utf8 (Join-Path $ebookRoot $Script) @Arguments
 if($LASTEXITCODE -ne 0){throw 'Ebook Python failed: '+$Script}
}
function Invoke-EbookBuild([string]$Build){
 $ebookCode=@'
(function(){var level=app.scriptPreferences.userInteractionLevel;
 try{app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  for(var i=app.documents.length-1;i>=0;i--){var doc=app.documents[i],path='';try{path=doc.fullName.fsName.replace(/\\/g,'/');}catch(unsaved){}
   if('__BUILD__'!=='45_ebook_v8_r1_postflight.jsx' && path.indexOf('__ROOT__/exports/ebook_v8_r1/')===0){if(doc.modified){doc.save(File(path.replace(/\.indd$/,'_PRESERVED_'+new Date().getTime()+'.indd')));}else{doc.close(SaveOptions.NO);}}
  }
  return app.doScript(File('__ROOT__/build/__BUILD__'),ScriptLanguage.JAVASCRIPT);
 }catch(e){return 'FAIL host;name='+e.name+';message='+e.message+';file='+e.fileName+';line='+e.line+';stack='+$.stack;}
 finally{app.scriptPreferences.userInteractionLevel=level;}
}());
'@
 $ebookCode=$ebookCode.Replace('__ROOT__',$ebookRoot).Replace('__BUILD__',$Build)
 $ebookApp=New-Object -ComObject InDesign.Application.2026
 $ebookResult=$ebookApp.DoScript($ebookCode,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
 [IO.File]::WriteAllText((Join-Path $ebookOut ($Build+'_HOST.txt')),[string]$ebookResult,[Text.UTF8Encoding]::new($false))
 Write-Output $ebookResult
 if($null -eq $ebookResult -or $ebookResult -notlike 'PASS *'){throw 'Ebook host failed: '+$Build}
}
if($Phase -in @('all','standalone')){
 Invoke-EbookPython 'tools/ebook_v8_r1.py' @('prepare')
 Invoke-EbookBuild '43_ebook_v8_r1_standalone.jsx'
}
if($Phase -in @('all','assembly')){
 Invoke-EbookPython 'tools/ebook_v8_r1.py' @('resolve')
 Invoke-EbookBuild '44_ebook_v8_r1_assembly.jsx'
 Invoke-EbookPython 'tools/ebook_v8_r1.py' @('finish')
}
if($Phase -in @('all','postflight')){
 Invoke-EbookBuild '45_ebook_v8_r1_postflight.jsx'
 Invoke-EbookPython 'tests/ebook_v8_r1_outputs.py' @()
}
