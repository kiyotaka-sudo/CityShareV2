# Répare la propriété des tables PostgreSQL pour cityshare_user (erreur Flyway V2).
# Usage (PowerShell, depuis cityshare-backend) :
#   .\scripts\fix-db.ps1
# Mot de passe : utilisateur postgres (souvent celui défini à l'installation).

$ErrorActionPreference = "Stop"
$backendRoot = Split-Path $PSScriptRoot -Parent
$sqlFile = Join-Path $PSScriptRoot "fix-db-ownership.sql"

$psqlCandidates = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe"
)

$psql = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $psql) {
    $psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
}
if (-not $psql) {
    Write-Error "psql introuvable. Installez PostgreSQL ou ajoutez son dossier bin au PATH."
}

Write-Host "Utilisation de: $psql"
Write-Host "Script SQL: $sqlFile"
Write-Host "Connexion: postgres @ base cityshare (mot de passe demandé si besoin)"
& $psql -U postgres -d cityshare -f $sqlFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'OK - relancez le backend: .\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run'
