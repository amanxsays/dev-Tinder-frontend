param(
    [string]$Apk = 'android/app/build/outputs/apk/debug/app-debug.apk',
    [string]$SdkRoot = $env:ANDROID_HOME,
    [string]$BuildToolsVersion = '36.0.0'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not [IO.Path]::IsPathRooted($Apk)) { $Apk = Join-Path $projectRoot $Apk }
if (-not (Test-Path -LiteralPath $Apk -PathType Leaf)) { throw 'APK not found. Build the Android app first or provide -Apk.' }
if (-not $SdkRoot) { $SdkRoot = $env:ANDROID_SDK_ROOT }
if (-not $SdkRoot) { throw 'Set ANDROID_HOME or ANDROID_SDK_ROOT to the installed SDK.' }
$tools = Join-Path $SdkRoot "build-tools/$BuildToolsVersion"
$aapt = Join-Path $tools 'aapt.exe'
$signer = Join-Path $tools 'lib/apksigner.jar'
if (-not (Test-Path -LiteralPath $aapt) -or -not (Test-Path -LiteralPath $signer)) {
    throw 'Android Build Tools are missing. Install the documented version or supply -BuildToolsVersion.'
}
$java = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin/java.exe' } else { (Get-Command java -ErrorAction Stop).Source }

$signature = & $java -jar $signer verify --print-certs $Apk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
$badging = & $aapt dump badging $Apk
if ($LASTEXITCODE -ne 0) { throw 'Cannot read the compiled APK manifest.' }
if (-not (($badging -join "`n") -match "package: name='com\.amanxsays\.devtinder(?:\.debug)?'")) {
    throw 'Unexpected application package. This inspector is for DevTinder APKs.'
}
$permissions = & $aapt dump permissions $Apk
if ($LASTEXITCODE -ne 0) { throw 'Cannot read APK permissions.' }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($Apk)
$checked = 0
try {
    if (-not $archive.GetEntry('assets/public/index.html')) { throw 'Bundled frontend index.html is missing.' }
    foreach ($entry in $archive.Entries) {
        if ($entry.FullName -like 'assets/public/*' -and $entry.FullName -match '\.(js|json|html)$') {
            if ($entry.Length -gt 10MB) { throw 'Unexpectedly large web asset; inspect it manually.' }
            $reader = [IO.StreamReader]::new($entry.Open())
            try { $content = $reader.ReadToEnd() } finally { $reader.Dispose() }
            if ($content -match '-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|mongodb(?:\+srv)?://|isolated-emulator-session-token|isolated-native-fcm-fixture') {
                throw 'Unexpected credential or known fixture-session pattern in web assets. Values suppressed.'
            }
            $checked++
        }
    }
} finally { $archive.Dispose() }

Write-Output 'DevTinder APK inspection (read-only; no upload or installation)'
$badging | Select-String '^package:|^sdkVersion:|^targetSdkVersion:|^application-label:' | ForEach-Object { $_.Line }
Write-Output ('SHA256: ' + (Get-FileHash -LiteralPath $Apk -Algorithm SHA256).Hash)
$signature | Where-Object { $_ -match 'certificate SHA-256 digest:' } | ForEach-Object { Write-Output $_ }
$permissions
Write-Output "PASS: signature verified; $checked bundled text assets checked for targeted credential/fixture patterns."
Write-Output 'This is not a complete security audit. A valid signature does not establish release signing, backend compatibility, notification delivery, or physical-device readiness.'
