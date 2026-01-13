# Prometheus + Grafana Monitoring Stack

Complete monitoring stack with Prometheus and Grafana for game servers, Linux/Windows servers, processes, Docker containers, and ICMP monitoring.

## 🚀 Features

### Game Server Monitoring
- Support for over 100 game types via [gamedig](https://github.com/gamedig/node-gamedig)
- Metrics for online players, latency, status, and errors
- Dedicated dashboards in Grafana

### Infrastructure Monitoring
- **Linux Servers**: CPU, memory, disk, network via Node Exporter
- **Windows Servers**: CPU, memory, disk, network via Windows Exporter
- **Processes**: Detailed monitoring of individual processes (Linux via Process Exporter)
- **Docker Containers**: Monitoring via cAdvisor
- **ICMP/Ping**: Network connectivity monitoring

### Alerts
- AlertManager configured to manage alerts
- Alert rules for game servers and ICMP
- Configurable notifications

### Grafana Dashboards
- **Game Servers**: Game server monitoring (general and per server)
- **Server Monitoring**: Linux/Windows server monitoring (general and per server)
- **ICMP Monitoring**: Network connectivity monitoring

## 📁 Project Structure

```
.
├── docker-compose.yml              # Complete stack (Prometheus + Grafana + Exporters)
├── prometheus/                     # Prometheus configuration
│   ├── prometheus.yml             # Main configuration
│   ├── alertmanager.yml          # AlertManager configuration
│   ├── blackbox.yml              # Blackbox Exporter configuration
│   ├── targets/                   # JSON files with targets (Service Discovery)
│   │   ├── targets.json          # Game servers
│   │   ├── linux-targets.json    # Linux servers (Node Exporter)
│   │   ├── windows-targets.json  # Windows servers (Windows Exporter)
│   │   ├── process-exporter-targets.json  # Process Exporter
│   │   ├── cadvisor-targets.json # cAdvisor (Docker containers)
│   │   └── icmp-targets.json     # ICMP targets (ping)
│   ├── rules/                    # Alert rules
│   │   ├── game-servers.yml     # Alerts for game servers
│   │   └── icmp.yml              # Alerts for ICMP
│   └── README.md                 # Prometheus documentation
├── grafana/                      # Grafana configuration
│   ├── dashboards/               # JSON dashboards
│   │   ├── game-servers.json                    # General game servers dashboard
│   │   ├── game-servers-per-server.json         # Per game server dashboard
│   │   ├── servers-monitoring.json              # General servers dashboard
│   │   ├── servers-monitoring-per-server.json   # Per server dashboard
│   │   └── icmp-monitoring.json                 # ICMP dashboard
│   ├── provisioning/            # Automatic provisioning
│   │   ├── datasources/         # Datasources (Prometheus)
│   │   └── dashboards/          # Dashboard configuration
│   └── README.md                # Grafana documentation
├── gs_exporter/                  # Game Server Exporter
│   ├── index.js                 # Main code
│   ├── package.json             # Node.js dependencies
│   ├── Dockerfile               # Docker image
│   └── docker-compose.yml       # To run only the exporter
├── scripts/                     # Installation scripts
│   ├── install-node-exporter.sh        # Node Exporter installation (Linux)
│   ├── install-process-exporter.sh     # Process Exporter installation (Linux)
│   ├── install-cadvisor.sh             # cAdvisor installation (Linux)
│   ├── install-window-exporter.ps1     # Windows Exporter installation
│   └── README-*.md                      # Script documentation
└── README.md                     # This file
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Access to servers that will be monitored (to install exporters)

### 1. Clone the repository

```bash
git clone https://github.com/joaocaldas/prometheus_grafana_monitoring.git
cd prometheus_grafana_monitoring
```

### 2. Configure targets

Targets are configured through JSON files in the `prometheus/targets/` folder. See the [Prometheus documentation](prometheus/README.md) for examples of each target type.

**Important:** The `prometheus/targets/*.json` files are in `.gitignore` because they contain sensitive information. You need to create them manually or copy from examples.

### 3. Start the stack

```bash
docker-compose up -d
```

### 4. Access services

- **Grafana**: http://localhost:3001
  - User: `admin`
  - Password: `admin` (you will be prompted to change it on first login)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Game Server Exporter**: http://localhost:9091/metrics

### 5. Install exporters on servers

See the scripts in the `scripts/` folder to install the necessary exporters:

- **Linux**: Node Exporter, Process Exporter, cAdvisor
- **Windows**: Windows Exporter

## 📊 Dashboards

### Game Servers Monitoring

- **General Dashboard**: Overview of all game servers
- **Per Server Dashboard**: Individual details for each server

**Available metrics:**
- Online/maximum players
- Latency (ping)
- Online/offline status
- Number of bots
- Query error rate

### Server Monitoring

- **General Dashboard**: Overview of all servers (Linux/Windows)
- **Per Server Dashboard**: Individual details for each server

**Available metrics:**
- CPU, memory, disk
- Network traffic
- Processes (Linux and Windows)
- Docker containers (via cAdvisor)
- Uptime

### ICMP Monitoring

- Network connectivity monitoring via ping
- Alerts when hosts go offline

## ⚙️ Configuration

### Game Server Exporter

Game servers are configured in `prometheus/targets/targets.json`:

```json
[
  {
    "targets": ["SERVER_IP:PORT"],
    "labels": {
      "gamedig-type": "cod2",
      "exporter": "game-server"
    }
  }
]
```

The exporter reads this file automatically and queries servers when Prometheus scrapes.

**Supported game types:** See the complete list at https://github.com/gamedig/node-gamedig#games-list

### Other Targets

See `prometheus/README.md` for configuration examples of:
- Linux servers (Node Exporter)
- Windows servers (Windows Exporter)
- Process Exporter
- cAdvisor
- ICMP targets

## 🔧 Environment Variables

### Game Server Exporter

- `PORT`: HTTP server port (default: 9090)
- `SCRAPE_INTERVAL`: Query interval in milliseconds (default: 30000)
- `TARGETS_JSON_FILE`: Path to targets JSON file (default: `/etc/prometheus/targets/targets.json`)

### Grafana

- `GF_SECURITY_ADMIN_USER`: Admin user (default: `admin`)
- `GF_SECURITY_ADMIN_PASSWORD`: Admin password (default: `admin`)
- `GF_SERVER_ROOT_URL`: Grafana base URL (default: `http://localhost:3001`)

## 📝 Reload Configuration

After modifying configuration files, you can reload without restarting:

```bash
# Reload Prometheus
curl -X POST http://localhost:9090/-/reload

# Or restart containers
docker-compose restart prometheus
```

## 🐳 Docker Compose

The stack includes the following services:

- **prometheus**: Collects and stores metrics
- **grafana**: Visualization and dashboards
- **game-server-exporter**: Exporter for game servers
- **blackbox-exporter**: ICMP monitoring
- **alertmanager**: Alert management

### Useful commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart grafana

# View service status
docker-compose ps
```

## 📚 Additional Documentation

- [Prometheus Documentation](prometheus/README.md) - Target and alert configuration
- [Grafana Documentation](grafana/README.md) - Dashboard configuration
- [Installation Scripts](scripts/) - Scripts to install exporters on servers

## 🔒 Security

- The `prometheus/targets/*.json` files contain sensitive information and are in `.gitignore`
- Change the default Grafana password on first login
- Configure firewall appropriately to expose only necessary ports

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or pull requests.
