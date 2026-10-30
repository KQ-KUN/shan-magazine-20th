param([ValidateSet('standalone','resume','captions','inspect','assembly','folios')][string]$Phase='standalone',[string]$ProjectRoot=(Join-Path $PSScriptRoot '..'))
$ErrorActionPreference='Stop'
$historyRoot=[IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
$historyOut=Join-Path $historyRoot 'exports/history_v2'
New-Item -ItemType Directory -Force -Path $historyOut | Out-Null
$historyBuild=if($Phase -in @('standalone','resume','captions','inspect')){'51_history_v2_standalone.jsx'}elseif($Phase -eq 'folios'){'53_history_v2_folios.jsx'}else{'52_history_v2_assembly.jsx'}
if($Phase -in @('standalone','resume','captions','inspect')){
 [IO.File]::WriteAllText((Join-Path $historyOut 'REQUEST.json'),('{"resume_only":'+($Phase -eq 'resume').ToString().ToLower()+',"caption_revision":'+($Phase -eq 'captions').ToString().ToLower()+',"inspect_only":'+($Phase -eq 'inspect').ToString().ToLower()+',"caption_baseline_file":"exports/history_v2/CAPTION_BASELINE_NATIVE.indd"}'),[Text.UTF8Encoding]::new($false))
 $historyImport=Join-Path $historyRoot 'content/HISTORY_V2_IMPORT.json'
 $historyData=Get-Content -LiteralPath $historyImport -Raw -Encoding UTF8 | ConvertFrom-Json
 $historySource=Join-Path $historyRoot $historyData.source
 $historyHash=(Get-FileHash -LiteralPath $historySource -Algorithm SHA256).Hash.ToLower()
 if($historyHash -ne $historyData.source_sha256){throw 'Revised DOCX hash mismatch before dispatch'}
 $historyGuard=@{source=$historyData.source;sha256=$historyHash;bytes=(Get-Item -LiteralPath $historySource).Length;import_sha256=(Get-FileHash -LiteralPath $historyImport -Algorithm SHA256).Hash.ToLower();layout_sha256=(Get-FileHash -LiteralPath (Join-Path $historyRoot 'content/HISTORY_V2_LAYOUT.json') -Algorithm SHA256).Hash.ToLower();verified_at=(Get-Date -Format o)}
 [IO.File]::WriteAllText((Join-Path $historyOut 'SOURCE_HOST_GUARD.json'),($historyGuard | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
}
if($Phase -eq 'assembly'){
 $historyPlan=Get-Content -LiteralPath (Join-Path $historyOut 'RESOLVED_BOOK_PLAN.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 $historyInputs=Get-Content -LiteralPath (Join-Path $historyOut 'PRINT_COMPONENT_INPUTS.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 $historyConfig=Get-Content -LiteralPath (Join-Path $historyRoot 'content/HISTORY_V2_BOOK.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 $historyRows=@($historyPlan.components | Where-Object {$_.kind -notin @('chapter','editorial_toc','toc')})+@($historyInputs.components)+@(@{file=$historyConfig.approved_cover;sha256=$historyPlan.approved_cover_sha256})
 $historyFiles=@{}
 foreach($historyRow in $historyRows){
  $historyFile=Join-Path $historyRoot $historyRow.file
  $historyBefore=Get-Item -LiteralPath $historyFile
  $historyPdfHash=(Get-FileHash -LiteralPath $historyFile -Algorithm SHA256).Hash.ToLower()
  $historyAfter=Get-Item -LiteralPath $historyFile
  if($historyPdfHash -ne $historyRow.sha256 -or $historyBefore.LastWriteTimeUtc -ne $historyAfter.LastWriteTimeUtc -or $historyBefore.Length -ne $historyAfter.Length){throw ('Assembly input hash/time changed: '+$historyRow.file)}
  $historyFiles[$historyRow.file]=@{sha256=$historyPdfHash;bytes=$historyAfter.Length;modified_seconds=([DateTimeOffset]$historyAfter.LastWriteTimeUtc).ToUnixTimeSeconds()}
 }
 $historySmall=@{}
 foreach($historyRelative in @('exports/history_v2/RESOLVED_BOOK_PLAN.json','exports/history_v2/PRINT_COMPONENT_INPUTS.json','content/HISTORY_V2_BOOK.json')){$historySmall[$historyRelative]=(Get-FileHash -LiteralPath (Join-Path $historyRoot $historyRelative) -Algorithm SHA256).Hash.ToLower()}
 [IO.File]::WriteAllText((Join-Path $historyOut 'ASSEMBLY_HOST_GUARD.json'),(@{status='PASS';files=$historyFiles;small=$historySmall;verified_at=(Get-Date -Format o)} | ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
}
$historyApp=New-Object -ComObject InDesign.Application.2026
$historyCode='(function(){try{return app.doScript(File("__ROOT__/build/__BUILD__"),ScriptLanguage.JAVASCRIPT);}catch(e){return "FAIL native compile;message="+e.message+";file="+e.fileName+";line="+e.line;}}());'.Replace('__ROOT__',$historyRoot).Replace('__BUILD__',$historyBuild)
$historyStarted=Get-Date
$historyResult=$historyApp.DoScript($historyCode,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
[IO.File]::WriteAllText((Join-Path $historyOut ($Phase+'_HOST.txt')),([string]$historyResult),[Text.UTF8Encoding]::new($false))
Write-Output $historyResult
if($null -eq $historyResult -or $historyResult -notlike 'PASS *'){throw ('History V2 '+$Phase+' failed; inspect native stage/error log')}
