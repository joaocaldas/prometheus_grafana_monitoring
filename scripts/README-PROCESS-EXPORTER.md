# Process Exporter Installation on Server 10.0.0.250

This guide explains how to install Process Exporter on a remote server to monitor the "wings" process.

## Automatic Installation (Recommended)

Run the installation script on the remote server:

```bash
# On server 10.0.0.250
sudo bash install-process-exporter.sh
```

The script will:
- ✅ Download and install Process Exporter
- ✅ Create dedicated user and group
- ✅ Create configuration file to monitor "wings"
- ✅ Configure as systemd service
- ✅ Enable to start on boot

## Manual Installation

If you prefer to do it manually:

### 1. Download and Install

```bash
cd /tmp
wget https://github.com/ncabatoff/process-exporter/releases/download/v0.8.7/process-exporter-0.8.7.linux-amd64.tar.gz
tar xzf process-exporter-0.8.7.linux-amd64.tar.gz
cd process-exporter-0.8.7.linux-amd64
sudo cp process-exporter /usr/local/bin/
```

### 2. Create User

```bash
sudo useradd --no-create-home --shell /bin/false process_exporter
```

### 3. Create Configuration File

```bash
sudo mkdir -p /etc/process-exporter
sudo tee /etc/process-exporter/config.yml > /dev/null <<EOF
process_names:
  # Monitor "wings" process
  - name: "wings"
    cmdline:
    - 'wings'
  
  # Monitor other system processes
  - name: "system"
    cmdline:
    - '.+'
EOF
sudo chown process_exporter:process_exporter /etc/process-exporter/config.yml
```

### 4. Create Systemd Service

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

### 5. Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable process-exporter
sudo systemctl start process-exporter
```

## Verify Installation

```bash
# Check status
sudo systemctl status process-exporter

# Verify it's responding
curl http://localhost:9256/metrics | grep wings

# View logs
sudo journalctl -u process-exporter -f
```

## Firewall Configuration

Make sure port 9256 is open for Prometheus:

```bash
# UFW
sudo ufw allow from <PROMETHEUS_IP> to any port 9256

# Firewalld
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<PROMETHEUS_IP>" port protocol="tcp" port="9256" accept'
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp -s <PROMETHEUS_IP> --dport 9256 -j ACCEPT
```

## Available Metrics

After installation, you can use these queries in Grafana:

```promql
# CPU used by wings process (in seconds)
rate(namedprocess_namegroup_cpu_seconds_total{groupname="wings"}[5m])

# Memory used by wings process (in bytes)
namedprocess_namegroup_memory_bytes{groupname="wings"}

# Number of wings processes running
namedprocess_namegroup_num_procs{groupname="wings"}
```

## Edit Configuration

To add more processes to monitoring:

```bash
sudo nano /etc/process-exporter/config.yml
sudo systemctl restart process-exporter
```

Example configuration with multiple processes:

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

### Process Exporter won't start

```bash
# Check logs
sudo journalctl -u process-exporter -n 50

# Check permissions
ls -la /usr/local/bin/process-exporter
ls -la /etc/process-exporter/config.yml

# Test manually
sudo -u process_exporter /usr/local/bin/process-exporter -config.path=/etc/process-exporter/config.yml
```

### Can't access metrics

```bash
# Check if it's running
sudo systemctl status process-exporter

# Check port
sudo netstat -tlnp | grep 9256

# Test locally
curl http://localhost:9256/metrics
```

### "wings" process doesn't appear in metrics

```bash
# Check if process is running
ps aux | grep wings

# Check configuration
cat /etc/process-exporter/config.yml

# Check raw metrics
curl http://localhost:9256/metrics | grep wings
```
