param([string]$ProjectRoot = (Join-Path $PSScriptRoot '..'))
$ErrorActionPreference = 'Stop'
$assemblyRoot = [IO.Path]::GetFullPath($ProjectRoot).Replace('\', '/')
$assemblyOutput = Join-Path $assemblyRoot 'exports/assembly_v0'
New-Item -ItemType Directory -Force -Path $assemblyOutput | Out-Null
try {
    # Same five-argument DoScript signature and verified language constant as tests/history.native.ps1.
    $assemblyApp = New-Object -ComObject InDesign.Application.2026
    $assemblyBuild = Join-Path $assemblyRoot 'build/14_magazine_assembly_v0.jsx'
    $assemblyHeaders = ([IO.File]::ReadAllText($assemblyBuild) -split '\(function \(\) \{', 2)[0]
    $assemblyHeaders = $assemblyHeaders.Replace('../', ($assemblyRoot + '/'))
    $assemblyCompileFile = Join-Path $assemblyOutput 'ASSEMBLY_NATIVE_COMPILE.jsx'
    [IO.File]::WriteAllText($assemblyCompileFile, ($assemblyHeaders + "`n'COMPILE_OK';"), [Text.UTF8Encoding]::new($true))
    $assemblyCode = @'
(function () {
 var interaction = app.scriptPreferences.userInteractionLevel;
 try {
  app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
  var compile = app.doScript(File("__ROOT__/exports/assembly_v0/ASSEMBLY_NATIVE_COMPILE.jsx"), ScriptLanguage.JAVASCRIPT);
  if (compile !== "COMPILE_OK") { return "FAIL native compilation: " + compile; }
  return app.doScript(File("__ROOT__/build/14_magazine_assembly_v0.jsx"), ScriptLanguage.JAVASCRIPT);
 } catch (e) {
  return "FAIL native include/runner: " + e.message + "\nfile=" + e.fileName + "\nline=" + e.line + "\nstack=" + $.stack;
 } finally { app.scriptPreferences.userInteractionLevel = interaction; }
}());
'@
    $assemblyCode = $assemblyCode.Replace('__ROOT__', $assemblyRoot)
    $assemblyResult = $assemblyApp.DoScript($assemblyCode, 1246973031, [Type]::Missing, [Type]::Missing, [Type]::Missing)
    [IO.File]::WriteAllText((Join-Path $assemblyOutput 'ASSEMBLY_HOST_RESULT.txt'), [string]$assemblyResult, [Text.UTF8Encoding]::new($false))
    Write-Output $assemblyResult
    if ($null -eq $assemblyResult -or $assemblyResult -notlike 'PASS Assembly V0*') { exit 1 }
    foreach ($assemblyName in @('SHAN_INTERIOR_ASSEMBLY_V0.indd','SHAN_INTERIOR_ASSEMBLY_V0.pdf','SHAN_REVIEW_V0.indd','SHAN_REVIEW_V0.pdf','SHAN_ASSEMBLY_V0_REPORT.json','SHAN_ASSEMBLY_V0_REPORT.txt')) {
        $assemblyFile = Get-Item -LiteralPath (Join-Path $assemblyOutput $assemblyName)
        if ($assemblyFile.Length -eq 0) { throw "Empty output $assemblyName" }
    }
    $assemblyReport = Get-Content -Raw -LiteralPath (Join-Path $assemblyOutput 'SHAN_ASSEMBLY_V0_REPORT.json') | ConvertFrom-Json
    if ($assemblyReport.status -ne 'PASS') { throw 'Host report did not pass' }
} catch {
    $assemblyFailure = "HOST_RUNTIME_BLOCKED or runner failure: $($_.Exception.Message)"
    [IO.File]::WriteAllText((Join-Path $assemblyOutput 'ASSEMBLY_HOST_RESULT.txt'), $assemblyFailure, [Text.UTF8Encoding]::new($false))
    Write-Error $assemblyFailure
    exit 1
}
