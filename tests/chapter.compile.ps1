# Native InDesign 2026 compiler regression. Loads function definitions only.
# Never calls Chapter.create, reads manifest, or creates/closes documents.
$ErrorActionPreference = 'Stop'
$modulePath = Join-Path $PSScriptRoot '..\modules\chapter.jsx'
$modulePath = [IO.Path]::GetFullPath($modulePath)
$bytes = [IO.File]::ReadAllBytes($modulePath)
if ($bytes.Length -lt 3 -or $bytes[0] -ne 239 -or $bytes[1] -ne 187 -or $bytes[2] -ne 191) {
    throw 'Chapter JSX must have a UTF-8 BOM for the native include loader.'
}
$indesign = New-Object -ComObject InDesign.Application.2026
$documentCount = $indesign.Documents.Count
$probePath = Join-Path ([IO.Path]::GetTempPath()) ('shan-chapter-no-bom-' + [guid]::NewGuid().ToString('N') + '.jsx')
function Test-NativeInclude([string]$path) {
    $escaped = $path.Replace('\', '/').Replace('"', '\"')
    # JSON/manifest is never evaluated. Only the trusted module is compiled.
    $code = '(function () { try { app.doScript(''#include "' + $escaped + '"'', ScriptLanguage.JAVASCRIPT); return "COMPILE_OK"; } catch (e) { return "ERROR " + e.number + ": " + e.message; } }());'
    return $indesign.DoScript($code, 1246973031, [Type]::Missing, [Type]::Missing, [Type]::Missing)
}
try {
    [IO.File]::WriteAllText($probePath, [IO.File]::ReadAllText($modulePath), (New-Object Text.UTF8Encoding($false)))
    $old = Test-NativeInclude $probePath
    if ($old -notmatch '^ERROR 14:') { throw "Expected original encoding failure, got: $old" }
    $fixed = Test-NativeInclude $modulePath
    if ($fixed -ne 'COMPILE_OK') { throw "Fixed module failed: $fixed" }
    if ($indesign.Documents.Count -ne $documentCount) { throw 'Document count changed during compile-only check.' }
    Write-Output "PASS InDesign $($indesign.Version): no-BOM control = $old; BOM module = $fixed; no document creation."
} finally {
    if (Test-Path -LiteralPath $probePath) { Remove-Item -LiteralPath $probePath }
}
