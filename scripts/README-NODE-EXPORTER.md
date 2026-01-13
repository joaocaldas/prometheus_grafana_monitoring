# Node Exporter Installation Guide

This guide explains how to install and configure Node Exporter as a systemd service to ensure 100% uptime.

## Automatic Installation (Recommended)

Run the installation script:

```bash
# On the Linux server where you want to install Node Exporter
sudo bash scripts/install-node-exporter.sh
```

The script will:
- ✅ Download the latest version of Node Exporter
- ✅ Create dedicated user and group
- ✅ Install the binary
- ✅ Configure as systemd service with automatic restart
- ✅ Enable to start on boot
- ✅ Configure security and resource limits

## Manual Installation

If you prefer to do it manually:

### 1. Download and Install

```bash
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
cd node_exporter-1.7.0.linux-amd64
sudo cp node_exporter /usr/local/bin/
```

### 2. Create User

```bash
sudo useradd --no-create-home --shell /bin/false node_exporter
```

### 3. Create Systemd Service

Create the file `/etc/systemd/system/node_exporter.service`:

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

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/node_exporter

# Resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### 4. Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

## Important Settings for 100% Uptime

The systemd service is configured with:

- **`Restart=always`**: Automatically restarts if the process stops
- **`RestartSec=5`**: Waits 5 seconds before restarting
- **`After=network-online.target`**: Waits for network to be ready before starting
- **`WantedBy=multi-user.target`**: Automatically starts on system boot

## Useful Commands

### Check Status

```bash
sudo systemctl status node_exporter
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u node_exporter -f

# Last 100 lines
sudo journalctl -u node_exporter -n 100

# Logs since today
sudo journalctl -u node_exporter --since today
```

### Restart Service

```bash
sudo systemctl restart node_exporter
```

### Stop Service

```bash
sudo systemctl stop node_exporter
```

### Disable Automatic Startup

```bash
sudo systemctl disable node_exporter
```

### Verify it's Responding

```bash
curl http://localhost:9100/metrics
```

## Configure Firewall

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

## Add to Prometheus

After installation, add the server to the `prometheus/linux-targets.json` file:

```json
[
  {
    "targets": ["SERVER_IP:9100"],
    "labels": {
      "name": "Server Name",
      "os": "linux",
      "hostname": "server-hostname"
    }
  }
]
```

## Troubleshooting

### Service won't start

1. Check logs:
   ```bash
   sudo journalctl -u node_exporter -n 50
   ```

2. Verify binary exists:
   ```bash
   ls -la /usr/local/bin/node_exporter
   ```

3. Check permissions:
   ```bash
   sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter
   sudo chmod 755 /usr/local/bin/node_exporter
   ```

### Port already in use

If port 9100 is already in use:

1. Check which process is using it:
   ```bash
   sudo netstat -tlnp | grep 9100
   # or
   sudo ss -tlnp | grep 9100
   ```

2. Stop the process or configure Node Exporter to use another port:
   ```bash
   # Edit the systemd service and add --web.listen-address=:9101
   sudo systemctl edit node_exporter
   ```

### Service keeps restarting

1. Check logs to identify the error:
   ```bash
   sudo journalctl -u node_exporter -f
   ```

2. Check for permission issues:
   ```bash
   sudo -u node_exporter /usr/local/bin/node_exporter
   ```

## Update Node Exporter

To update to a newer version:

1. Stop the service:
   ```bash
   sudo systemctl stop node_exporter
   ```

2. Run the installation script again (it will detect existing installation)

3. Or do it manually:
   ```bash
   # Download new version
   cd /tmp
   wget https://github.com/prometheus/node_exporter/releases/download/vNEW_VERSION/node_exporter-NEW_VERSION.linux-amd64.tar.gz
   tar xzf node_exporter-NEW_VERSION.linux-amd64.tar.gz
   cd node_exporter-NEW_VERSION.linux-amd64
   
   # Replace binary
   sudo cp node_exporter /usr/local/bin/
   sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter
   
   # Restart service
   sudo systemctl start node_exporter
   ```

## Security

The service is configured with several security measures:

- Runs as non-privileged user (`node_exporter`)
- `NoNewPrivileges=true`: Prevents privilege escalation
- `ProtectSystem=strict`: Protects system directories
- `ProtectHome=true`: Protects home directories
- `PrivateTmp=true`: Isolates temporary directory

These settings ensure that even if Node Exporter is compromised, the impact will be limited.
