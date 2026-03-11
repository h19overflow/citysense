# Start all Pegasus services: Docker (postgres, redis, worker) + frontend + backend

$root = $PSScriptRoot

Write-Host "Starting Docker services (postgres, redis, worker)..." -ForegroundColor Cyan
docker compose -f "$root\docker-compose.yml" up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Compose failed. Make sure Docker is running." -ForegroundColor Red
    exit 1
}
Write-Host "Docker services started." -ForegroundColor Green

Write-Host "Clearing any existing processes on ports 8082 and 5173..." -ForegroundColor Cyan
foreach ($port in @(8082, 5173)) {
    $pids = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING" | ForEach-Object {
        ($_ -split '\s+')[-1]
    }
    foreach ($p in $pids) {
        if ($p -match '^\d+$' -and $p -ne '0') {
            taskkill /PID $p /F 2>$null | Out-Null
        }
    }
}
Start-Sleep -Milliseconds 800

Write-Host "Starting backend and frontend..." -ForegroundColor Cyan
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; .\.venv\Scripts\python.exe -m uvicorn backend.api.main:app --reload --port 8082" -PassThru
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev" -PassThru

Write-Host "Backend  (PID: $($backend.Id))  -> http://localhost:8082" -ForegroundColor Green
Write-Host "Frontend (PID: $($frontend.Id))  -> http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop frontend/backend. Run 'docker compose down' to stop Docker services." -ForegroundColor Yellow

try {
    Wait-Process -Id $backend.Id, $frontend.Id
} catch {
    # User pressed Ctrl+C
}
