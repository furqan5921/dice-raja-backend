const axios = require('axios');
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Base API URL
const API_URL = 'http://localhost:8080/api';

// Test data
const testUser = {
    username: `test_user_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123',
};

let authToken = null;

// Helper function to print with colors
function print(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

// Helper function to log test result
function logTest(name, success, response, error = null) {
    if (success) {
        print(colors.green, `✅ PASS: ${name}`);
        if (response && response.data) {
            console.log('Response:', JSON.stringify(response.data, null, 2));
        }
    } else {
        print(colors.red, `❌ FAIL: ${name}`);
        if (error) {
            if (error.response) {
                console.log('Status:', error.response.status);
                console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
            } else if (error.request) {
                console.log('No response received');
            } else {
                console.log('Error:', error.message);
            }
        }
    }
    console.log('-'.repeat(50));
}

// Test registration
async function testRegister() {
    print(colors.cyan, '\n📝 Testing User Registration...');
    try {
        const res = await axios.post(`${API_URL}/auth/register`, testUser);
        logTest('User Registration', true, res);
        return true;
    } catch (error) {
        logTest('User Registration', false, null, error);
        return false;
    }
}

// Test login
async function testLogin() {
    print(colors.cyan, '\n🔑 Testing User Login...');
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });

        if (res.data.token) {
            authToken = res.data.token;
        }

        logTest('User Login', true, res);
        return true;
    } catch (error) {
        logTest('User Login', false, null, error);
        return false;
    }
}

// Test health endpoint
async function testHealth() {
    print(colors.cyan, '\n💓 Testing API Health...');
    try {
        const res = await axios.get(`${API_URL}/health`);
        logTest('API Health', true, res);
        return true;
    } catch (error) {
        logTest('API Health', false, null, error);
        return false;
    }
}

// Test getting user profile
async function testGetProfile() {
    print(colors.cyan, '\n👤 Testing Get User Profile...');

    if (!authToken) {
        print(colors.yellow, 'Skipping profile test - no auth token available');
        return false;
    }

    try {
        const res = await axios.get(`${API_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        logTest('Get User Profile', true, res);
        return true;
    } catch (error) {
        logTest('Get User Profile', false, null, error);
        return false;
    }
}

// Main test runner
async function runTests() {
    print(colors.magenta, '🚀 Starting API Tests');
    print(colors.magenta, '='.repeat(50));

    // First, check if the API is running
    try {
        await axios.get('http://localhost:8080/', { timeout: 3000 });
    } catch (error) {
        print(colors.red, '❌ API server not running or not accessible at http://localhost:8080/');
        print(colors.yellow, 'Please make sure the server is running before testing.\n');
        return;
    }

    // Test health endpoint
    const healthOk = await testHealth();

    // Test auth endpoints
    const registerOk = await testRegister();
    const loginOk = await testLogin();

    // Test user endpoints
    if (loginOk) {
        await testGetProfile();
    }

    // Summary
    print(colors.magenta, '\n📊 Test Summary:');
    print(colors.magenta, '='.repeat(50));

    const results = {
        Health: healthOk ? '✅' : '❌',
        Registration: registerOk ? '✅' : '❌',
        Login: loginOk ? '✅' : '❌',
        'Get Profile': loginOk ? (authToken ? '✅' : '❌') : '⏭️ (skipped)'
    };

    // Print the summary table
    for (const [test, result] of Object.entries(results)) {
        console.log(`${test.padEnd(20)}: ${result}`);
    }

    print(colors.magenta, '='.repeat(50));
}

// Run the tests
runTests(); 