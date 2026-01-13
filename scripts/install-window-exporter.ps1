# Script para instalar Windows Exporter com coletor de processos habilitado
# Execute como Administrador

$MSI_FILE = "windows_exporter-0.31.3-amd64.msi"
$COLLECTORS = "cpu,cpu_info,logical_disk,memory,net,os,process,service"

Write-Host "🔧 Instalando Windows Exporter com coletores habilitados..." -ForegroundColor Cyan

# Verificar se o arquivo MSI existe
if (-not (Test-Path $MSI_FILE)) {
    Write-Host "❌ Arquivo $MSI_FILE não encontrado!" -ForegroundColor Red
    Write-Host "📥 Baixe o Windows Exporter de: https://github.com/prometheus-community/windows_exporter/releases" -ForegroundColor Yellow
    exit 1
}

# Desinstalar versão anterior (se existir)
Write-Host "📋 Verificando instalação anterior..." -ForegroundColor Cyan
$existing = Get-WmiObject win32_service | Where-Object {$_.Name -eq "windows_exporter"}
if ($existing) {
    Write-Host "🛑 Parando serviço windows_exporter..." -ForegroundColor Yellow
    Stop-Service windows_exporter -Force -ErrorAction SilentlyContinue
    
    Write-Host "🗑️  Desinstalando versão anterior..." -ForegroundColor Yellow
    $uninstallArgs = "/x `"$MSI_FILE`" /qn /norestart"
    Start-Process msiexec -ArgumentList $uninstallArgs -Wait -NoNewWindow
    Start-Sleep -Seconds 2
}

# Instalar com coletores habilitados
Write-Host "📦 Instalando Windows Exporter com coletores: $COLLECTORS" -ForegroundColor Cyan
$installArgs = "/i `"$MSI_FILE`" /qn /norestart ENABLED_COLLECTORS=$COLLECTORS"
Start-Process msiexec -ArgumentList $installArgs -Wait -NoNewWindow

# Aguardar instalação
Start-Sleep -Seconds 3

# Verificar se o serviço foi criado
$service = Get-WmiObject win32_service | Where-Object {$_.Name -eq "windows_exporter"}
if ($service) {
    Write-Host "✅ Windows Exporter instalado com sucesso!" -ForegroundColor Green
    
    # Iniciar serviço
    Write-Host "🚀 Iniciando serviço windows_exporter..." -ForegroundColor Cyan
    Start-Service windows_exporter
    
    # Verificar status
    Start-Sleep -Seconds 2
    $status = (Get-Service windows_exporter).Status
    if ($status -eq "Running") {
        Write-Host "✅ Serviço está rodando!" -ForegroundColor Green
        Write-Host "🌐 Métricas disponíveis em: http://localhost:9182/metrics" -ForegroundColor Cyan
        Write-Host "📊 Verifique se as métricas de processos estão disponíveis:" -ForegroundColor Cyan
        Write-Host "   - windows_process_cpu_time_total" -ForegroundColor Yellow
        Write-Host "   - windows_process_working_set_private_bytes" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  Serviço não está rodando. Status: $status" -ForegroundColor Yellow
        Write-Host "📋 Verifique os logs do serviço" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Falha na instalação. Serviço não foi criado." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Instalação concluída!" -ForegroundColor Green

