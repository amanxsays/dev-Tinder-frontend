param(
    [string]$KeystorePath = "$env:USERPROFILE\.devtinder\devtinder-release.p12",
    [string]$KeyAlias = 'devtinder-release'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $KeystorePath -PathType Leaf)) {
    throw 'The permanent release keystore was not found. Supply -KeystorePath; do not create a replacement key.'
}
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\DevTinderAndroidSdk\sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:VITE_API_URL = 'https://dev-tinder-backend-lmw0.onrender.com'
$env:VITE_STATS_SERVICE_URL = 'https://dev-tinder-spring-backend.onrender.com'
$env:VITE_AI_CHAT_ENABLED = 'true'
$env:DEVTINDER_KEYSTORE_PATH = (Resolve-Path -LiteralPath $KeystorePath).Path
$env:DEVTINDER_KEY_ALIAS = $KeyAlias
$releasePassword = Read-Host 'Enter your release keystore password (hidden)' -AsSecureString
$releasePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($releasePassword)
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    $env:DEVTINDER_KEYSTORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($releasePointer)
    $env:DEVTINDER_KEY_PASSWORD = $env:DEVTINDER_KEYSTORE_PASSWORD
    npm.cmd run android:release
    if ($LASTEXITCODE -ne 0) { throw 'Release build failed. No APK was published.' }
    npm.cmd run android:inspect -- -Apk android/app/build/outputs/apk/release/app-release.apk
    if ($LASTEXITCODE -ne 0) { throw 'APK inspection failed. No APK was published.' }
    Write-Output 'Signed APK built and inspected. Ready for final verification; nothing uploaded.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($releasePointer)
    Remove-Item Env:DEVTINDER_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:DEVTINDER_KEY_PASSWORD -ErrorAction SilentlyContinue
    $releasePassword.Dispose()
    Pop-Location
}
