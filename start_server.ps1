# PowerShell Lightweight Local Web Server for PLN UIT JBB Dashboard
$port = 8085
$url = "http://localhost:$port/"
$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = Get-Location }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  PLN UIT JBB - Dashboard Pemeliharaan Gardu Induk Server" -ForegroundColor Yellow
    Write-Host "  Server running at: $url" -ForegroundColor Green
    Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Cyan
    
    # Open default browser
    Start-Process $url
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath.TrimStart('/')
        if ($localPath -eq "" -or $localPath -eq "/") {
            $localPath = "index.html"
        }
        
        $filePath = Join-Path $baseDir $localPath
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            switch ($ext) {
                ".html" { $contentType = "text/html; charset=utf-8" }
                ".htm"  { $contentType = "text/html; charset=utf-8" }
                ".css"  { $contentType = "text/css; charset=utf-8" }
                ".js"   { $contentType = "application/javascript; charset=utf-8" }
                ".json" { $contentType = "application/json; charset=utf-8" }
                ".png"  { $contentType = "image/png" }
                ".jpg"  { $contentType = "image/jpeg" }
                ".svg"  { $contentType = "image/svg+xml" }
                ".csv"  { $contentType = "text/csv; charset=utf-8" }
            }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $localPath")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Host "Server stopped or error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
