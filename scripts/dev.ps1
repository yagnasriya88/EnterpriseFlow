$root = Split-Path -Parent $PSScriptRoot

$backend = Start-Process -FilePath "powershell" -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\backend'; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"
) -PassThru

$frontend = Start-Process -FilePath "powershell" -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\frontend'; npm run dev"
) -PassThru

Write-Host "Backend running in PID $($backend.Id) (http://localhost:8000), frontend in PID $($frontend.Id) (http://localhost:3000)."
Write-Host "Close those windows (or Stop-Process -Id) to stop them."
