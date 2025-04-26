/**
 * Combined server runner script
 * Starts both the Socket server and API server simultaneously
 */

const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes for better logging
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

console.log(`${colors.bright}${colors.green}=== Starting Dice Raja Backend Services ===${colors.reset}`);
console.log(`${colors.cyan}Press Ctrl+C to stop all services${colors.reset}\n`);

// Start the Socket Server (server.js)
const socketServer = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env
});

// Start the API Server (api-server.js)
const apiServer = spawn('node', ['api-server.js'], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env
});

// Handle Socket Server output
socketServer.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
        console.log(`${colors.yellow}[Socket] ${colors.reset}${line}`);
    });
});

socketServer.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
        console.log(`${colors.red}[Socket Error] ${colors.reset}${line}`);
    });
});

// Handle API Server output
apiServer.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
        console.log(`${colors.magenta}[API] ${colors.reset}${line}`);
    });
});

apiServer.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
        console.log(`${colors.red}[API Error] ${colors.reset}${line}`);
    });
});

// Handle process termination
process.on('SIGINT', () => {
    console.log(`\n${colors.bright}${colors.yellow}Shutting down services...${colors.reset}`);

    socketServer.kill('SIGINT');
    apiServer.kill('SIGINT');

    // Give servers time to gracefully shut down before exiting
    setTimeout(() => {
        console.log(`${colors.green}All services stopped${colors.reset}`);
        process.exit(0);
    }, 1000);
});

// Handle server exits
socketServer.on('exit', (code) => {
    if (code !== 0 && code !== null) {
        console.log(`${colors.red}Socket Server exited with code ${code}${colors.reset}`);
    }
});

apiServer.on('exit', (code) => {
    if (code !== 0 && code !== null) {
        console.log(`${colors.red}API Server exited with code ${code}${colors.reset}`);
    }
});

console.log(`${colors.green}Both servers started successfully!${colors.reset}`);
console.log(`${colors.cyan}Socket server should be available at: ${colors.reset}http://localhost:${process.env.SOCKET_PORT || 5002}`);
console.log(`${colors.cyan}API server should be available at: ${colors.reset}http://localhost:${process.env.API_PORT || 8080}`); 