Add-Type -AssemblyName System.Drawing

function Create-Sample1 {
    param([string]$path)
    $w = 800; $h = 800
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Base grey fabric
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(215, 218, 220))
    $g.FillRectangle($bgBrush, 0, 0, $w, $h)
    
    # Woven texture (crosshatch)
    $penH = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 150, 155, 160), 1)
    $penV = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 180, 185, 190), 1)
    for ($y = 0; $y -lt $h; $y += 3) {
        $g.DrawLine($penH, 0, $y, $w, $y)
    }
    for ($x = 0; $x -lt $w; $x += 3) {
        $g.DrawLine($penV, $x, 0, $x, $h)
    }
    
    # Defect 1: Oil Stain (approx x: 120, y: 160, w: 96, h: 72)
    $stainBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(140, 75, 75, 70))
    $g.FillEllipse($stainBrush, 120, 160, 96, 72)
    $stainBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(80, 50, 50, 45))
    $g.FillEllipse($stainBrush2, 135, 175, 65, 45)
    
    # Defect 2: Float defect (x: 440, y: 360, w: 176, h: 24)
    $floatBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 245, 245, 240))
    $g.FillRectangle($floatBrush, 440, 360, 176, 24)
    
    # Defect 3: Thick yarn (x: 240, y: 560, w: 64, h: 96)
    $thickPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 100, 100, 100), 4)
    $g.DrawLine($thickPen, 270, 560, 270, 656)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Created $path"
}

function Create-Sample2 {
    param([string]$path)
    $w = 800; $h = 800
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Base Denim Blue
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(45, 68, 104))
    $g.FillRectangle($bgBrush, 0, 0, $w, $h)
    
    # Diagonal twill texture
    $twillPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 220, 230, 245), 1)
    for ($k = -800; $k -lt 1600; $k += 5) {
        $g.DrawLine($twillPen, $k, 0, $k + 800, 800)
    }

    # Defect 1: Slub cluster (x: 200, y: 120, w: 144, h: 48)
    $slubBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 225, 235, 250))
    $g.FillEllipse($slubBrush, 200, 125, 144, 38)
    
    # Defect 2: Broken end (x: 480, y: 440, w: 32, h: 200)
    $brokenPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 20, 30, 50), 3)
    $g.DrawLine($brokenPen, 496, 440, 496, 640)
    
    # Defect 3: Stain (x: 80, y: 640, w: 56, h: 56)
    $stainBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(80, 200, 180, 130))
    $g.FillEllipse($stainBrush, 80, 640, 56, 56)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Created $path"
}

function Create-Sample3 {
    param([string]$path)
    $w = 800; $h = 800
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Base Crisp White / Off-white shirting
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 249, 250))
    $g.FillRectangle($bgBrush, 0, 0, $w, $h)
    
    # Fine weave texture
    $finePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(25, 120, 120, 120), 1)
    for ($y = 0; $y -lt $h; $y += 2) { $g.DrawLine($finePen, 0, $y, $w, $y) }
    for ($x = 0; $x -lt $w; $x += 2) { $g.DrawLine($finePen, $x, 0, $x, $h) }

    # Defect 1: Full-width Weft Bar (y: 304, w: 800, h: 48)
    $barBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 180, 185, 190))
    $g.FillRectangle($barBrush, 0, 304, 800, 48)
    
    # Defect 2: Thin place (x: 336, y: 496, w: 112, h: 32)
    $thinBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 255, 255, 255))
    $g.FillRectangle($thinBrush, 336, 496, 112, 32)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Created $path"
}

function Create-Sample4 {
    param([string]$path)
    $w = 800; $h = 800
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Grey Jersey knit
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(190, 192, 196))
    $g.FillRectangle($bgBrush, 0, 0, $w, $h)
    
    # Knit loop pattern
    $knitPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(35, 100, 100, 105), 1)
    for ($y = 0; $y -lt $h; $y += 4) { $g.DrawLine($knitPen, 0, $y, $w, $y) }

    # Defect 1: Hole / Opening (x: 304, y: 224, w: 48, h: 48)
    $holeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 25, 25, 30))
    $g.FillEllipse($holeBrush, 304, 224, 48, 48)
    
    # Defect 2: Crease mark across width (y: 480, w: 800, h: 64)
    $creaseBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 140, 140, 145))
    $g.FillRectangle($creaseBrush, 0, 480, 800, 64)
    
    # Defect 3: Minor stain (x: 560, y: 120, w: 72, h: 48)
    $stainBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 120, 100, 80))
    $g.FillEllipse($stainBrush, 560, 120, 72, 48)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Created $path"
}

Create-Sample1 "c:\Users\user\Desktop\mvp\thaan-ai\public\samples\sample1.jpg"
Create-Sample2 "c:\Users\user\Desktop\mvp\thaan-ai\public\samples\sample2.jpg"
Create-Sample3 "c:\Users\user\Desktop\mvp\thaan-ai\public\samples\sample3.jpg"
Create-Sample4 "c:\Users\user\Desktop\mvp\thaan-ai\public\samples\sample4.jpg"
