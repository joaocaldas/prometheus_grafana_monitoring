# Grafana Configuration

This folder contains the Grafana configuration for monitoring game servers and infrastructure.

## Structure

```
grafana/
├── dashboards/
│   └── game-servers.json          # Main dashboard
├── provisioning/
│   ├── datasources/
│   │   └── prometheus.yml         # Prometheus datasource configuration
│   └── dashboards/
│       └── default.yml            # Dashboard provisioning configuration
```

## Access

- **URL**: http://localhost:3001
- **Default user**: `admin`
- **Default password**: `admin` (you will be prompted to change it on first login)

## Datasource

The Prometheus datasource is configured automatically via provisioning:
- **Name**: Prometheus
- **URL**: http://prometheus:9090 (internal Docker communication)
- **UID**: prometheus

## Dashboards

The following dashboards are automatically loaded:

1. **Game Servers Monitoring** - Overview of all game servers
2. **Game Servers Per Server** - Individual game server details
3. **Server Monitoring** - Overview of all Linux/Windows servers
4. **Server Monitoring Per Server** - Individual server details
5. **ICMP Monitoring** - Network connectivity monitoring

Each dashboard includes:
- **Server Status** - Visual indicators (green/red)
- **Online Players** - Line chart per server
- **Server Occupancy** - Gauge with percentage
- **Latency (Ping)** - Ping chart per server
- **Server Table** - Overview table
- **Players vs Bots** - Bar chart
- **Error Rate** - Query error monitoring

## Troubleshooting

### Datasource not found

If you see "datasource prometheus not found":

1. Check if Prometheus is running:
```bash
docker compose ps prometheus
```

2. Restart Grafana:
```bash
docker compose restart grafana
```

3. Check Grafana logs:
```bash
docker compose logs grafana | grep -i datasource
```

4. Access Grafana and go to **Configuration → Data Sources** to verify if Prometheus is listed

### Dashboard not appearing

1. Check if the file is in the correct location:
```bash
ls -la grafana/dashboards/
```

2. Restart Grafana:
```bash
docker compose restart grafana
```

3. Access Grafana and go to **Dashboards → Browse** to verify if the dashboard is listed

## Customization

### Change admin password

Edit `docker-compose.yml` and change:
```yaml
- GF_SECURITY_ADMIN_PASSWORD=your_password_here
```

Then restart:
```bash
docker compose restart grafana
```

### Add more dashboards

Place JSON files in the `grafana/dashboards/` folder and restart Grafana.
