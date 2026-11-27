#Requires -Version 5.1
param([switch]$Build)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$compose = @('compose', '--project-directory', $repo, '-f', (Join-Path $repo 'compose.yaml'))

function Invoke-Docker {
    & docker @args
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed with exit code $LASTEXITCODE."
    }
}

function Get-DevProcess($processId, $service) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
    $candidate = $null
    while ($process) {
        $command = "$($process.ExecutablePath) $($process.CommandLine)"
        if ($service -eq 'frontend' -and $process.Name -eq 'node.exe' -and
            $command -match $frontendPath -and $command -match '\bnext\b.*\b(?:dev|start)\b') {
            $candidate = $process
        }
        if ($service -eq 'backend' -and $process.Name -match '^(?:pythonw?|uvicorn)\.exe$' -and
            $command -match $backendPath -and $command -match '\buvicorn\b.*\bapp\.main:app\b') {
            $candidate = $process
        }
        if (-not $process.ParentProcessId) { break }
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($process.ParentProcessId)"
        if (-not $parent -or $parent.CreationDate -gt $process.CreationDate) { break }
        $process = $parent
    }
    return $candidate
}

if (-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) {
    throw 'Run this script in PowerShell on Windows.'
}

$dockerHost = $env:DOCKER_HOST
if ($env:DOCKER_CONTEXT -or -not $dockerHost) {
    $dockerHost = Invoke-Docker context inspect --format '{{.Endpoints.docker.Host}}'
}
if ($dockerHost -notlike 'npipe://*') {
    throw 'Select the local Docker Desktop context before running this script.'
}

$config = Invoke-Docker @compose config --format json | Out-String | ConvertFrom-Json
$services = @{
    ([int]$config.services.frontend.ports[0].published) = 'frontend'
    ([int]$config.services.backend.ports[0].published) = 'backend'
}
$frontendPath = [regex]::Escape((Join-Path $repo 'studynest_fe')) + '[\\/]'
$backendPath = [regex]::Escape((Join-Path $repo 'studynest_be')) + '[\\/]'
$owned = @{}
foreach ($service in $services.Values) {
    $owned[$service] = @(Invoke-Docker @compose ps --status running --quiet $service)
}

# Docker Desktop may expose container ports through a shared host process.
# Check container ownership before considering host listeners.
$dockerPorts = @{}
$running = @(Invoke-Docker ps --quiet)
if ($running.Count) {
    $containers = Invoke-Docker inspect --format '{"id":{{json .Id}},"name":{{json .Name}},"ports":{{json .NetworkSettings.Ports}}}' @running
    foreach ($line in $containers) {
        $container = $line | ConvertFrom-Json
        foreach ($binding in $container.ports.PSObject.Properties.Value) {
            foreach ($mapping in $binding) {
                if (-not $mapping) { continue }
                $port = [int]$mapping.HostPort
                if (-not $services.ContainsKey($port)) { continue }
                if ($container.id -notin $owned[$services[$port]]) {
                    throw "Port $port belongs to container $($container.name). Use a different dev port."
                }
                $dockerPorts[$port] = $true
            }
        }
    }
}

$toStop = @{}
$portsToFree = @{}
foreach ($listener in Get-NetTCPConnection -State Listen) {
    $port = [int]$listener.LocalPort
    if (-not $services.ContainsKey($port) -or $dockerPorts.ContainsKey($port)) { continue }
    $owner = Get-DevProcess $listener.OwningProcess $services[$port]
    if (-not $owner) {
        throw "Port $port is used by PID $($listener.OwningProcess) outside this repo. Use a different dev port."
    }
    $toStop[$owner.ProcessId] = $owner
    $portsToFree[$port] = $true
}

foreach ($owner in $toStop.Values) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($owner.ProcessId)"
    if ($process -and $process.CreationDate -eq $owner.CreationDate) {
        Write-Host "Stopping $($owner.Name) (PID $($owner.ProcessId)) to free dev ports."
        & taskkill.exe /PID $owner.ProcessId /T /F
        if ($LASTEXITCODE -ne 0) { throw "Could not stop PID $($owner.ProcessId)." }
    }
}

if ($portsToFree.Count) {
    $deadline = [DateTime]::UtcNow.AddSeconds(8)
    do {
        $remaining = Get-NetTCPConnection -State Listen | Where-Object { $portsToFree.ContainsKey([int]$_.LocalPort) }
        if (-not $remaining) { break }
        if ([DateTime]::UtcNow -ge $deadline) { throw 'Dev ports are still busy after stopping the processes.' }
        Start-Sleep -Milliseconds 200
    } while ($true)
}

$up = @('up', '-d')
if ($Build) { $up += '--build' }
Invoke-Docker @compose @up
