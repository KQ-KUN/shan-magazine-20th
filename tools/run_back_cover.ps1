param([ValidateSet('refine','folios','assembly','reader')][string]$Phase='refine')
$ErrorActionPreference='Stop'
$releaseRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).Replace('\','/')
$releaseOut=Join-Path $releaseRoot 'exports/back_cover_release_20261102'
New-Item -ItemType Directory -Force -Path $releaseOut | Out-Null
$releaseProcesses=@(Get-Process InDesign -ErrorAction SilentlyContinue)
if($releaseProcesses.Count -eq 0){
 $releaseLaunched=Start-Process -FilePath 'C:/Program Files/Adobe/Adobe InDesign 2026/InDesign.exe' -WindowStyle Hidden -PassThru
 Start-Sleep -Seconds 12
 if($releaseLaunched.HasExited){throw 'HOST_RUNTIME_BLOCKED: InDesign exited during startup'}
}
$releaseBuild=if($Phase -eq 'refine'){'62_back_cover_refine.jsx'}elseif($Phase -eq 'folios'){'63_back_cover_folios.jsx'}elseif($Phase -eq 'reader'){'65_back_cover_reader.jsx'}else{'64_back_cover_assembly.jsx'}
$releaseApp=New-Object -ComObject InDesign.Application.2026
$releaseCode='(function(){try{return app.doScript(File("__ROOT__/build/__BUILD__"),ScriptLanguage.JAVASCRIPT);}catch(e){return "FAIL compile;"+e.message+";file="+e.fileName+";line="+e.line;}}());'.Replace('__ROOT__',$releaseRoot).Replace('__BUILD__',$releaseBuild)
$releaseStarted=Get-Date
$releaseResult=$releaseApp.DoScript($releaseCode,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
[IO.File]::WriteAllText((Join-Path $releaseOut ($Phase+'_HOST.json')),(@{result=[string]$releaseResult;started=$releaseStarted.ToString('o');completed=(Get-Date).ToString('o')} | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
Write-Output $releaseResult
if($releaseResult -notlike 'PASS *'){throw ('Native '+$Phase+' failed; inspect original error report')}
