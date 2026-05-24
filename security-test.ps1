$BASE = "http://localhost:3000"
$pass = 0
$fail = 0

function Check {
  param([string]$label, [bool]$result)
  if ($result) {
    Write-Host "  [PASS] $label" -ForegroundColor Green
    $global:pass++
  } else {
    Write-Host "  [FAIL] $label" -ForegroundColor Red
    $global:fail++
  }
}

function Section {
  param([string]$title)
  Write-Host ""
  Write-Host "=== $title ===" -ForegroundColor Cyan
}

# ── Robust HTTP Client Helper ──────────────────────────────────────────
function Send-Request {
  param(
    [string]$Path,
    [string]$Method = "GET",
    [string]$Body = $null,
    [System.Collections.IDictionary]$Headers = @{},
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null
  )

  $params = @{
    Uri = "$BASE$Path"
    Method = $Method
    ContentType = "application/json"
    UseBasicParsing = $true
  }
  if ($Body) { $params["Body"] = $Body }
  if ($Session) { $params["WebSession"] = $Session }
  
  # Copy headers to avoid modifying original
  $h = [System.Collections.Specialized.OrderedDictionary]::new()
  foreach ($k in $Headers.Keys) {
    $h.Add($k, $Headers[$k])
  }
  $params["Headers"] = $h

  $statusCode = 0
  $content = $null
  $respHeaders = @{}

  try {
    $res = Invoke-WebRequest @params
    $statusCode = $res.StatusCode
    $content = $res.Content
    $respHeaders = $res.Headers
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp) {
      $statusCode = [int]$resp.StatusCode
      $respHeaders = $resp.Headers
      $stream = $resp.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $content = $reader.ReadToEnd()
    } else {
      $statusCode = 500
      $content = $_.Exception.Message
      $respHeaders = @{}
    }
  } catch {
    $statusCode = 500
    $content = $_.Exception.Message
    $respHeaders = @{}
  }
  
  $bodyObj = $null
  if ($content) {
    $trimmed = $content.Trim()
    if ($trimmed.StartsWith("{") -or $trimmed.StartsWith("[")) {
      $bodyObj = $content | ConvertFrom-Json -ErrorAction SilentlyContinue
    }
    if ($null -eq $bodyObj) {
      $bodyObj = $content
    }
  }

  return [PSCustomObject]@{
    StatusCode = $statusCode
    Headers = $respHeaders
    Body = $bodyObj
  }
}

# -----------------------------------------------------------------------
Section "1. JWT AUTHENTICATION"
# -----------------------------------------------------------------------

# 1A - Admin login
$adminToken = $null
$r = Send-Request -Path "/api/auth/login" -Method POST -Body '{"email":"admin@fti.com","password":"admin123"}' -Headers @{ "X-Forwarded-For" = "10.0.1.1" }
Check "Admin login returns 200 OK" ($r.StatusCode -eq 200)
Check "Admin login returns accessToken" ($r.Body.accessToken.Length -gt 50)
Check "User role is admin" ($r.Body.user.role -eq "admin")
Check "Token has 3 JWT parts" ($r.Body.accessToken.Split(".").Count -eq 3)
$adminToken = $r.Body.accessToken
if ($adminToken) {
  Write-Host "    Token: $($adminToken.Substring(0,40))...." -ForegroundColor DarkGray
}

# 1B - Wrong password
$wr = Send-Request -Path "/api/auth/login" -Method POST -Body '{"email":"admin@fti.com","password":"WRONG"}' -Headers @{ "X-Forwarded-For" = "10.0.1.2" }
Check "Wrong password returns 401 Unauthorized" ($wr.StatusCode -eq 401)

# 1C - Generic error message (no email leak/enumeration)
$er = Send-Request -Path "/api/auth/login" -Method POST -Body '{"email":"nobody@nowhere.com","password":"x"}' -Headers @{ "X-Forwarded-For" = "10.0.1.3" }
Check "Non-existent user returns 401 Unauthorized" ($er.StatusCode -eq 401)
Check "Error message is generic 'Invalid credentials.'" ($er.Body.error -eq "Invalid credentials.")

# 1D - Employee login
$er2 = Send-Request -Path "/api/auth/login" -Method POST -Body '{"email":"rahul@fti.com","password":"rahul123"}' -Headers @{ "X-Forwarded-For" = "10.0.1.4" }
Check "Employee login returns 200 OK" ($er2.StatusCode -eq 200)
Check "Employee login returns accessToken" ($er2.Body.accessToken.Length -gt 50)
Check "Employee role is employee" ($er2.Body.user.role -eq "employee")

# -----------------------------------------------------------------------
Section "2. SECURITY HEADERS"
# -----------------------------------------------------------------------
$pg = Send-Request -Path "/" -Method GET
Check "Homepage reachable" ($pg.StatusCode -eq 200)
$h = $pg.Headers
Check "X-Frame-Options: DENY" ($h["X-Frame-Options"] -like "*DENY*")
Check "X-Content-Type-Options: nosniff" ($h["X-Content-Type-Options"] -like "*nosniff*")
Check "Referrer-Policy present" ($null -ne $h["Referrer-Policy"])
Check "Content-Security-Policy present" ($null -ne $h["Content-Security-Policy"])
Check "Permissions-Policy present" ($null -ne $h["Permissions-Policy"])
$csp = $h["Content-Security-Policy"]
Check "CSP contains default-src self" ($csp -like "*default-src*")
Check "CSP blocks frame-ancestors none" ($csp -like "*frame-ancestors*none*")

# -----------------------------------------------------------------------
Section "3. RATE LIMITING (max 5 attempts per minute)"
# -----------------------------------------------------------------------
# Use a dynamic IP address for this run to guarantee fresh rate limit entry
$randSuffix = Get-Random -Minimum 1 -Maximum 254
$rateLimitIp = "192.168.88.$randSuffix"
Write-Host "    Using test IP: $rateLimitIp" -ForegroundColor DarkGray

$codes = @()
for ($i = 1; $i -le 7; $i++) {
  $rr = Send-Request -Path "/api/auth/login" -Method POST -Body '{"email":"limiter@test.com","password":"bad"}' -Headers @{ "X-Forwarded-For" = $rateLimitIp }
  $codes += $rr.StatusCode
  Start-Sleep -Milliseconds 50
}
Write-Host "    Response codes: $($codes -join ', ')" -ForegroundColor DarkGray
Check "6th+ attempt blocked with 429 Too Many Requests" ($codes -contains 429)
$first5 = $codes[0..4]
$badFirst5 = $first5 | Where-Object { $_ -ne 401 }
Check "First 5 attempts return 401" ($badFirst5.Count -eq 0)

# -----------------------------------------------------------------------
Section "4. TOKEN REFRESH"
# -----------------------------------------------------------------------
$refreshSess = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$lr = Send-Request -Path "/api/auth/login" -Method POST -Body '{"email":"admin@fti.com","password":"admin123"}' -Headers @{ "X-Forwarded-For" = "10.0.2.1" } -Session $refreshSess
Check "Login before refresh successful" ($lr.StatusCode -eq 200)
$origToken = $lr.Body.accessToken

# Sleep 2 seconds to guarantee a new JWT timestamp (iat is in seconds)
Start-Sleep -Seconds 2
$refR = Send-Request -Path "/api/auth/refresh" -Method POST -Session $refreshSess -Headers @{ "X-Forwarded-For" = "10.0.2.2" }
Check "Refresh returns 200 OK" ($refR.StatusCode -eq 200)
Check "Refresh returns new accessToken" ($refR.Body.accessToken.Length -gt 50)
Check "New token is different from login token" ($refR.Body.accessToken -ne $origToken)

# -----------------------------------------------------------------------
Section "5. LOGOUT AND TOKEN REVOCATION"
# -----------------------------------------------------------------------
$logoutSess = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$lr2 = Send-Request -Path "/api/auth/login" -Method POST -Body '{"email":"admin@fti.com","password":"admin123"}' -Headers @{ "X-Forwarded-For" = "10.0.3.1" } -Session $logoutSess
Check "Login before logout successful" ($lr2.StatusCode -eq 200)

$logR = Send-Request -Path "/api/auth/logout" -Method POST -Session $logoutSess -Headers @{ "X-Forwarded-For" = "10.0.3.2" }
Check "Logout returns 200 OK" ($logR.StatusCode -eq 200)
Check "Logout response shows success:true" ($logR.Body.success -eq $true)

$afterR = Send-Request -Path "/api/auth/refresh" -Method POST -Session $logoutSess -Headers @{ "X-Forwarded-For" = "10.0.3.3" }
Check "Post-logout refresh returns 401 Unauthorized" ($afterR.StatusCode -eq 401)

# -----------------------------------------------------------------------
Section "6. PASSWORD COMPLEXITY"
# -----------------------------------------------------------------------
$uid = [System.Guid]::NewGuid().ToString("N").Substring(0,8)

# No uppercase
$wR = Send-Request -Path "/api/auth/register/org" -Method POST -Body "{`"name`":`"Weak1`",`"email`":`"w1_$uid@test.com`",`"password`":`"nouppercase1`",`"phone`":`"+1`",`"industry`":`"Other`"}" -Headers @{ "X-Forwarded-For" = "10.0.4.1" }
Check "No-uppercase password -> 422 Unprocessable" ($wR.StatusCode -eq 422)

# Too short
$wR2 = Send-Request -Path "/api/auth/register/org" -Method POST -Body "{`"name`":`"Weak2`",`"email`":`"w2_$uid@test.com`",`"password`":`"Ab1`",`"phone`":`"+1`",`"industry`":`"Other`"}" -Headers @{ "X-Forwarded-For" = "10.0.4.2" }
Check "Short password (<8) -> 422 Unprocessable" ($wR2.StatusCode -eq 422)

# Strong password
$sR = Send-Request -Path "/api/auth/register/org" -Method POST -Body "{`"name`":`"SecureCo_$uid`",`"email`":`"sec_$uid@test.com`",`"password`":`"Secure123`",`"phone`":`"+15550001`",`"industry`":`"Other`"}" -Headers @{ "X-Forwarded-For" = "10.0.4.3" }
Check "Strong password (Secure123) -> 201 Created" ($sR.StatusCode -eq 201)

# Duplicate email
$dR = Send-Request -Path "/api/auth/register/org" -Method POST -Body "{`"name`":`"Dup`",`"email`":`"admin@fti.com`",`"password`":`"Secure123`",`"phone`":`"+1`",`"industry`":`"Other`"}" -Headers @{ "X-Forwarded-For" = "10.0.4.4" }
Check "Duplicate email -> 409 Conflict" ($dR.StatusCode -eq 409)

# -----------------------------------------------------------------------
Section "7. PUBLIC ORG LIST (no secrets exposed)"
# -----------------------------------------------------------------------
$ol = Send-Request -Path "/api/auth/register/org" -Method GET
Check "GET org list returns 200 OK" ($ol.StatusCode -eq 200)
Check "GET orgs returns organizations array" ($ol.Body.organizations.Count -ge 1)
$leaked = $ol.Body.organizations | Where-Object { $_.passwordHash -or $_.adminPassword -or $_.password }
Check "No password hashes/secrets in public org list" ($null -eq $leaked -or @($leaked).Count -eq 0)

# -----------------------------------------------------------------------
Section "8. STAFF REGISTRATION"
# -----------------------------------------------------------------------
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$newEmail = "staff_${ts}@test.com"
$stR = Send-Request -Path "/api/auth/register/staff" -Method POST -Body "{`"name`":`"Test Staff`",`"email`":`"$newEmail`",`"password`":`"Secure123`",`"department`":`"Sales`",`"phone`":`"+15550001`",`"organizationId`":`"org-fti`"}" -Headers @{ "X-Forwarded-For" = "10.0.5.1" }
Check "Staff registration -> 201 Created" ($stR.StatusCode -eq 201)

# New staff login
$nlR = Send-Request -Path "/api/auth/login" -Method POST -Body "{`"email`":`"$newEmail`",`"password`":`"Secure123`"}" -Headers @{ "X-Forwarded-For" = "10.0.5.2" }
Check "New staff can login immediately" ($nlR.StatusCode -eq 200)
Check "New staff user role is employee" ($nlR.Body.user.role -eq "employee")

# -----------------------------------------------------------------------
Write-Host ""
Write-Host "=======================================" -ForegroundColor Yellow
$totalLabel = "RESULTS: $pass passed  |  $fail failed"
Write-Host "  $totalLabel" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "=======================================" -ForegroundColor Yellow
