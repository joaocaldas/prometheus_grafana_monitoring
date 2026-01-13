# Prometheus Datasource Configuration

Automatic datasource provisioning has been disabled to avoid Grafana initialization errors.

## Option 1: Add via Web Interface (Recommended)

1. Access Grafana: http://localhost:3001
2. Login with:
   - User: `admin`
   - Password: `admin`
3. Go to **Configuration → Data Sources**
4. Click **Add data source**
5. Select **Prometheus**
6. Configure:
   - **URL**: `http://prometheus:9090`
   - **Access**: `Server (default)`
   - Check **Set as default**
7. Click **Save & Test**

## Option 2: Add via API

Run the script after Grafana is running:

```bash
./grafana/setup-datasource.sh
```

Or manually via curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "access": "proxy",
    "url": "http://prometheus:9090",
    "isDefault": true,
    "editable": true,
    "jsonData": {
      "httpMethod": "POST",
      "timeInterval": "15s"
    },
    "uid": "prometheus"
  }' \
  http://localhost:3001/api/datasources
```

## Enable Automatic Provisioning (Future)

After everything is working, you can re-enable automatic provisioning:

1. Copy the backup file:
   ```bash
   cp grafana/provisioning/datasources/prometheus.yml.bak grafana/provisioning/datasources/prometheus.yml
   ```

2. Restart Grafana:
   ```bash
   docker compose restart grafana
   ```
