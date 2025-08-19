const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// Simple in-memory user store for demo
const users = [
    {
        id: 1,
        email: 'demo@linkedin.com',
        password: '$2a$10$V8EJo9lJn5h5JvNJ5l5XfOQ5.qH5XzB5Y5H5o5h5j5v5n5j5l5XfO', // hashed 'demo123'
        firstName: 'Demo',
        lastName: 'User',
        company: 'Demo Company',
        position: 'Sales Manager'
    }
];

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
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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
        version: '1.0.0',
        status: 'running',
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

// Demo login endpoint
app.post('/api/auth/demo-login', async (req, res) => {
    try {
        const demoUser = users.find(u => u.email === 'demo@linkedin.com');
        if (!demoUser) {
            return res.status(404).json({
                success: false,
                error: 'Demo user not found'
            });
        }

        const token = generateToken(demoUser);

        res.json({
            success: true,
            data: {
                token,
                user: formatUserResponse(demoUser)
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

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            data: {
                token,
                user: formatUserResponse(user)
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

// Register endpoint (simplified for demo)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, company, position } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, first name, and last name are required'
            });
        }

        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = {
            id: users.length + 1,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            company: company || '',
            position: position || ''
        };

        users.push(newUser);

        const token = generateToken(newUser);

        res.status(201).json({
            success: true,
            data: {
                token,
                user: formatUserResponse(newUser)
            }
        });
    } catch (error) {
        console.error('Register error:', error);
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

// Export for Vercel
module.exports = app;
