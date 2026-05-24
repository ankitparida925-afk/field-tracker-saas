. .\security-test.ps1
$ts = (Get-Date).Ticks
$newEmail = "staff_dbg_${ts}@test.com"

Write-Host "Registering: $newEmail"
$stR = Send-Request -Path "/api/auth/register/staff" -Method POST -Body "{`"name`":`"Test`",`"email`":`"$newEmail`",`"password`":`"Secure123`",`"department`":`"Sales`",`"phone`":`"1`",`"organizationId`":`"org-fti`"}"
Write-Host "Register Status: $($stR.StatusCode)"
Write-Host "Register Body: $(ConvertTo-Json -InputObject $stR.Body -Depth 3)"

Write-Host "Logging in: $newEmail"
$nlR = Send-Request -Path "/api/auth/login" -Method POST -Body "{`"email`":`"$newEmail`",`"password`":`"Secure123`"}"
Write-Host "Login Status: $($nlR.StatusCode)"
Write-Host "Login Body: $(ConvertTo-Json -InputObject $nlR.Body -Depth 3)"
