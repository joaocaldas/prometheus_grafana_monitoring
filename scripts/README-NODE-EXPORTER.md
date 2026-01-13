# Guia de Instalação do Node Exporter

Este guia explica como instalar e configurar o Node Exporter como serviço systemd para garantir que fique online 100% do tempo.

## Instalação Automática (Recomendado)

Execute o script de instalação:

```bash
# No servidor Linux onde deseja instalar o Node Exporter
sudo bash scripts/install-node-exporter.sh
```

O script irá:
- ✅ Baixar a versão mais recente do Node Exporter
- ✅ Criar usuário e grupo dedicados
- ✅ Instalar o binário
- ✅ Configurar como serviço systemd com restart automático
- ✅ Habilitar para iniciar no boot
- ✅ Configurar segurança e limites de recursos

## Instalação Manual

Se preferir fazer manualmente:

### 1. Baixar e Instalar

```bash
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
cd node_exporter-1.7.0.linux-amd64
sudo cp node_exporter /usr/local/bin/
```

### 2. Criar Usuário

```bash
sudo useradd --no-create-home --shell /bin/false node_exporter
```

### 3. Criar Serviço Systemd

Crie o arquivo `/etc/systemd/system/node_exporter.service`:

```ini
[Unit]
Description=Node Exporter
Documentation=https://github.com/prometheus/node_exporter
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=node_exporter
Group=node_exporter
ExecStart=/usr/local/bin/node_exporter
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

# Limites de recursos
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### 4. Habilitar e Iniciar

```bash
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

## Configurações Importantes para 100% Uptime

O serviço systemd está configurado com:

- **`Restart=always`**: Reinicia automaticamente se o processo parar
- **`RestartSec=5`**: Aguarda 5 segundos antes de reiniciar
- **`After=network-online.target`**: Aguarda a rede estar pronta antes de iniciar
- **`WantedBy=multi-user.target`**: Inicia automaticamente no boot do sistema

## Comandos Úteis

### Verificar Status

```bash
sudo systemctl status node_exporter
```

### Ver Logs

```bash
# Logs em tempo real
sudo journalctl -u node_exporter -f

# Últimas 100 linhas
sudo journalctl -u node_exporter -n 100

# Logs desde hoje
sudo journalctl -u node_exporter --since today
```

### Reiniciar Serviço

```bash
sudo systemctl restart node_exporter
```

### Parar Serviço

```bash
sudo systemctl stop node_exporter
```

### Desabilitar Inicialização Automática

```bash
sudo systemctl disable node_exporter
```

### Verificar se está Respondendo

```bash
curl http://localhost:9100/metrics
```

## Configurar Firewall

### UFW (Ubuntu/Debian)

```bash
sudo ufw allow 9100/tcp
sudo ufw reload
```

### Firewalld (CentOS/RHEL)

```bash
sudo firewall-cmd --add-port=9100/tcp --permanent
sudo firewall-cmd --reload
```

### iptables

```bash
sudo iptables -A INPUT -p tcp --dport 9100 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

## Adicionar ao Prometheus

Após instalar, adicione o servidor ao arquivo `prometheus/linux-targets.json`:

```json
[
  {
    "targets": ["IP_DO_SERVIDOR:9100"],
    "labels": {
      "name": "Nome do Servidor",
      "os": "linux",
      "hostname": "hostname-do-servidor"
    }
  }
]
```

## Troubleshooting

### Serviço não inicia

1. Verifique os logs:
   ```bash
   sudo journalctl -u node_exporter -n 50
   ```

2. Verifique se o binário existe:
   ```bash
   ls -la /usr/local/bin/node_exporter
   ```

3. Verifique permissões:
   ```bash
   sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter
   sudo chmod 755 /usr/local/bin/node_exporter
   ```

### Porta já em uso

Se a porta 9100 já estiver em uso:

1. Verifique qual processo está usando:
   ```bash
   sudo netstat -tlnp | grep 9100
   # ou
   sudo ss -tlnp | grep 9100
   ```

2. Pare o processo ou configure o Node Exporter para usar outra porta:
   ```bash
   # Edite o serviço systemd e adicione --web.listen-address=:9101
   sudo systemctl edit node_exporter
   ```

### Serviço reinicia constantemente

1. Verifique os logs para identificar o erro:
   ```bash
   sudo journalctl -u node_exporter -f
   ```

2. Verifique se há problemas de permissão:
   ```bash
   sudo -u node_exporter /usr/local/bin/node_exporter
   ```

## Atualizar Node Exporter

Para atualizar para uma versão mais recente:

1. Pare o serviço:
   ```bash
   sudo systemctl stop node_exporter
   ```

2. Execute o script de instalação novamente (ele detectará a instalação existente)

3. Ou faça manualmente:
   ```bash
   # Baixe a nova versão
   cd /tmp
   wget https://github.com/prometheus/node_exporter/releases/download/vNOVA_VERSAO/node_exporter-NOVA_VERSAO.linux-amd64.tar.gz
   tar xzf node_exporter-NOVA_VERSAO.linux-amd64.tar.gz
   cd node_exporter-NOVA_VERSAO.linux-amd64
   
   # Substitua o binário
   sudo cp node_exporter /usr/local/bin/
   sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter
   
   # Reinicie o serviço
   sudo systemctl start node_exporter
   ```

## Segurança

O serviço está configurado com várias medidas de segurança:

- Executa como usuário não-privilegiado (`node_exporter`)
- `NoNewPrivileges=true`: Previne escalação de privilégios
- `ProtectSystem=strict`: Protege diretórios do sistema
- `ProtectHome=true`: Protege diretórios home
- `PrivateTmp=true`: Isola diretório temporário

Essas configurações garantem que mesmo que o Node Exporter seja comprometido, o impacto será limitado.





