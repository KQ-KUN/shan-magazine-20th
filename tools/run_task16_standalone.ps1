param([string]$ProjectRoot = (Join-Path $PSScriptRoot '..'))
$ErrorActionPreference = 'Stop'
$task16Root = [IO.Path]::GetFullPath($ProjectRoot).Replace('\','/')
$task16Out = Join-Path $task16Root 'exports/task16'
New-Item -ItemType Directory -Force -Path $task16Out | Out-Null
$task16App = New-Object -ComObject InDesign.Application.2026
$task16Code = '(function(){var interaction=app.scriptPreferences.userInteractionLevel;try{app.scriptPreferences.userInteractionLevel=UserInteractionLevels.NEVER_INTERACT;return app.doScript(File("__ROOT__/build/16_content_refinement_test.jsx"),ScriptLanguage.JAVASCRIPT);}finally{app.scriptPreferences.userInteractionLevel=interaction;}}());'
$task16Code = $task16Code.Replace('__ROOT__',$task16Root)
$task16Result = $task16App.DoScript($task16Code,1246973031,[Type]::Missing,[Type]::Missing,[Type]::Missing)
[IO.File]::WriteAllText((Join-Path $task16Out 'STANDALONE_HOST_RESULT.txt'),[string]$task16Result,[Text.UTF8Encoding]::new($false))
Write-Output $task16Result
if($null -eq $task16Result -or $task16Result -notlike 'PASS TASK16*'){exit 1}
