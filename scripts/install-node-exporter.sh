#!/bin/bash

# Script para instalar e configurar Node Exporter como serviço systemd
# Este script garante que o Node Exporter fique online 100% do tempo

set -e

NODE_EXPORTER_VERSION="1.7.0"
NODE_EXPORTER_USER="node_exporter"
NODE_EXPORTER_GROUP="node_exporter"
INSTALL_DIR="/usr/local/bin"
SERVICE_FILE="/etc/systemd/system/node_exporter.service"

echo "🚀 Instalando Node Exporter v${NODE_EXPORTER_VERSION}..."

# Verificar se já está instalado
if [ -f "${INSTALL_DIR}/node_exporter" ]; then
    echo "⚠️  Node Exporter já está instalado em ${INSTALL_DIR}/node_exporter"
    read -p "Deseja reinstalar? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Instalação cancelada."
        exit 0
    fi
fi

# Baixar Node Exporter
echo "📥 Baixando Node Exporter..."
cd /tmp
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    ARCH="amd64"
elif [ "$ARCH" = "aarch64" ]; then
    ARCH="arm64"
else
    echo "❌ Arquitetura não suportada: $ARCH"
    exit 1
fi

DOWNLOAD_URL="https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-${ARCH}.tar.gz"

if [ ! -f "node_exporter-${NODE_EXPORTER_VERSION}.linux-${ARCH}.tar.gz" ]; then
    wget -q --show-progress "$DOWNLOAD_URL" || {
        echo "❌ Erro ao baixar Node Exporter"
        exit 1
    }
fi

# Extrair
echo "📦 Extraindo arquivos..."
tar xzf "node_exporter-${NODE_EXPORTER_VERSION}.linux-${ARCH}.tar.gz"
cd "node_exporter-${NODE_EXPORTER_VERSION}.linux-${ARCH}"

# Criar usuário e grupo (se não existir)
if ! id "$NODE_EXPORTER_USER" &>/dev/null; then
    echo "👤 Criando usuário ${NODE_EXPORTER_USER}..."
    sudo useradd --no-create-home --shell /bin/false "$NODE_EXPORTER_USER" || {
        echo "❌ Erro ao criar usuário"
        exit 1
    }
else
    echo "✅ Usuário ${NODE_EXPORTER_USER} já existe"
fi

# Instalar binário
echo "📋 Instalando binário em ${INSTALL_DIR}..."
sudo cp node_exporter "${INSTALL_DIR}/"
sudo chown "${NODE_EXPORTER_USER}:${NODE_EXPORTER_GROUP}" "${INSTALL_DIR}/node_exporter"
sudo chmod 755 "${INSTALL_DIR}/node_exporter"

# Criar arquivo de serviço systemd
echo "⚙️  Criando serviço systemd..."
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Node Exporter
Documentation=https://github.com/prometheus/node_exporter
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${NODE_EXPORTER_USER}
Group=${NODE_EXPORTER_GROUP}
ExecStart=${INSTALL_DIR}/node_exporter
Restart=always
RestartSec=5
TimeoutStopSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=node_exporter

# Segurança
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/node_exporter
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true
LockPersonality=true
MemoryDenyWriteExecute=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

# Limites de recursos
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Criar diretório de dados (se necessário)
sudo mkdir -p /var/lib/node_exporter
sudo chown "${NODE_EXPORTER_USER}:${NODE_EXPORTER_GROUP}" /var/lib/node_exporter

# Recarregar systemd
echo "🔄 Recarregando systemd..."
sudo systemctl daemon-reload

# Habilitar serviço para iniciar no boot
echo "✅ Habilitando serviço para iniciar no boot..."
sudo systemctl enable node_exporter

# Iniciar serviço
echo "🚀 Iniciando serviço..."
sudo systemctl start node_exporter

# Aguardar alguns segundos
sleep 2

# Verificar status
echo ""
echo "📊 Status do serviço:"
sudo systemctl status node_exporter --no-pager -l || true

echo ""
echo "🔍 Verificando se está respondendo na porta 9100..."
if curl -s http://localhost:9100/metrics > /dev/null; then
    echo "✅ Node Exporter está funcionando corretamente!"
    echo ""
    echo "📝 Informações:"
    echo "   - Porta: 9100"
    echo "   - Métricas: http://localhost:9100/metrics"
    echo "   - Status: sudo systemctl status node_exporter"
    echo "   - Logs: sudo journalctl -u node_exporter -f"
    echo ""
    echo "🎉 Instalação concluída com sucesso!"
else
    echo "⚠️  Node Exporter pode não estar respondendo ainda. Verifique os logs:"
    echo "   sudo journalctl -u node_exporter -f"
fi

# Limpar arquivos temporários
echo ""
read -p "Deseja limpar os arquivos temporários? (S/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    cd /tmp
    rm -rf "node_exporter-${NODE_EXPORTER_VERSION}.linux-${ARCH}"*
    echo "🧹 Arquivos temporários removidos"
fi

echo ""
echo "✨ Próximos passos:"
echo "   1. Configure o firewall para permitir a porta 9100:"
echo "      sudo ufw allow 9100/tcp"
echo "      # ou"
echo "      sudo firewall-cmd --add-port=9100/tcp --permanent && sudo firewall-cmd --reload"
echo ""
echo "   2. Adicione o servidor ao arquivo prometheus/linux-targets.json"
echo ""





