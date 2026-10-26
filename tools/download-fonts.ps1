# downloads a font allowed for bundling under SIL OFL 1.1.
# Run from the project root: powershell -ExecutionPolicy Bypass -File .\tools\download-fonts.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root "public\assets\fonts"
New-Item -Path $dest -ItemType Directory -Force | Out-Null

$items = @(
    @{ Name = "NotoSansKR-variable.ttf"; Url = "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf" },
    @{ Name = "OFL.txt"; Url = "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/OFL.txt" }
)
try {
    foreach ($item in $items) {
        $target = Join-Path $dest $item.Name
        $temp = "$target.download"
        Invoke-WebRequest -Uri $item.Url -OutFile $temp -UseBasicParsing
        if ((Get-Item $temp).Length -le 0) { throw "Empty file: $($item.Name)" }
        if ($item.Name -eq "NotoSansKR-variable.ttf") {
            $header = [System.IO.File]::ReadAllBytes($temp)
            if ($header.Length -lt 12) { throw "Invalid font file (too short)" }
            # TrueType sfnt magic = 00 01 00 00, OpenType = OTTO.
            $sfnt = ($header[0] -eq 0 -and $header[1] -eq 1 -and $header[2] -eq 0 -and $header[3] -eq 0)
            $otf = ([System.Text.Encoding]::ASCII.GetString($header,0,4) -eq "OTTO")
            if (-not ($sfnt -or $otf)) { throw "Unexpected font signature" }
        } else {
            $license = Get-Content $temp -Raw
            if ($license -notmatch "SIL OPEN FONT LICENSE Version 1\.1") { throw "Missing OFL 1.1" }
        }
        Move-Item -Path $temp -Destination $target -Force
        $hash = (Get-FileHash -Path $target -Algorithm SHA256).Hash
        Write-Host "$($item.Name) SHA256=$hash"
    }
    Write-Host "Fonts installed into $dest. Preserve OFL.txt when shipping."
} catch {
    Write-Error "Font acquisition failed: $_"
    exit 1
}
