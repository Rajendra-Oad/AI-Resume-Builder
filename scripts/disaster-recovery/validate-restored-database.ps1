param(
    [Parameter(Mandatory = $true)]
    [string]$ExpectedFlywayVersion
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:DR_DATABASE_URL)) {
    throw "DR_DATABASE_URL must contain the isolated recovery database URL."
}

$databaseUri = [Uri]$env:DR_DATABASE_URL
$databaseName = $databaseUri.AbsolutePath.TrimStart('/')
if ($databaseName -notmatch '(?i)(restore|recovery|dr[-_])') {
    throw "Refusing validation: the target database name must visibly contain restore, recovery, dr- or dr_."
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw "psql is required and must be available on PATH."
}

$validationSql = @'
\set ON_ERROR_STOP on
SELECT current_database() AS recovery_database, current_setting('server_version') AS postgresql_version;

DO $$
DECLARE
    missing_tables text;
BEGIN
    SELECT string_agg(required_table, ', ' ORDER BY required_table)
      INTO missing_tables
      FROM unnest(ARRAY[
          'flyway_schema_history',
          'users',
          'resumes',
          'resume_sections',
          'resume_version_snapshots',
          'ai_requests',
          'ats_reports',
          'job_matches',
          'subscriptions',
          'audit_logs'
      ]) required_table
     WHERE to_regclass('public.' || required_table) IS NULL;

    IF missing_tables IS NOT NULL THEN
        RAISE EXCEPTION 'Required tables missing: %', missing_tables;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM flyway_schema_history WHERE success IS NOT TRUE) THEN
        RAISE EXCEPTION 'Flyway history contains unsuccessful migrations';
    END IF;
END $$;

SELECT 'FLYWAY_VERSION=' || version AS latest_flyway_version
  FROM flyway_schema_history
 WHERE success IS TRUE
 ORDER BY installed_rank DESC
 LIMIT 1;

SELECT COUNT(*) AS application_table_count
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_type = 'BASE TABLE'
   AND table_name <> 'flyway_schema_history';
'@

$result = $validationSql | & psql $env:DR_DATABASE_URL --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only
if ($LASTEXITCODE -ne 0) {
    throw "Restored database structural validation failed."
}

$versionLine = $result | Where-Object { $_ -match '^\s*FLYWAY_VERSION=' } | Select-Object -Last 1
if ([string]::IsNullOrWhiteSpace($versionLine)) {
    throw "Restored database did not return a successful Flyway version."
}
$latestVersion = ($versionLine -replace '^\s*FLYWAY_VERSION=', '').Trim()
if ($latestVersion -ne $ExpectedFlywayVersion) {
    throw "Expected Flyway version $ExpectedFlywayVersion but restored database reports $latestVersion."
}

Write-Host "Restored database validation passed for '$databaseName' at Flyway version $latestVersion."
Write-Host "No application row contents were printed. Continue with isolated application smoke tests."
