param([ValidateSet('Samples','Book')][string]$Mode='Book', [string]$ProjectRoot=(Join-Path $PSScriptRoot '..'), [string]$PythonExecutable=(Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'))
$ErrorActionPreference='Stop'
$printRoot=[IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
if($Mode -eq 'Book'){
 $printCurrent=Get-Content -Raw -LiteralPath (Join-Path $printRoot 'content/ASSEMBLY_V0_MANIFEST.json') | ConvertFrom-Json
 if($printCurrent.interior.kind -contains 'toc'){
  & (Join-Path $printRoot 'tools/run_print_v4.ps1') -ProjectRoot $printRoot -PythonExecutable $PythonExecutable
  exit 0
 }
 if($printCurrent.interior.id -contains 'feature_monday_cup_backstage'){
  & (Join-Path $printRoot 'tools/run_print_v3.ps1') -ProjectRoot $printRoot -PythonExecutable $PythonExecutable
  exit 0
 }
}
$printOut=Join-Path $printRoot 'exports/print_v2'
New-Item -ItemType Directory -Force -Path $printOut | Out-Null
if($Mode -eq 'Book'){
 if(-not (Test-Path -LiteralPath $PythonExecutable)){throw 'Provide -PythonExecutable with a Python runtime containing pypdf.'}
 & $PythonExecutable (Join-Path $printRoot 'tools/prepare_print_components.py')
 if($LASTEXITCODE -ne 0){throw 'Approved production-copy verification failed.'}
}
$printBuild=if($Mode -eq 'Samples'){'17_chapter_art_samples.jsx'}else{'18_print_book_test.jsx'}
$printNames=if($Mode -eq 'Samples'){@('SAMPLE_origin.indd','SAMPLE_strata.indd','SAMPLE_constellations.indd')}else{@('SHAN_INTERIOR_PRINT_V2.indd','SHAN_REVIEW_V2.indd')}
$printPaths=($printNames | ForEach-Object {'"'+$printRoot+'/exports/print_v2/'+$_+'"'}) -join ','
$printApp=New-Object -ComObject InDesign.Application.2026
$printCode=@'
(function(){var interaction=app.scriptPreferences.userInteractionLevel;
 try{app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;
  var paths=[__PATHS__];
  for(var i=app.documents.length-1;i>=0;i--){var old=app.documents[i],path='';try{path=old.fullName.fsName.replace(/\\/g,'/');}catch(unsaved){}
   for(var j=0;j<paths.length;j++){if(path===paths[j]){if(old.modified){old.save(File(path.replace(/\.indd$/,'_PRESERVED_'+new Date().getTime()+'.indd')));}else{old.close(SaveOptions.NO);}break;}}
  }
  return app.doScript(File('__ROOT__/build/__BUILD__'),ScriptLanguage.JAVASCRIPT);
 }catch(e){return 'FAIL host: '+e.message+';file='+e.fileName+';line='+e.line+';stack='+$.stack;}
 finally{app.scriptPreferences.userInteractionLevel=interaction;}
}());
'@
$printCode=$printCode.Replace('__ROOT__',$printRoot).Replace('__BUILD__',$printBuild).Replace('__PATHS__',$printPaths)
$printResult=$printApp.DoScript($printCode,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
[IO.File]::WriteAllText((Join-Path $printOut ($Mode+'_HOST_RESULT.txt')),[string]$printResult,[Text.UTF8Encoding]::new($false))
Write-Output $printResult
if($null -eq $printResult -or $printResult -notlike 'PASS *'){exit 1}
if($Mode -eq 'Book'){
 & $PythonExecutable (Join-Path $printRoot 'tools/finish_print_pdfs.py')
 if($LASTEXITCODE -ne 0){throw 'Exact body stream / Review PDF finishing failed.'}
 $printPostCode="(function(){return app.doScript(File('"+$printRoot+"/build/19_print_postflight.jsx'),ScriptLanguage.JAVASCRIPT);}());"
 $printPostflight=$printApp.DoScript($printPostCode,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
 [IO.File]::WriteAllText((Join-Path $printOut 'POSTFLIGHT_HOST_RESULT.txt'),[string]$printPostflight,[Text.UTF8Encoding]::new($false))
 Write-Output $printPostflight
 if($null -eq $printPostflight -or $printPostflight -notlike 'PASS *'){exit 1}
}
