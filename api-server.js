require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// Initialize Express
const app = express();

// Define allowed origins based on environment variables
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
];

// Add production URL if available
if (process.env.FRONTEND_PROD_URL) {
    allowedOrigins.push(process.env.FRONTEND_PROD_URL);
}

console.log('API Server - Allowed CORS origins:', allowedOrigins);

// CORS configuration - fix for credentials
const corsOptions = {
    origin: allowedOrigins, // Dynamic origins from env
    credentials: true, // Allow credentials
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS middleware with proper configuration
app.use(cors(corsOptions));

// JSON body parser middleware
app.use(express.json());

// Cookie parser middleware
app.use(cookieParser());

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Simple test route - no database dependency
app.get('/test', (req, res) => {
    res.json({
        message: 'API server is running properly',
        timestamp: new Date().toISOString()
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Dice Raja API Server is running',
        version: '1.0.0',
        endpoints: [
            { path: '/api/auth/register', method: 'POST', description: 'Register a new user' },
            { path: '/api/auth/login', method: 'POST', description: 'Login a user' },
            { path: '/api/auth/me', method: 'GET', description: 'Get current user info' },
            { path: '/api/users/profile', method: 'GET', description: 'Get user profile' },
            { path: '/test', method: 'GET', description: 'Simple test endpoint' }
        ]
    });
});

// Health check route for test script
app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'API is healthy' });
});

// Connect to MongoDB with error handling
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected for API Server'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        console.log('Server will continue without database connection');
    });

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Debug route
app.post('/api/debug', (req, res) => {
    console.log('Debug Request Body:', req.body);
    res.json({ received: req.body });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server with port info
const PORT = process.env.API_PORT || 8080;
const server = app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    console.log(`Access the API at: http://localhost:${PORT}/api/...`);
    console.log(`Test the API with: curl http://localhost:${PORT}/test`);
}); 