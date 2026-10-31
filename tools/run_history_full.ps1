param([ValidateSet('word','standalone','assembly','folios','geometry')][string]$Phase='word',[string]$ProjectRoot=(Join-Path $PSScriptRoot '..'))
$ErrorActionPreference='Stop'
$historyRoot=[IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
$historyOut=Join-Path $historyRoot 'exports/history_full'
New-Item -ItemType Directory -Force -Path $historyOut | Out-Null
if($Phase -eq 'word'){
 $historyWord=$null;$historyDoc=$null
 try{
  $historyWord=New-Object -ComObject Word.Application
  if($historyWord.Documents.Count -ne 0){throw 'New Word automation instance already contains documents; do not touch user session'}
  $historyWord.Visible=$false;$historyWord.DisplayAlerts=0
  $historySource=Join-Path $historyRoot 'manuscripts/source/history/会史第二版_全篇审校_20261030.docx'
  $historyDoc=$historyWord.Documents.Open($historySource,$false,$true,$false)
  $historyDoc.Repaginate()
  if($historyDoc.Footnotes.Count -ne 5){throw ('Word native footnote count differs: '+$historyDoc.Footnotes.Count)}
  $historyPdf=Join-Path $historyOut 'WORD_AUDITED_NATIVE.pdf'
  $historyDoc.ExportAsFixedFormat($historyPdf,17)
  $historyReport=@{status='PASS';backend='Microsoft Word native PDF export';source_sha256=(Get-FileHash -LiteralPath $historySource -Algorithm SHA256).Hash.ToLower();pages=$historyDoc.ComputeStatistics(2);native_footnotes=$historyDoc.Footnotes.Count;inline_shapes=$historyDoc.InlineShapes.Count;floating_shapes=$historyDoc.Shapes.Count;source_read_only=$historyDoc.ReadOnly;pdf=$historyPdf;pdf_sha256=(Get-FileHash -LiteralPath $historyPdf -Algorithm SHA256).Hash.ToLower()}
  [IO.File]::WriteAllText((Join-Path $historyOut 'WORD_NATIVE_REPORT.json'),($historyReport | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
  Write-Output ('PASS Word native render;pages='+$historyReport.pages+';footnotes='+$historyReport.native_footnotes+';images='+($historyReport.inline_shapes+$historyReport.floating_shapes))
 }finally{if($null -ne $historyDoc){$historyDoc.Close(0)};if($null -ne $historyWord){$historyWord.Quit()}}
 exit
}
$historyBuild=if($Phase -in @('standalone','resume','captions','inspect','geometry')){'54_history_full_standalone.jsx'}elseif($Phase -eq 'folios'){'56_history_full_folios.jsx'}else{'55_history_full_assembly.jsx'}
if($Phase -in @('standalone','resume','captions','inspect','geometry')){
 [IO.File]::WriteAllText((Join-Path $historyOut 'REQUEST.json'),('{"geometry_revision":'+($Phase -eq 'geometry').ToString().ToLower()+',"resume_only":'+($Phase -eq 'resume').ToString().ToLower()+',"caption_revision":'+($Phase -eq 'captions').ToString().ToLower()+',"inspect_only":'+($Phase -eq 'inspect').ToString().ToLower()+',"caption_baseline_file":"exports/history_full/CAPTION_BASELINE_NATIVE.indd"}'),[Text.UTF8Encoding]::new($false))
 $historyImport=Join-Path $historyRoot 'content/HISTORY_FULL_IMPORT.json'
 $historyData=Get-Content -LiteralPath $historyImport -Raw -Encoding UTF8 | ConvertFrom-Json
 $historySource=Join-Path $historyRoot $historyData.source
 $historyHash=(Get-FileHash -LiteralPath $historySource -Algorithm SHA256).Hash.ToLower()
 if($historyHash -ne $historyData.source_sha256){throw 'Revised DOCX hash mismatch before dispatch'}
 $historyGuard=@{source=$historyData.source;sha256=$historyHash;bytes=(Get-Item -LiteralPath $historySource).Length;import_sha256=(Get-FileHash -LiteralPath $historyImport -Algorithm SHA256).Hash.ToLower();layout_sha256=(Get-FileHash -LiteralPath (Join-Path $historyRoot 'content/HISTORY_FULL_LAYOUT.json') -Algorithm SHA256).Hash.ToLower();verified_at=(Get-Date -Format o)}
 [IO.File]::WriteAllText((Join-Path $historyOut 'SOURCE_HOST_GUARD.json'),($historyGuard | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
}
if($Phase -eq 'assembly'){
 $historyPlan=Get-Content -LiteralPath (Join-Path $historyOut 'RESOLVED_BOOK_PLAN.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 $historyInputs=Get-Content -LiteralPath (Join-Path $historyOut 'PRINT_COMPONENT_INPUTS.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 $historyConfig=Get-Content -LiteralPath (Join-Path $historyRoot 'content/HISTORY_FULL_BOOK.json') -Raw -Encoding UTF8 | ConvertFrom-Json
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
 foreach($historyRelative in @('exports/history_full/RESOLVED_BOOK_PLAN.json','exports/history_full/PRINT_COMPONENT_INPUTS.json','content/HISTORY_FULL_BOOK.json')){$historySmall[$historyRelative]=(Get-FileHash -LiteralPath (Join-Path $historyRoot $historyRelative) -Algorithm SHA256).Hash.ToLower()}
 [IO.File]::WriteAllText((Join-Path $historyOut 'ASSEMBLY_HOST_GUARD.json'),(@{status='PASS';files=$historyFiles;small=$historySmall;verified_at=(Get-Date -Format o)} | ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
}
$historyApp=New-Object -ComObject InDesign.Application.2026
$historyCode='(function(){try{return app.doScript(File("__ROOT__/build/__BUILD__"),ScriptLanguage.JAVASCRIPT);}catch(e){return "FAIL native compile;message="+e.message+";file="+e.fileName+";line="+e.line;}}());'.Replace('__ROOT__',$historyRoot).Replace('__BUILD__',$historyBuild)
$historyStarted=Get-Date
$historyResult=$historyApp.DoScript($historyCode,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
[IO.File]::WriteAllText((Join-Path $historyOut ($Phase+'_HOST.txt')),([string]$historyResult),[Text.UTF8Encoding]::new($false))
Write-Output $historyResult
if($null -eq $historyResult -or $historyResult -notlike 'PASS *'){throw ('History Full '+$Phase+' failed; inspect native stage/error log')}
