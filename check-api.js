const axios = require('axios');
const { exec } = require('child_process');
const net = require('net');

// API base URL
const API_URL = 'http://localhost:8080/api';

// Check if port is in use
function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // Port is in use
                resolve(true);
            } else {
                resolve(false);
            }
        });

        server.once('listening', () => {
            // Port is free
            server.close();
            resolve(false);
        });

        server.listen(port);
    });
}

// Test health endpoint
async function testHealth() {
    try {
        console.log('Testing API Health Endpoint...');
        const res = await axios.get('http://localhost:8080/', { timeout: 5000 });
        console.log('✅ API Health Status:', res.status);
        console.log('Health Response:', res.data);
        return true;
    } catch (error) {
        console.error('❌ API Health Check Failed:', error.message);
        return false;
    }
}

// Main function
async function checkAPI() {
    console.log('🔍 Checking API server status...');

    // Check if port 8080 is in use
    const portInUse = await checkPort(8080);

    if (portInUse) {
        console.log('✅ Port 8080 is in use, which suggests the API server might be running.');

        // Attempt to connect to the API
        const apiRunning = await testHealth();

        if (apiRunning) {
            console.log('\n✅ API server is running properly!\n');
        } else {
            console.log('\n⚠️ Something is using port 8080, but it doesn\'t appear to be the API server.');
            console.log('You may want to free up the port or change the port in your server configuration.\n');
        }
    } else {
        console.log('❌ API server is not running (port 8080 is available).');
        console.log('\nTo start the API server, you can run:');
        console.log('  cd backend && node api-server.js');
        console.log('\nOr use the start script:');
        console.log('  ./start-dev.sh\n');
    }
}

// Run the check
checkAPI(); 