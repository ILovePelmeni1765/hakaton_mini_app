$ErrorActionPreference = 'Stop'
$ruleName = 'PulseCity-Dev-LAN-5173'
$principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Запустите этот скрипт из PowerShell от имени администратора.'
}

$rule = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if ($rule) {
    Set-NetFirewallRule -Name $ruleName -Enabled True -Direction Inbound -Action Allow -Profile Private -Protocol TCP -LocalPort 5173 -RemoteAddress LocalSubnet | Out-Null
} else {
    New-NetFirewallRule -Name $ruleName -DisplayName 'Пульс города: тестирование по Wi-Fi' -Direction Inbound -Action Allow -Enabled True -Profile Private -Protocol TCP -LocalPort 5173 -RemoteAddress LocalSubnet | Out-Null
}
Write-Output 'Доступ к Пульсу города через порт 5173 разрешён для локальной сети.'
