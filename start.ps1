# Start all Pegasus services: Docker (postgres, redis, worker) + frontend + backend

$root = $PSScriptRoot

Write-Host "Starting Docker services (postgres, redis, worker)..." -ForegroundColor Cyan
docker compose -f "$root\docker-compose.yml" up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Compose failed. Make sure Docker is running." -ForegroundColor Red
    exit 1
}
Write-Host "Docker services started." -ForegroundColor Green

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
