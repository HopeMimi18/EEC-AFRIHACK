param(
  [string]$ProjectRoot = "C:\Users\hopel\Music\EEC-AFRIHACK"
)

$ErrorActionPreference = "Stop"

$project = (Resolve-Path $ProjectRoot).Path
$appPath = Join-Path $project "frontend\src\App.tsx"
$cssPath = Join-Path $project "frontend\src\App.css"
$indexPath = Join-Path $project "frontend\index.html"

foreach ($path in @($appPath, $cssPath, $indexPath)) {
  if (-not (Test-Path $path)) {
    throw "Required file not found: $path"
  }
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
$app = [System.IO.File]::ReadAllText($appPath, [System.Text.Encoding]::UTF8)

# Register the offline emergency service worker from the React app in production.
if ($app -notmatch 'emergency-sw\.js') {
  $appAnchor = "function App() {"
  if (-not $app.Contains($appAnchor)) {
    throw "Could not find App() anchor in App.tsx"
  }

  $appRegistration = @'
function App() {
  useEffect(() => {
    if (
      import.meta.env.PROD &&
      "serviceWorker" in navigator
    ) {
      void navigator.serviceWorker
        .register("/emergency-sw.js")
        .catch(() => undefined);
    }
  }, []);
'@

  $app = $app.Replace($appAnchor, $appRegistration)
}

# Add public emergency access on the main role landing page.
if ($app -notmatch 'OPEN EMERGENCY ACCESS') {
  $landingAnchor = '        <div className="landing-footnote">'

  if (-not $app.Contains($landingAnchor)) {
    throw "Could not find landing footnote anchor in App.tsx"
  }

  $landingFeature = @'
        <div className="public-emergency-access">
          <div>
            <span className="public-emergency-kicker">
              NO ACCOUNT REQUIRED
            </span>
            <strong>Need urgent help?</strong>
            <p>
              Open South African emergency contacts and your saved ICE contact, even when the portal is offline.
            </p>
          </div>

          <a
            className="public-emergency-button"
            href="/emergency.html"
          >
            <AlertTriangle size={18} />
            OPEN EMERGENCY ACCESS
          </a>
        </div>

'@

  $app = $app.Replace($landingAnchor, $landingFeature + $landingAnchor)
}

# Add the same unauthenticated entry point to the client/adviser login screen.
if ($app -notmatch 'login-emergency-link') {
  $loginAnchor = '        <div className="demo-credentials">'

  if (-not $app.Contains($loginAnchor)) {
    throw "Could not find demo credentials anchor in App.tsx"
  }

  $loginFeature = @'
        <a
          className="login-emergency-link"
          href="/emergency.html"
        >
          <AlertTriangle size={17} />
          Emergency Access — no sign-in required
        </a>

'@

  $app = $app.Replace($loginAnchor, $loginFeature + $loginAnchor)
}

[System.IO.File]::WriteAllText($appPath, $app, $utf8)

$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)
if ($css -notmatch 'BONUS: Public offline emergency access') {
  $css += @'

/* -------------------------------------------------------
   BONUS: Public offline emergency access
------------------------------------------------------- */

.public-emergency-access {
  margin-top: 18px;
  padding: 18px 20px;
  border: 1px solid rgba(215, 181, 109, 0.28);
  border-radius: 16px;
  background: rgba(181, 138, 66, 0.1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.public-emergency-access > div {
  min-width: 0;
}

.public-emergency-kicker {
  display: block;
  margin-bottom: 5px;
  color: #d7b56d;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
}

.public-emergency-access strong {
  display: block;
  font-size: 17px;
}

.public-emergency-access p {
  margin: 5px 0 0;
  color: #b9c6cc;
  font-size: 12px;
  line-height: 1.5;
}

.public-emergency-button,
.login-emergency-link {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 11px;
  font-weight: 900;
  text-decoration: none;
}

.public-emergency-button {
  flex: 0 0 auto;
  padding: 0 16px;
  background: #b58a42;
  color: #0b1d2a;
  font-size: 11px;
}

.public-emergency-button:hover {
  background: #d7b56d;
}

.login-emergency-link {
  width: 100%;
  margin-top: 16px;
  padding: 0 14px;
  border: 1px solid rgba(164, 68, 68, 0.22);
  background: rgba(164, 68, 68, 0.06);
  color: #8c3535;
  font-size: 12px;
}

.login-emergency-link:hover {
  background: rgba(164, 68, 68, 0.1);
}

@media (max-width: 720px) {
  .public-emergency-access {
    align-items: stretch;
    flex-direction: column;
  }

  .public-emergency-button {
    width: 100%;
  }
}
'@
  [System.IO.File]::WriteAllText($cssPath, $css, $utf8)
}

$index = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
if ($index -notmatch 'manifest\.webmanifest') {
  $manifestMarkup = @'
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#0b1d2a" />
'@
  $index = $index.Replace("  </head>", $manifestMarkup + "`r`n  </head>")
  [System.IO.File]::WriteAllText($indexPath, $index, $utf8)
}

Write-Host ""
Write-Host "Royal Square bonus emergency feature applied." -ForegroundColor Green
Write-Host "Updated: frontend/src/App.tsx"
Write-Host "Updated: frontend/src/App.css"
Write-Host "Updated: frontend/index.html"
Write-Host "Public emergency files should already be under frontend/public/."
Write-Host ""
Write-Host "Next: cd $project\frontend"
Write-Host "Then: npm run build"
