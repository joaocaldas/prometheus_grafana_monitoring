# Instalação do Process Exporter no Servidor 10.0.0.250

Este guia explica como instalar o Process Exporter no servidor remoto para monitorar o processo "wings".

## Instalação Automática (Recomendado)

Execute o script de instalação no servidor remoto:

```bash
# No servidor 10.0.0.250
sudo bash install-process-exporter.sh
```

O script irá:
- ✅ Baixar e instalar o Process Exporter
- ✅ Criar usuário e grupo dedicados
- ✅ Criar arquivo de configuração para monitorar "wings"
- ✅ Configurar como serviço systemd
- ✅ Habilitar para iniciar no boot

## Instalação Manual

Se preferir fazer manualmente:

### 1. Baixar e Instalar

```bash
cd /tmp
wget https://github.com/ncabatoff/process-exporter/releases/download/v0.8.0/process-exporter-0.8.0.linux-amd64.tar.gz
tar xzf process-exporter-0.8.0.linux-amd64.tar.gz
cd process-exporter-0.8.0.linux-amd64
sudo cp process-exporter /usr/local/bin/
```

### 2. Criar Usuário

```bash
sudo useradd --no-create-home --shell /bin/false process_exporter
```

### 3. Criar Arquivo de Configuração

```bash
sudo mkdir -p /etc/process-exporter
sudo tee /etc/process-exporter/config.yml > /dev/null <<EOF
process_names:
  # Monitorar o processo "wings"
  - name: "wings"
    cmdline:
    - 'wings'
  
  # Monitorar outros processos do sistema
  - name: "system"
    cmdline:
    - '.+'
EOF
sudo chown process_exporter:process_exporter /etc/process-exporter/config.yml
```

### 4. Criar Serviço Systemd

```bash
sudo tee /etc/systemd/system/process-exporter.service > /dev/null <<EOF
[Unit]
Description=Process Exporter
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=process_exporter
Group=process_exporter
ExecStart=/usr/local/bin/process-exporter -config.path=/etc/process-exporter/config.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### 5. Habilitar e Iniciar

```bash
sudo systemctl daemon-reload
sudo systemctl enable process-exporter
sudo systemctl start process-exporter
```

## Verificar Instalação

```bash
# Verificar status
sudo systemctl status process-exporter

# Verificar se está respondendo
curl http://localhost:9256/metrics | grep wings

# Ver logs
sudo journalctl -u process-exporter -f
```

## Configuração do Firewall

Certifique-se de que a porta 9256 está aberta para o Prometheus:

```bash
# UFW
sudo ufw allow from <IP_DO_PROMETHEUS> to any port 9256

# Firewalld
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<IP_DO_PROMETHEUS>" port protocol="tcp" port="9256" accept'
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp -s <IP_DO_PROMETHEUS> --dport 9256 -j ACCEPT
```

## Métricas Disponíveis

Após a instalação, você poderá usar estas queries no Grafana:

```promql
# CPU usado pelo processo wings (em segundos)
rate(namedprocess_namegroup_cpu_seconds_total{groupname="wings"}[5m])

# Memória usada pelo processo wings (em bytes)
namedprocess_namegroup_memory_bytes{groupname="wings"}

# Número de processos wings rodando
namedprocess_namegroup_num_procs{groupname="wings"}
```

## Editar Configuração

Para adicionar mais processos ao monitoramento:

```bash
sudo nano /etc/process-exporter/config.yml
sudo systemctl restart process-exporter
```

Exemplo de configuração com múltiplos processos:

```yaml
process_names:
  - name: "wings"
    cmdline:
    - 'wings'
  
  - name: "nginx"
    cmdline:
    - 'nginx'
  
  - name: "mysql"
    cmdline:
    - 'mysqld'
```

## Troubleshooting

### Process Exporter não inicia

```bash
# Verificar logs
sudo journalctl -u process-exporter -n 50

# Verificar permissões
ls -la /usr/local/bin/process-exporter
ls -la /etc/process-exporter/config.yml

# Testar manualmente
sudo -u process_exporter /usr/local/bin/process-exporter -config.path=/etc/process-exporter/config.yml
```

### Não consegue acessar métricas

```bash
# Verificar se está rodando
sudo systemctl status process-exporter

# Verificar porta
sudo netstat -tlnp | grep 9256

# Testar localmente
curl http://localhost:9256/metrics
```

### Processo "wings" não aparece nas métricas

```bash
# Verificar se o processo está rodando
ps aux | grep wings

# Verificar configuração
cat /etc/process-exporter/config.yml

# Verificar métricas brutas
curl http://localhost:9256/metrics | grep wings
```

