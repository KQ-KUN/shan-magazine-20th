param([ValidateSet('fast','sample','full')][string]$Phase='fast',[switch]$Recheck,[string]$ProjectRoot=(Join-Path $PSScriptRoot '..'))
$ErrorActionPreference='Stop'
$messagesRoot=[IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
$messagesOut=Join-Path $messagesRoot 'exports/messages_revision_20261024'
[IO.Directory]::CreateDirectory($messagesOut) | Out-Null
$messagesPython=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$messagesTimer=[Diagnostics.Stopwatch]::StartNew()
$messagesTiming=[ordered]@{requested=$Phase;mode=$Phase;cold_start_ms=0;native_ms=0;validation_ms=0}
function Invoke-MessagesPython([string]$Script,[string[]]$Arguments=@()){
 & $messagesPython -X utf8 (Join-Path $messagesRoot $Script) @Arguments
 if($LASTEXITCODE -ne 0){throw ('Messages Python failed: '+$Script)}
}
function Save-MessagesTiming {
 $messagesTiming.total_ms=$messagesTimer.ElapsedMilliseconds
 [IO.File]::WriteAllText((Join-Path $messagesOut 'FAST_TIMING.json'),($messagesTiming | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
}
Invoke-MessagesPython 'tools/messages_source.py' @('--quiet')
$messagesTiming.prepare_ms=$messagesTimer.ElapsedMilliseconds
$messagesMode=$Phase
if($Phase -eq 'fast'){
 $messagesMode=(& $messagesPython -X utf8 (Join-Path $messagesRoot 'tools/messages_fast.py') plan)
 if($LASTEXITCODE -ne 0){throw 'Fast planning failed'}
 $messagesTiming.mode=$messagesMode
 if($messagesMode -eq 'reuse' -and !$Recheck){Save-MessagesTiming;Write-Output ('PASS reused verified PDF; InDesign not started; ms='+$messagesTiming.total_ms);return}
 if($messagesMode -eq 'reuse' -and $Recheck){$messagesMode='fast';$messagesTiming.mode='fast';$messagesTiming.recheck=$true}
 if($messagesMode -eq 'blocked'){throw 'Saved artifacts changed outside the verified build; inspect FAST_PLAN.json before replacing them'}
}
[IO.File]::WriteAllText((Join-Path $messagesOut 'REQUEST.json'),('{"first_page":1,"sample":'+($messagesMode -eq 'sample').ToString().ToLower()+',"fast":'+($messagesMode -eq 'fast').ToString().ToLower()+'}'),[Text.UTF8Encoding]::new($false))
$messagesNativeTimer=[Diagnostics.Stopwatch]::StartNew()
$messagesProcessesBefore=@(Get-CimInstance Win32_Process -Filter "Name='InDesign.exe'" | Select-Object -ExpandProperty ProcessId)
if($messagesProcessesBefore.Count -eq 0){
 $messagesStartup=[Diagnostics.Stopwatch]::StartNew()
 $messagesLaunched=Start-Process -FilePath 'C:/Program Files/Adobe/Adobe InDesign 2026/InDesign.exe' -WindowStyle Hidden -PassThru
 # Readiness replaces a fixed 45s sleep; never launch GUI and COM concurrently.
 $messagesStable=0;$messagesPreviousCpu=-1
 while($messagesStartup.Elapsed.TotalSeconds -lt 90){
  $messagesLaunched.Refresh()
  if($messagesLaunched.HasExited){throw 'InDesign exited during startup'}
  $messagesCpu=$messagesLaunched.TotalProcessorTime.TotalMilliseconds
  $messagesReady=$messagesLaunched.MainWindowHandle -ne [IntPtr]::Zero -and $messagesLaunched.MainWindowTitle -match 'Adobe.*InDesign' -and $messagesLaunched.Responding
  if($messagesReady -and $messagesPreviousCpu -ge 0 -and ($messagesCpu-$messagesPreviousCpu) -lt 100){$messagesStable++}else{$messagesStable=0}
  if($messagesStable -ge 2){break}
  $messagesPreviousCpu=$messagesCpu;Start-Sleep -Seconds 1
 }
 if($messagesStable -lt 2){throw 'InDesign startup did not reach a ready state; no second instance launched'}
 $messagesTiming.cold_start_ms=$messagesStartup.ElapsedMilliseconds
 $messagesProcessesBefore=@(Get-CimInstance Win32_Process -Filter "Name='InDesign.exe'" | Select-Object -ExpandProperty ProcessId)
}
if($messagesProcessesBefore.Count -ne 1){throw 'Expected one InDesign process; refusing concurrent activation'}
$messagesApp=New-Object -ComObject InDesign.Application.2026
$messagesConnected=@(Get-CimInstance Win32_Process -Filter "Name='InDesign.exe'" | Select-Object -ExpandProperty ProcessId)
if(@($messagesConnected | Where-Object {$_ -notin $messagesProcessesBefore}).Count -gt 0){throw 'COM created another instance; build not executed'}
$messagesResult=$messagesApp.DoScript("app.doScript(File('$messagesRoot/build/49_messages_overprint_test.jsx'),ScriptLanguage.JAVASCRIPT)",1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
$messagesTiming.native_ms=$messagesNativeTimer.ElapsedMilliseconds
[IO.File]::WriteAllText((Join-Path $messagesOut ('HOST_'+$messagesMode+'.txt')),[string]$messagesResult,[Text.UTF8Encoding]::new($false))
Write-Output ([string]$messagesResult).Split("`n")[0]
if($messagesResult -notlike 'PASS *'){Save-MessagesTiming;throw 'Native build failed; see MESSAGES_RUNTIME_ERROR.txt'}
$messagesValidationTimer=[Diagnostics.Stopwatch]::StartNew()
if($messagesMode -eq 'fast'){Invoke-MessagesPython 'tools/messages_fast.py' @('verify')}
elseif($messagesMode -eq 'sample'){Invoke-MessagesPython 'tools/messages_overprint.py' @('sample')}
else{Invoke-MessagesPython 'tools/messages_overprint.py';Invoke-MessagesPython 'tools/messages_fast.py' @('stamp')}
$messagesTiming.validation_ms=$messagesValidationTimer.ElapsedMilliseconds
Save-MessagesTiming
