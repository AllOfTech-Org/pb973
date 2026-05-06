# Generate per-page SPA bundles from index.html with the right active page set.
# Keeps about/contact/membership/press in sync with the canonical index.html
# while pre-setting the proper active tab + page so the file renders correctly
# even before the JS runs (and stays correct if JS fails entirely).

$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$canonicalPath = Join-Path $root 'index.html'
$canonical = Get-Content -Raw -LiteralPath $canonicalPath

$pages = @(
  @{ id = 'about';      file = 'about.html';      title = 'About PB(973) - Play The Code | Indoor Pickleball Club Flanders NJ'; desc = 'Learn about PB(973) - the premium indoor pickleball social club in Flanders, NJ. Championship courts, players lounge, junior programs, and a vibrant social community.'; ogTitle = 'About PB(973) — Play The Code'; ogDesc = 'A flagship indoor pickleball social club coming to Flanders, NJ. Six championship courts, mezzanine lounge, and curated social programming.' },
  @{ id = 'contact';    file = 'contact.html';    title = 'Contact PB(973) | Indoor Pickleball Club Flanders NJ'; desc = 'Contact PB(973) about memberships, junior programs, events, partnerships, or press. Located at 90 Bartley Flanders Road, Flanders NJ. Call (973) 973-7297.'; ogTitle = 'Contact PB(973) — Play The Code'; ogDesc = 'Reach our concierge team about memberships, programming, and partnerships. Located at 90 Bartley Flanders Road, Flanders NJ.' },
  @{ id = 'membership'; file = 'membership.html'; title = 'Membership Plans - PB(973) | Annual & Monthly Pickleball Memberships'; desc = 'PB(973) memberships in Flanders, NJ - Code Priority, Code Premium, Code Senior 65+, and Founders Code 125. Pay-as-you-go, monthly, and annual plans available.'; ogTitle = 'PB(973) Memberships — Play The Code'; ogDesc = 'Annual, monthly, senior, and founders memberships at PB(973). Pick the lane that matches your calendar.' },
  @{ id = 'press';      file = 'press.html';      title = 'Press & Media - PB(973) | Indoor Pickleball Club Flanders NJ'; desc = 'PB(973) press coverage, media mentions, and high-resolution assets. NJBIZ, Real Estate NJ, and Morris County development coverage of the 15K sq ft pickleball facility.'; ogTitle = 'PB(973) in the Headlines — Press'; ogDesc = 'Press coverage and media mentions for PB(973) — the upcoming 15,000 sq ft indoor pickleball club in Flanders, NJ.' }
)

foreach ($p in $pages) {
  $id = $p.id
  $out = $canonical

  # Update <title>
  $out = $out -replace '<title>.*?</title>', ('<title>' + $p.title + '</title>')

  # Update meta description
  $out = $out -replace '<meta name="description" content="[^"]*">', ('<meta name="description" content="' + $p.desc + '">')

  # Update canonical
  $out = $out -replace '<link rel="canonical" href="[^"]*">', ('<link rel="canonical" href="https://pb973.com/' + $p.file + '">')

  # Update OG tags
  $out = $out -replace '<meta property="og:title" content="[^"]*">', ('<meta property="og:title" content="' + $p.ogTitle + '">')
  $out = $out -replace '<meta property="og:description" content="[^"]*">', ('<meta property="og:description" content="' + $p.ogDesc + '">')
  $out = $out -replace '<meta property="og:url" content="[^"]*">', ('<meta property="og:url" content="https://pb973.com/' + $p.file + '">')

  # Update Twitter tags
  $out = $out -replace '<meta name="twitter:title" content="[^"]*">', ('<meta name="twitter:title" content="' + $p.ogTitle + '">')
  $out = $out -replace '<meta name="twitter:description" content="[^"]*">', ('<meta name="twitter:description" content="' + $p.ogDesc + '">')

  # Move .active off nav-home onto nav-<id>
  $out = $out -replace 'id="nav-home" class="active" aria-selected="true"', 'id="nav-home" aria-selected="false"'
  $out = $out -replace ('id="nav-' + $id + '" aria-selected="false"'), ('id="nav-' + $id + '" class="active" aria-selected="true"')

  # Special case for faq link which has class="green-link" -- not relevant here since we're skipping faq, but keep for safety.

  # Move .page.active off page-home onto page-<id>
  $out = $out -replace '<div id="page-home" class="page active">', '<div id="page-home" class="page">'
  $out = $out -replace ('<div id="page-' + $id + '" class="page">'), ('<div id="page-' + $id + '" class="page active">')

  $outPath = Join-Path $root $p.file
  Set-Content -LiteralPath $outPath -Value $out -NoNewline
  Write-Host ("Synced {0} (active={1})" -f $p.file, $id)
}
