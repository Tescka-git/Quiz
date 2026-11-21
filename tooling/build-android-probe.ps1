$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$jdkDirectory = Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tools/jdk17') -Directory | Select-Object -First 1
if (-not $jdkDirectory) { throw 'JDK local absent : consulter le README de la sonde Android.' }
$gradlePath = Join-Path $projectRoot '.tools/gradle-8.11.1/bin/gradle.bat'
if (-not (Test-Path -LiteralPath $gradlePath)) { throw 'Gradle 8.11.1 local absent.' }
$savedJava = $env:JAVA_HOME
$savedAndroid = $env:ANDROID_HOME
$savedGradle = $env:GRADLE_USER_HOME
try {
    $env:JAVA_HOME = $jdkDirectory.FullName
    $env:ANDROID_HOME = Join-Path $projectRoot '.tools/android-sdk'
    $env:GRADLE_USER_HOME = Join-Path $projectRoot '.tools/gradle-home'
    Push-Location (Join-Path $projectRoot 'experiments/android-local-pwa/android')
    try {
        & $gradlePath assembleDebug --console=plain
        if ($LASTEXITCODE -ne 0) { throw "Compilation Android échouée (code $LASTEXITCODE)." }
    } finally { Pop-Location }
} finally {
    $env:JAVA_HOME = $savedJava
    $env:ANDROID_HOME = $savedAndroid
    $env:GRADLE_USER_HOME = $savedGradle
}
