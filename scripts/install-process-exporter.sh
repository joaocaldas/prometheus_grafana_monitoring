#!/bin/bash

# Script de instalação do Process Exporter para monitorar processos individuais
# Uso: sudo bash scripts/install-process-exporter.sh

set -e

PROCESS_EXPORTER_VERSION="0.8.7"
PROCESS_EXPORTER_USER="process_exporter"
PROCESS_EXPORTER_GROUP="process_exporter"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/process-exporter"
SERVICE_FILE="/etc/systemd/system/process-exporter.service"

echo "🚀 Instalando Process Exporter v${PROCESS_EXPORTER_VERSION}..."

# Verificar se já está instalado
if [ -f "${INSTALL_DIR}/process-exporter" ]; then
    echo "⚠️  Process Exporter já está instalado em ${INSTALL_DIR}/process-exporter"
    read -p "Deseja reinstalar? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Instalação cancelada"
        exit 0
    fi
fi

# Detectar arquitetura
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        ARCH="amd64"
        ;;
    aarch64|arm64)
        ARCH="arm64"
        ;;
    *)
        echo "❌ Arquitetura não suportada: $ARCH"
        exit 1
        ;;
esac

echo "📋 Arquitetura detectada: $ARCH"

# Criar diretório temporário
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

# Download
echo "📥 Baixando Process Exporter..."
DOWNLOAD_URL="https://github.com/ncabatoff/process-exporter/releases/download/v${PROCESS_EXPORTER_VERSION}/process-exporter-${PROCESS_EXPORTER_VERSION}.linux-${ARCH}.tar.gz"

if [ ! -f "process-exporter-${PROCESS_EXPORTER_VERSION}.linux-${ARCH}.tar.gz" ]; then
    wget "$DOWNLOAD_URL" || {
        echo "❌ Erro ao baixar Process Exporter"
        exit 1
    }
fi

# Extrair
echo "📦 Extraindo arquivos..."
tar xzf "process-exporter-${PROCESS_EXPORTER_VERSION}.linux-${ARCH}.tar.gz"
cd "process-exporter-${PROCESS_EXPORTER_VERSION}.linux-${ARCH}"

# Criar usuário
if ! id "$PROCESS_EXPORTER_USER" &>/dev/null; then
    echo "👤 Criando usuário ${PROCESS_EXPORTER_USER}..."
    sudo useradd --no-create-home --shell /bin/false "$PROCESS_EXPORTER_USER" || {
        echo "❌ Erro ao criar usuário"
        exit 1
    }
else
    echo "✅ Usuário ${PROCESS_EXPORTER_USER} já existe"
fi

# Instalar binário
echo "📋 Instalando binário em ${INSTALL_DIR}..."
sudo cp process-exporter "${INSTALL_DIR}/"
sudo chown "${PROCESS_EXPORTER_USER}:${PROCESS_EXPORTER_GROUP}" "${INSTALL_DIR}/process-exporter"
sudo chmod 755 "${INSTALL_DIR}/process-exporter"

# Criar diretório de configuração
echo "📁 Criando diretório de configuração..."
sudo mkdir -p "$CONFIG_DIR"
sudo chown "${PROCESS_EXPORTER_USER}:${PROCESS_EXPORTER_GROUP}" "$CONFIG_DIR"

# Criar arquivo de configuração padrão (se não existir)
if [ ! -f "$CONFIG_DIR/config.yml" ]; then
    echo "📝 Criando arquivo de configuração padrão..."
    sudo tee "$CONFIG_DIR/config.yml" > /dev/null <<EOF
process_names:
  # Monitorar todos os processos individuais por nome
  # Cada processo terá seu próprio grupo baseado no nome do executável
  - name: "{{.Comm}}"
    cmdline:
    - '.+'
EOF
    sudo chown "${PROCESS_EXPORTER_USER}:${PROCESS_EXPORTER_GROUP}" "$CONFIG_DIR/config.yml"
    echo "✅ Arquivo de configuração criado em $CONFIG_DIR/config.yml"
    echo "⚠️  Você pode editar este arquivo para adicionar mais processos"
else
    echo "✅ Arquivo de configuração já existe em $CONFIG_DIR/config.yml"
fi

# Criar arquivo de serviço systemd
echo "⚙️  Criando serviço systemd..."
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Process Exporter
Documentation=https://github.com/ncabatoff/process-exporter
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${PROCESS_EXPORTER_USER}
Group=${PROCESS_EXPORTER_GROUP}
ExecStart=${INSTALL_DIR}/process-exporter -config.path=${CONFIG_DIR}/config.yml --web.listen-address=0.0.0.0:9256
Restart=always
RestartSec=5
TimeoutStopSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=process-exporter

# Segurança (ajustado para permitir acesso ao /proc)
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=false
ProtectHome=true
ReadWritePaths=${CONFIG_DIR}
ReadOnlyPaths=/proc /sys
ProtectKernelTunables=false
ProtectKernelModules=true
ProtectControlGroups=false
RestrictRealtime=false
RestrictNamespaces=false
LockPersonality=false
MemoryDenyWriteExecute=false
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

# Limites de recursos
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Recarregar systemd
echo "🔄 Recarregando systemd..."
sudo systemctl daemon-reload

# Habilitar serviço para iniciar no boot
echo "✅ Habilitando serviço para iniciar no boot..."
sudo systemctl enable process-exporter

# Iniciar serviço
echo "🚀 Iniciando serviço..."
sudo systemctl start process-exporter

# Aguardar alguns segundos
sleep 2

# Verificar status
echo ""
echo "📊 Status do serviço:"
sudo systemctl status process-exporter --no-pager -l || true

echo ""
echo "🔍 Verificando se está respondendo na porta 9256..."
if curl -s http://localhost:9256/metrics > /dev/null; then
    echo "✅ Process Exporter está funcionando!"
    echo ""
    echo "📋 Informações:"
    echo "   - Binário: ${INSTALL_DIR}/process-exporter"
    echo "   - Configuração: ${CONFIG_DIR}/config.yml"
    echo "   - Porta: 9256"
    echo "   - Status: sudo systemctl status process-exporter"
    echo "   - Logs: sudo journalctl -u process-exporter -f"
    echo ""
    echo "🔧 Para editar a configuração:"
    echo "   sudo nano ${CONFIG_DIR}/config.yml"
    echo "   sudo systemctl restart process-exporter"
else
    echo "❌ Process Exporter não está respondendo"
    echo "   Verifique os logs: sudo journalctl -u process-exporter -f"
    exit 1
fi

# Limpar arquivos temporários
cd /
rm -rf "$TMP_DIR"

echo ""
echo "✅ Instalação concluída com sucesso!"

