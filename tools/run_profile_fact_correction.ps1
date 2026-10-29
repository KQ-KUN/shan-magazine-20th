param([string]$ProjectRoot=(Join-Path $PSScriptRoot '..'))
$ErrorActionPreference='Stop'
$profileRoot=[IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
$profileOut=Join-Path $profileRoot 'exports/profile_fact_correction'
New-Item -ItemType Directory -Force -Path $profileOut | Out-Null
$profileStart=Get-Date
$profileStage='InDesign COM readiness'
try {
 $profileApp=New-Object -ComObject InDesign.Application.2026
 $profileStage='native compile/layout/export'
 $profileCode='(function(){return app.doScript(File("__ROOT__/build/50_association_profile_fact_correction.jsx"),ScriptLanguage.JAVASCRIPT);}());'.Replace('__ROOT__',$profileRoot)
 $profileResult=$profileApp.DoScript($profileCode,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
 [IO.File]::WriteAllText((Join-Path $profileOut 'PROFILE_HOST_RESULT.txt'),[string]$profileResult,[Text.UTF8Encoding]::new($false))
 if($null -eq $profileResult -or $profileResult -notlike 'PASS profile fact correction*'){throw ('Native result: '+$profileResult)}
 foreach($profileName in @('ASSOCIATION_PROFILE_CORRECTED.indd','ASSOCIATION_PROFILE_CORRECTED.pdf','PROFILE_NATIVE_REPORT.txt','PROFILE_VISIBLE_TEXT.txt')){
  $profileFile=Get-Item -LiteralPath (Join-Path $profileOut $profileName)
  if($profileFile.Length -eq 0 -or $profileFile.LastWriteTime -lt $profileStart){throw ('Missing/stale result '+$profileName)}
 }
 Write-Output $profileResult
} catch {
 $profileFailure='BLOCKED_HOST_OR_REPO; stage='+$profileStage+'; error='+$_.Exception.Message
 [IO.File]::WriteAllText((Join-Path $profileOut 'PROFILE_HOST_RESULT.txt'),$profileFailure,[Text.UTF8Encoding]::new($false))
 throw $profileFailure
}
