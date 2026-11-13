$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $root 'raw') | Out-Null
$sources = @()
foreach ($indicator in @('weight-for-age', 'length-height-for-age', 'head-circumference-for-age')) {
  $pageUrl = "https://www.who.int/tools/child-growth-standards/standards/$indicator"
  $page = Invoke-WebRequest -Uri $pageUrl -UseBasicParsing
  $links = @($page.Links | Where-Object { $_.href -match 'expanded-tables\.xlsx' } | Select-Object -ExpandProperty href -Unique)
  if ($links.Count -ne 4) { throw "Expected four expanded workbooks on $pageUrl; found $($links.Count)" }
  foreach ($url in $links) {
    $name = [IO.Path]::GetFileName(([uri]$url).AbsolutePath)
    $path = Join-Path $root "raw/$name"
    Invoke-WebRequest -Uri $url -OutFile $path -UseBasicParsing
    $sources += [ordered]@{ file = "raw/$name"; indicator = $indicator; sourcePage = $pageUrl; url = $url; retrievedAtUtc = [DateTime]::UtcNow.ToString('o'); bytes = (Get-Item $path).Length; sha256 = (Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant() }
    Write-Output "Downloaded $name"
  }
}
$documents = @{
 'instructions-en.pdf' = 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/instructions-en.pdf?sfvrsn=5cec8c61_23'
 'anthro-pc-manual-v322.pdf' = 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/software/anthro-pc-manual-v322.pdf?sfvrsn=c4e76522_2'
 'computation-2007-reference.pdf' = 'https://www.who.int/docs/default-source/child-growth/growth-reference-5-19-years/computation.pdf'
}
foreach ($name in $documents.Keys) {
  $path = Join-Path $root "raw/$name"
  Invoke-WebRequest -Uri $documents[$name] -OutFile $path -UseBasicParsing
  $sources += [ordered]@{ file = "raw/$name"; url = $documents[$name]; retrievedAtUtc = [DateTime]::UtcNow.ToString('o'); bytes = (Get-Item $path).Length; sha256 = (Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant() }
}
[IO.File]::WriteAllText((Join-Path $root 'sources.json'), (ConvertTo-Json -InputObject $sources -Depth 6), [Text.UTF8Encoding]::new($false))
