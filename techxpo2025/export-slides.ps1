# PowerShell script to export PowerPoint slides to images
param(
    [string]$PowerPointFile = "TECHXPO BÁN KẾT.pptx",
    [string]$OutputFolder = "slides"
)

# Create output folder if it doesn't exist
if (!(Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force
}

try {
    # Create PowerPoint application object
    $PowerPoint = New-Object -ComObject PowerPoint.Application
    $PowerPoint.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse
    
    # Open the presentation
    $Presentation = $PowerPoint.Presentations.Open((Resolve-Path $PowerPointFile).Path)
    
    # Export each slide as PNG
    for ($i = 1; $i -le $Presentation.Slides.Count; $i++) {
        $outputPath = Join-Path $OutputFolder "slide_$($i.ToString('D2')).png"
        $Presentation.Slides.Item($i).Export($outputPath, "PNG", 1920, 1080)
        Write-Host "Exported slide $i to $outputPath"
    }
    
    # Close presentation and quit PowerPoint
    $Presentation.Close()
    $PowerPoint.Quit()
    
    # Release COM objects
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Presentation) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($PowerPoint) | Out-Null
    [System.GC]::Collect()
    
    Write-Host "Successfully exported all slides!"
    
} catch {
    Write-Error "Error exporting slides: $($_.Exception.Message)"
    Write-Host "Please try exporting slides manually from PowerPoint:"
    Write-Host "1. Open TECHXPO BÁN KẾT.pptx"
    Write-Host "2. File → Export → Change File Type → PNG"
    Write-Host "3. Choose 'All Slides' and save to 'slides' folder"
}
