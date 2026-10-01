param([switch]$Export, [string]$ProjectRoot)
$ErrorActionPreference = 'Stop'
$historyWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).Replace('\', '/')
$historyRoot = $(if ($ProjectRoot) { [IO.Path]::GetFullPath($ProjectRoot).Replace('\', '/') } else { $historyWorkspace })
$historyApp = New-Object -ComObject InDesign.Application.2026
$historyCode = @'
(function () {
 var previousInteraction = app.scriptPreferences.userInteractionLevel, before = app.documents.length;
 try {
  app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
  app.doScript(File("__ROOT__/build/13_history_test.jsx"), ScriptLanguage.JAVASCRIPT);
  if (app.documents.length <= before) { throw new Error("History build did not create a document"); }
  var doc = app.activeDocument, report = doc.extractLabel("SHAN_HISTORY_REPORT"), runtime = File("__ROOT__/exports/history/HISTORY_RUNTIME_REPORT.txt");
  if (report.indexOf("PASS History") !== 0) { throw new Error(report || "No History result label"); }
  runtime.encoding = "UTF-8";
  if (!runtime.open("r")) { throw new Error("Missing runtime report"); }
  try { report = runtime.read(); } finally { runtime.close(); }
  var page = doc.pages.item(0), frames = page.textFrames, body = null, i;
  for (i = 0; i < frames.length; i += 1) { if (frames.item(i).label === "SHAN_HISTORY:body") { body = frames.item(i); break; } }
  if (!body || body.lines.length < 1 || body.parentStory.contents.length < 100) { throw new Error("No visible History body on the actual first document page"); }
  doc.insertLabel("SHAN_HISTORY_NATIVE_TEST", "PASS actual first-page body lines=" + body.lines.length);
  if (__EXPORT__) {
   doc.save(File("__OUTPUT__/HISTORY_NATIVE_PROOF.indd"));
   var pdfPreferences = app.pdfExportPreferences, oldRange = pdfPreferences.pageRange, oldSpreads = pdfPreferences.exportReaderSpreads;
   try {
    pdfPreferences.pageRange = PageRange.ALL_PAGES; pdfPreferences.exportReaderSpreads = false;
    doc.exportFile(ExportFormat.PDF_TYPE, File("__OUTPUT__/HISTORY_NATIVE_PROOF.pdf"), false);
   } finally { pdfPreferences.pageRange = oldRange; pdfPreferences.exportReaderSpreads = oldSpreads; }
  }
  return report + "\nNATIVE firstPageBodyLines=" + body.lines.length + "; documentsBefore=" + before + "; documentsAfter=" + app.documents.length;
 } catch (e) { return "FAIL NATIVE: " + e.message + "\nfile=" + e.fileName + "\nline=" + e.line; }
 finally { app.scriptPreferences.userInteractionLevel = previousInteraction; }
}());
'@
$historyCode = $historyCode.Replace('__ROOT__', $historyRoot).Replace('__OUTPUT__', ($historyWorkspace + '/exports/history')).Replace('__EXPORT__', $(if ($Export) { 'true' } else { 'false' }))
$historyRunnerFile = Join-Path $historyWorkspace 'exports/history/HISTORY_NATIVE_RUNNER.jsx'
New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($historyRunnerFile)) | Out-Null
[IO.File]::WriteAllText($historyRunnerFile, $historyCode, [Text.UTF8Encoding]::new($true))
$historyResult = $historyApp.DoScript($historyCode, 1246973031, [Type]::Missing, [Type]::Missing, [Type]::Missing)
if ($null -eq $historyResult) { throw 'InDesign returned no result; see exports/history/HISTORY_NATIVE_RUNNER.jsx.' }
Write-Output $historyResult
if ($historyResult -notlike 'PASS History*') { exit 1 }
