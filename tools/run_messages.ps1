param([ValidateSet('all','render','component','assembly')][string]$Phase='all',[string]$ProjectRoot=(Join-Path $PSScriptRoot '..'))
$ErrorActionPreference='Stop'
$messagesRoot=[IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
$messagesOut=Join-Path $messagesRoot 'exports/messages_v2'
$messagesPython=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
function Invoke-MessagesPython([string]$Script,[string[]]$Arguments=@()){
 & $messagesPython -X utf8 (Join-Path $messagesRoot $Script) @Arguments
 if($LASTEXITCODE -ne 0){throw 'Messages Python failed: '+$Script}
}
function Invoke-MessagesNative([string]$BuildPhase){
 [IO.File]::WriteAllText((Join-Path $messagesOut 'REQUEST.json'),('{"first_page":'+$script:messagesFirstPage+',"component":'+($BuildPhase -eq 'component').ToString().ToLower()+'}'),[Text.UTF8Encoding]::new($false))
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
 $messagesBuild=if($BuildPhase -eq 'assembly'){'48_messages_v2_assembly.jsx'}else{'47_messages_test.jsx'}
 $messagesResult=$messagesApp.DoScript("app.doScript(File('$messagesRoot/build/$messagesBuild'),ScriptLanguage.JAVASCRIPT)",1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
 $messagesProcessesAfter=@(Get-CimInstance Win32_Process -Filter "Name='InDesign.exe'" | Select-Object -ExpandProperty ProcessId)
 [IO.File]::WriteAllText((Join-Path $messagesOut ('HOST_'+$BuildPhase+'.txt')),([string]$messagesResult+';processesBefore='+($messagesProcessesBefore -join ',')+';processesAfter='+($messagesProcessesAfter -join ',')),[Text.UTF8Encoding]::new($false))
 Write-Output $messagesResult
 if($messagesResult -notlike 'PASS *'){$messagesErrorLog=if($BuildPhase -eq 'assembly'){'PRINT_RUNTIME_ERROR.txt'}else{'MESSAGES_RUNTIME_ERROR_V2.txt'};throw ('Host failed; see exports/messages_v2/'+$messagesErrorLog)}
 if($messagesProcessesBefore.Count -gt 0 -and @($messagesProcessesAfter | Where-Object {$_ -notin $messagesProcessesBefore}).Count -gt 0){throw 'Unexpected duplicate InDesign instance; do not manually launch another process'}
}
$script:messagesFirstPage=1
if($Phase -in @('all','render')){Invoke-MessagesPython 'tools/messages_source.py';Invoke-MessagesNative 'render';Invoke-MessagesPython 'tests/messages_outputs.py'}
if($Phase -eq 'all'){Invoke-MessagesPython 'tools/messages_v2_book.py' @('start')}
if($Phase -in @('all','component')){
 $messagesResolved=Get-Content -Raw -LiteralPath (Join-Path $messagesOut 'ASSEMBLY_START.json') | ConvertFrom-Json
 $script:messagesFirstPage=$messagesResolved.start_page
 Invoke-MessagesNative 'component'
}
if($Phase -in @('all','assembly')){Invoke-MessagesPython 'tools/messages_v2_book.py' @('resolve');Invoke-MessagesNative 'assembly';Invoke-MessagesPython 'tools/messages_v2_book.py' @('finish');Invoke-MessagesPython 'tests/messages_outputs.py' @('book')}
