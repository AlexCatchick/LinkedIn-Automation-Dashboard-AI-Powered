// Load environment variables
require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const userService = require('./services/userService');

const app = express();

// Initialize database on startup
(async () => {
    console.log('🚀 Starting LinkedIn Automation API...');
    const dbInitialized = await userService.initializeDatabase();
    if (dbInitialized) {
        console.log('✅ Database initialized successfully');
    } else {
        console.log('⚠️  Running in fallback mode');
    }
})();

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Allow localhost in development
        if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            return callback(null, true);
        }

        // Allow Vercel deployments
        if (origin && origin.includes('.vercel.app')) {
            return callback(null, true);
        }

        // Allow configured origins
        const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        callback(null, true); // Allow all for now
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Helper functions
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
    );
};

const formatUserResponse = (user) => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API info
app.get('/', (req, res) => {
    res.json({
        name: 'LinkedIn Automation API',
        version: '1.0.1',
        status: 'running',
        database: 'supabase-connected',
        lastUpdated: '2025-08-19T09:06:00Z',
        endpoints: {
            health: '/health',
            auth: {
                login: 'POST /api/auth/login',
                register: 'POST /api/auth/register',
                demoLogin: 'POST /api/auth/demo-login'
            }
        }
    });
});

// Debug endpoint to check database status
app.get('/api/debug/env', async (req, res) => {
    try {
        res.json({
            hasDatabase: !!process.env.DATABASE_URL,
            hasJWT: !!process.env.JWT_SECRET,
            nodeEnv: process.env.NODE_ENV || 'undefined',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Debug endpoint to check database status
app.get('/api/debug/users', async (req, res) => {
    try {
        // Try to get users from database
        const testQuery = 'SELECT COUNT(*) as user_count FROM users';
        const db = require('./database');
        const result = await db.query(testQuery);

        res.json({
            database: 'connected',
            userCount: parseInt(result.rows[0].user_count),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            database: 'not_connected',
            error: error.message,
            fallback: 'using in-memory storage',
            timestamp: new Date().toISOString()
        });
    }
});

// Demo login endpoint
app.post('/api/auth/demo-login', async (req, res) => {
    try {
        const demoUser = await userService.getDemoUser();
        const token = generateToken(demoUser);

        res.json({
            success: true,
            data: {
                token,
                user: demoUser
            }
        });
    } catch (error) {
        console.error('Demo login error:', error);
        res.status(500).json({
            success: false,
            error: 'Demo login failed'
        });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);

        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        const user = await userService.findUserByEmail(email);
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        console.log('User found, checking password...');
        const isPasswordValid = await userService.validatePassword(password, user.password_hash);
        if (!isPasswordValid) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        console.log('Password valid, generating token...');
        const formattedUser = userService.formatUser(user);
        const token = generateToken(formattedUser);
        console.log('Login successful for user:', email);

        res.json({
            success: true,
            data: {
                token,
                user: formattedUser
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, company, position } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, first name, and last name are required'
            });
        }

        const newUser = await userService.createUser({
            email,
            password,
            firstName,
            lastName,
            company: company || '',
            position: position || ''
        });

        const formattedUser = userService.formatUser(newUser);
        const token = generateToken(formattedUser);

        res.status(201).json({
            success: true,
            data: {
                token,
                user: formattedUser
            }
        });
    } catch (error) {
        console.error('Register error:', error);

        if (error.message === 'User with this email already exists') {
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Start server (for local development)
if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`🎯 Server running on port ${PORT}`);
        console.log(`📍 Health check: http://localhost:${PORT}/health`);
        console.log(`🔐 Demo login: http://localhost:${PORT}/api/auth/demo-login`);
    });
}

// Export for Vercel
module.exports = app;
