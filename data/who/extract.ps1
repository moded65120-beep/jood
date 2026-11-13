# Read-only OOXML extraction using .NET; no Excel installation or packages needed.
# Original workbook bytes and numeric cell text remain untouched.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Read-ZipXml($zip, $name) {
  $entry = $zip.GetEntry($name)
  if (!$entry) { return $null }
  $reader = [IO.StreamReader]::new($entry.Open())
  try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}
$sources = Get-Content (Join-Path $PSScriptRoot 'sources.json') -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'extracted') | Out-Null
foreach ($source in $sources | Where-Object { $_.file -like '*.xlsx' }) {
  $path = Join-Path $PSScriptRoot $source.file
  if ((Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $source.sha256) { throw "Checksum mismatch: $path" }
  $zip = [IO.Compression.ZipFile]::OpenRead($path)
  try {
    $stringsXml = Read-ZipXml $zip 'xl/sharedStrings.xml'
    $strings = @($stringsXml.sst.si | ForEach-Object { $_.InnerText })
    $workbook = Read-ZipXml $zip 'xl/workbook.xml'
    if (@($workbook.workbook.sheets.sheet).Count -ne 1) { throw "Unexpected sheet count: $path" }
    $sheet = Read-ZipXml $zip 'xl/worksheets/sheet1.xml'
    $rows = [Collections.Generic.List[object]]::new()
    $headers = $null
    foreach ($row in $sheet.worksheet.sheetData.row) {
      $cells = @($row.c)
      $values = @($cells | ForEach-Object {
        if ($_.f) { throw "Unexpected formula at $($_.r)" }
        if ($_.t -eq 's') { $strings[[int]$_.v] }
        elseif ($_.t -eq 'inlineStr') { $_.is.InnerText }
        else { [string]$_.v }
      })
      if (!$headers) { $headers = $values; continue }
      if ($values.Count -ne $headers.Count) { throw "Incomplete row $($row.r): $path" }
      $rows.Add($values)
    }
    $properties = Read-ZipXml $zip 'docProps/core.xml'
    $result = [ordered]@{ sourceFile = $source.file; sourceSha256 = $source.sha256; sheet = [string]$workbook.workbook.sheets.sheet.name; workbookCreated = $properties.coreProperties.created.InnerText; workbookModified = $properties.coreProperties.modified.InnerText; columns = $headers; rows = $rows.ToArray() }
    $name = [IO.Path]::GetFileNameWithoutExtension($path)
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot "extracted/$name.json"), (ConvertTo-Json -InputObject $result -Depth 6 -Compress), [Text.UTF8Encoding]::new($false))
    Write-Output "$name : $($rows.Count) rows; $($headers -join ', ')"
  } finally { $zip.Dispose() }
}
