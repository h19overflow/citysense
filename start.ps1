# Start both frontend and backend dev servers in parallel

$root = $PSScriptRoot

$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; uvicorn backend.api.main:app --reload --port 8082" -PassThru
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev" -PassThru

Write-Host "Started backend (PID: $($backend.Id)) and frontend (PID: $($frontend.Id))"
Write-Host "Press Ctrl+C to stop this script (close the spawned windows manually)"

try {
    Wait-Process -Id $backend.Id, $frontend.Id
} catch {
    # User pressed Ctrl+C
}
