param([ValidateSet('sample','full')][string]$Phase='sample',[string]$ProjectRoot=(Join-Path $PSScriptRoot '..'))
$ErrorActionPreference='Stop'
$messagesRoot=[IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
$messagesOut=Join-Path $messagesRoot 'exports/messages_revision_20261024'
[IO.Directory]::CreateDirectory($messagesOut) | Out-Null
$messagesPython=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
& $messagesPython -X utf8 (Join-Path $messagesRoot 'tools/messages_source.py')
if($LASTEXITCODE -ne 0){throw 'Source verification failed'}
function Invoke-MessagesNative([string]$BuildPhase){
 [IO.File]::WriteAllText((Join-Path $messagesOut 'REQUEST.json'),('{"first_page":1,"sample":'+($BuildPhase -eq 'sample').ToString().ToLower()+'}'),[Text.UTF8Encoding]::new($false))
 # Never cold-start GUI and COM concurrently: they can contend for preferences.
 # Start one ordinary instance first, let startup complete, then attach COM.
 $messagesProcessesBefore=@(Get-CimInstance Win32_Process -Filter "Name='InDesign.exe'" | Select-Object -ExpandProperty ProcessId)
 if($messagesProcessesBefore.Count -eq 0){
  $messagesLaunched=Start-Process -FilePath 'C:/Program Files/Adobe/Adobe InDesign 2026/InDesign.exe' -WindowStyle Hidden -PassThru
  Write-Output ('Starting one InDesign instance; pid='+$messagesLaunched.Id)
  for($messagesWait=0;$messagesWait -lt 45;$messagesWait+=3){Start-Sleep -Seconds 3;if($messagesLaunched.HasExited){throw 'InDesign exited during startup; no COM fallback will be launched'}}
  $messagesProcessesBefore=@(Get-CimInstance Win32_Process -Filter "Name='InDesign.exe'" | Select-Object -ExpandProperty ProcessId)
 }
 if($messagesProcessesBefore.Count -ne 1){throw 'Expected exactly one InDesign process; refusing concurrent activation'}
 if($null -eq $script:messagesApp){$script:messagesApp=New-Object -ComObject InDesign.Application.2026}
 $messagesConnected=@(Get-CimInstance Win32_Process -Filter "Name='InDesign.exe'" | Select-Object -ExpandProperty ProcessId)
 if(@($messagesConnected | Where-Object {$_ -notin $messagesProcessesBefore}).Count -gt 0){throw 'COM created another instance; build not executed'}
 $messagesBuild='49_messages_overprint_test.jsx'
 $messagesResult=$messagesApp.DoScript("app.doScript(File('$messagesRoot/build/$messagesBuild'),ScriptLanguage.JAVASCRIPT)",1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
 $messagesProcessesAfter=@(Get-CimInstance Win32_Process -Filter "Name='InDesign.exe'" | Select-Object -ExpandProperty ProcessId)
 [IO.File]::WriteAllText((Join-Path $messagesOut ('HOST_'+$BuildPhase+'.txt')),([string]$messagesResult+';processesBefore='+($messagesProcessesBefore -join ',')+';processesAfter='+($messagesProcessesAfter -join ',')),[Text.UTF8Encoding]::new($false))
 Write-Output ([string]$messagesResult).Split("`n")[0]
 if($messagesResult -notlike 'PASS *'){throw 'Host failed; see exports/messages_revision_20261024/MESSAGES_RUNTIME_ERROR.txt'}
 if($messagesProcessesBefore.Count -gt 0 -and @($messagesProcessesAfter | Where-Object {$_ -notin $messagesProcessesBefore}).Count -gt 0){throw 'Unexpected duplicate InDesign instance; do not manually launch another process'}
}
Invoke-MessagesNative $Phase
