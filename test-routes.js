const axios = require('axios');

// API base URL
const API_URL = 'http://localhost:8080/api';

// Test registration
async function testRegister() {
    try {
        console.log('Testing Registration...');

        const randomNum = Math.floor(Math.random() * 10000);
        const testUser = {
            username: `testuser${randomNum}`,
            email: `testuser${randomNum}@example.com`,
            password: 'Test@123456'
        };

        const res = await axios.post(`${API_URL}/auth/register`, testUser);
        console.log('Registration Status:', res.status);
        console.log('Registration Response:', res.data);
        return res.data;
    } catch (error) {
        console.error('Registration Error:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Test health endpoint
async function testHealth() {
    try {
        console.log('Testing Health Endpoint...');
        const res = await axios.get('http://localhost:8080/');
        console.log('Health Status:', res.status);
        console.log('Health Response:', res.data);
        return res.data;
    } catch (error) {
        console.error('Health Error:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Run tests
async function runTests() {
    await testHealth();
    console.log('----------------------------------------');
    await testRegister();
}

runTests(); 