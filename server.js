const express = require('express');
const app = express();
const PORT = process.env.PORT || 5900;

app.use(express.json());

// In-memory state tracking
let vpnState = {
    connected: false,
    currentServer: null,
    assignedIp: null,
    connectedAt: null,
};

let connectionHistory = [];

// 10 Countries with Flags and Mock Servers
const countriesList = [
    { id: 'us', name: 'United States', flag: '🇺🇸', serverIp: '10.100.24.1' },
    { id: 'gb', name: 'United Kingdom', flag: '🇬🇧', serverIp: '10.200.12.4' },
    { id: 'de', name: 'Germany', flag: '🇩🇪', serverIp: '10.150.88.9' },
    { id: 'ca', name: 'Canada', flag: '🇨🇦', serverIp: '10.120.33.2' },
    { id: 'jp', name: 'Japan', flag: '🇯🇵', serverIp: '10.220.55.7' },
    { id: 'au', name: 'Australia', flag: '🇦🇺', serverIp: '10.250.19.8' },
    { id: 'fr', name: 'France', flag: '🇫🇷', serverIp: '10.130.44.5' },
    { id: 'sg', name: 'Singapore', flag: '🇸🇬', serverIp: '10.210.77.3' },
    { id: 'br', name: 'Brazil', flag: '🇧🇷', serverIp: '10.180.91.6' },
    { id: 'in', name: 'India', flag: '🇮🇳', serverIp: '10.170.66.2' },
];

// Helper to generate random IP starting with 10.
function generateVpnIp() {
    const secondOctet = Math.floor(Math.random() * 254) + 1;
    const thirdOctet = Math.floor(Math.random() * 254) + 1;
    const fourthOctet = Math.floor(Math.random() * 254) + 1;
    return `10.${secondOctet}.${thirdOctet}.${fourthOctet}`;
}

// 1. HTML Dashboard Endpoint
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VPN Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; max-width: 800px; margin: auto; }
        .card { background: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        button { background: #3b82f6; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; margin-right: 5px; }
        button:hover { background: #2563eb; }
        button.disconnect { background: #ef4444; }
        button.disconnect:hover { background: #dc2626; }
        select { padding: 10px; border-radius: 4px; background: #334155; color: white; border: none; margin-right: 10px; }
        pre { background: #0f172a; padding: 10px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>VPN Control Panel</h1>
    <div class="card">
        <h3>Status</h3>
        <p id="status-text">Loading status...</p>
    </div>
    <div class="card">
        <h3>Select Server & Connect</h3>
        <select id="country-select"></select>
        <button onclick="connectVPN()">Connect</button>
        <button class="disconnect" onclick="disconnectVPN()">Disconnect</button>
    </div>
    <div class="card">
        <h3>Connection History</h3>
        <pre id="history-log">Loading history...</pre>
    </div>

    <script>
        async function fetchStatus() {
            const res = await fetch('/api/vpn/status');
            const data = await res.json();
            document.getElementById('status-text.').innerText = JSON.stringify(data, null, 2);
            document.getElementById('status-text').innerHTML = \`
                State: <b>\${data.connected ? '🟢 Connected' : '🔴 Disconnected'}</b><br>
                IP: \${data.assignedIp || 'None'}<br>
                Server: \${data.currentServer ? data.currentServer.name + ' ' + data.currentServer.flag : 'None'}<br>
                Latency Test: \${data.pingMs ? data.pingMs + ' ms' : 'N/A'}
            \`;
        }

        async function fetchServers() {
            const res = await fetch('/api/vpn/servers');
            const servers = await res.json();
            const select = document.getElementById('country-select');
            select.innerHTML = '';
            servers.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.text = \`\${s.flag} \${s.name} (\${s.serverIp})\`;
                select.appendChild(opt);
            });
        }

        async function fetchHistory() {
            const res = await fetch('/api/vpn/history');
            const history = await res.json();
            document.getElementById('history-log').innerText = JSON.stringify(history, null, 2);
        }

        async function connectVPN() {
            const countryId = document.getElementById('country-select').value;
            const res = await fetch('/api/vpn/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countryId })
            });
            const data = await res.json();
            alert(data.message);
            refreshAll();
        }

        async function disconnectVPN() {
            const res = await fetch('/api/vpn/disconnect', { method: 'POST' });
            const data = await res.json();
            alert(data.message);
            refreshAll();
        }

        function refreshAll() {
            fetchStatus();
            fetchHistory();
        }

        fetchServers();
        refreshAll();
        setInterval(refreshAll, 5000);
    </script>
</body>
</html>
`;

app.get('/', (req, res) => {
    res.send(htmlContent);
});

// 2. Get VPN Country & Servers List Endpoint
app.get('/api/vpn/servers', (req, res) => {
    res.json(countriesList);
});

// 3. Connect VPN Endpoint (Simulates sleep latency and assigns 10.x.x.x IP)
app.post('/api/vpn/connect', async (req, res) => {
    const { countryId } = req.body;
    const selectedServer = countriesList.find(c => c.id === countryId);

    if (!selectedServer) {
        return res.status(400).json({ error: 'Invalid country or server selection' });
    }

    // Simulate connection sleep delay (e.g., 800ms handshake delay)
    const sleepMs = Math.floor(Math.random() * 500) + 500;
    await new Promise(resolve => setTimeout(resolve, sleepMs));

    vpnState = {
        connected: true,
        currentServer: selectedServer,
        assignedIp: generateVpnIp(),
        connectedAt: new Date().toISOString(),
        pingMs: Math.floor(Math.random() * 60) + 15
    };

    connectionHistory.unshift({
        action: 'CONNECT',
        server: selectedServer.name,
        ip: vpnState.assignedIp,
        timestamp: vpnState.connectedAt
    });

    res.json({
        message: `Successfully connected to ${selectedServer.name} ${selectedServer.flag}`,
        connectionDetails: vpnState,
        handshakeDelayMs: sleepMs
    });
});

// 4. Disconnect VPN Endpoint
app.post('/api/vpn/disconnect', (req, res) => {
    if (vpnState.connected) {
        connectionHistory.unshift({
            action: 'DISCONNECT',
            server: vpnState.currentServer?.name,
            timestamp: new Date().toISOString()
        });
    }

    vpnState = {
        connected: false,
        currentServer: null,
        assignedIp: null,
        connectedAt: null,
        pingMs: null
    };

    res.json({ message: 'VPN disconnected successfully', status: vpnState });
});

// 5. VPN Status Endpoint
app.get('/api/vpn/status', (req, res) => {
    res.json(vpnState);
});

// 6. VPN Connection History Endpoint
app.get('/api/vpn/history', (req, res) => {
    res.json(connectionHistory);
});

// Start server listening on process.env.PORT or 5900
app.listen(PORT, () => {
    console.log(`VPN API Server running on port ${PORT}`);
});
