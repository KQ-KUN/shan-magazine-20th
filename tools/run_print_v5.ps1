param([string]$ProjectRoot=(Join-Path $PSScriptRoot '..'),[string]$PythonExecutable=(Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'))
$ErrorActionPreference='Stop'
$publicationRoot=[IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
$publicationOut=Join-Path $publicationRoot 'exports/print_v5'
New-Item -ItemType Directory -Force -Path $publicationOut | Out-Null
$publicationApp=New-Object -ComObject InDesign.Application.2026
function Invoke-PublicationBuild([string]$Build,[string[]]$OwnedNames){
 $publicationPaths=($OwnedNames | ForEach-Object {'"'+$publicationRoot+'/exports/print_v5/'+$_+'"'}) -join ','
 $publicationCode=@'
(function(){var interaction=app.scriptPreferences.userInteractionLevel;
 try{app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var paths=[__PATHS__];
  for(var i=app.documents.length-1;i>=0;i--){var old=app.documents[i],path='';try{path=old.fullName.fsName.replace(/\\/g,'/');}catch(unsaved){}
   for(var j=0;j<paths.length;j++){if(path.toLowerCase()===paths[j].toLowerCase()){if(old.modified){old.save(File(path.replace(/\.indd$/,'_PRESERVED_'+new Date().getTime()+'.indd')));}else{old.close(SaveOptions.NO);}break;}}
  }
  return app.doScript(File('__ROOT__/build/__BUILD__'),ScriptLanguage.JAVASCRIPT);
 }catch(e){return 'FAIL host: '+e.message+';file='+e.fileName+';line='+e.line+';stack='+$.stack;}
 finally{app.scriptPreferences.userInteractionLevel=interaction;}
}());
'@
 $publicationCode=$publicationCode.Replace('__ROOT__',$publicationRoot).Replace('__BUILD__',$Build).Replace('__PATHS__',$publicationPaths)
 $publicationResult=$publicationApp.DoScript($publicationCode,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
 [IO.File]::WriteAllText((Join-Path $publicationOut ($Build+'_HOST.txt')),[string]$publicationResult,[Text.UTF8Encoding]::new($false))
 Write-Output $publicationResult
 if($null -eq $publicationResult -or ($publicationResult -notlike 'PASS *' -and $publicationResult -notlike 'REBUILD TOC*')){throw 'Host stage failed: '+$Build}
}
function Invoke-PublicationPython([string]$Script,[string[]]$Arguments){
 & $PythonExecutable -X utf8 (Join-Path $publicationRoot $Script) @Arguments
 if($LASTEXITCODE -ne 0){throw 'Python stage failed: '+$Script}
}
Invoke-PublicationPython 'tools/monday_cup_source.py' @()

for($publicationPass=0;$publicationPass -lt 2;$publicationPass++){
 Invoke-PublicationPython 'tools/resolve_print_v5.py' @()
 Invoke-PublicationBuild '30_print_v5_folios.jsx' @('FOLIO_ONLY_V5.indd')
 Invoke-PublicationPython 'tools/prepare_print_components.py' @('--v5')
 $publicationBookResult=Invoke-PublicationBuild '29_print_book_v5_test.jsx' @('SHAN_INTERIOR_PRINT_V5.indd','SHAN_REVIEW_V5.indd')
 Write-Output $publicationBookResult
 if($publicationBookResult -like 'PASS *'){break}
 if($publicationPass -eq 1){throw 'TOC capacity did not stabilize within the two allowed passes.'}
}
Invoke-PublicationPython 'tools/finish_print_pdfs.py' @('--v5')
Invoke-PublicationBuild '31_print_v5_postflight.jsx' @()
