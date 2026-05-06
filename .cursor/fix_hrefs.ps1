# Transforms <a href="#" ... onclick="showPage('X')..."> to <a href="X.html" ...>
# Used as a one-time fix; the SPA click interceptor handles in-doc navigation.
$files = @('index.html', 'about.html', 'contact.html', 'membership.html', 'press.html', 'faq.html', 'junior.html')
$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

foreach ($f in $files) {
  $path = Join-Path $root $f
  if (-not (Test-Path $path)) { continue }
  $content = Get-Content -Raw -LiteralPath $path
  # Pattern: href="#" with subsequent onclick="showPage('PAGE'); ..."
  # Replace with href="PAGE.html" and keep onclick as a safety net.
  # Map 'home' -> index.html, others -> <name>.html
  $pattern = 'href="#"(\s+[^>]*?)onclick="showPage\(''([a-z]+)''\)'
  $content = [System.Text.RegularExpressions.Regex]::Replace(
    $content,
    $pattern,
    {
      param($m)
      $page = $m.Groups[2].Value
      $url = if ($page -eq 'home') { 'index.html' } else { "$page.html" }
      'href="' + $url + '"' + $m.Groups[1].Value + 'onclick="showPage(''' + $page + ''')'
    }
  )
  # Also handle order: onclick first, href second (rare)
  $pattern2 = 'onclick="showPage\(''([a-z]+)''\)([^"]*)"(\s+[^>]*?)href="#"'
  $content = [System.Text.RegularExpressions.Regex]::Replace(
    $content,
    $pattern2,
    {
      param($m)
      $page = $m.Groups[1].Value
      $url = if ($page -eq 'home') { 'index.html' } else { "$page.html" }
      'onclick="showPage(''' + $page + ''')' + $m.Groups[2].Value + '"' + $m.Groups[3].Value + 'href="' + $url + '"'
    }
  )
  Set-Content -LiteralPath $path -Value $content -NoNewline
  Write-Host "Updated $f"
}
