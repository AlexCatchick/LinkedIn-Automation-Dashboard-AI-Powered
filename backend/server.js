const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

// CORS configuration - more permissive for development
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',');

        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // In development, be more permissive
        if (process.env.NODE_ENV === 'development') {
            // Allow localhost origins on any port
            if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
                return callback(null, true);
            }
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting - more permissive in development
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (process.env.NODE_ENV === 'development' ? 60 * 1000 : 15 * 60 * 1000), // 1 minute in dev, 15 minutes in prod
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'development' ? 1000 : 100), // 1000 requests in dev, 100 in prod
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks in development
        if (process.env.NODE_ENV === 'development' && req.path === '/health') {
            return true;
        }
        return false;
    }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '1.0.0'
    });
});

// API status endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'LinkedIn Automation API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        status: 'operational',
        endpoints: {
            authentication: '/api/auth',
            campaigns: '/api/campaigns',
            prospects: '/api/prospects',
            messages: '/api/messages',
            sequences: '/api/sequences',
            events: '/api/events',
            analytics: '/api/analytics'
        },
        health: '/health'
    });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/prospects', require('./routes/prospects'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/sequences', require('./routes/sequences'));
app.use('/api/events', require('./routes/events'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ai', require('./routes/ai'));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'LinkedIn Automation API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            campaigns: '/api/campaigns',
            prospects: '/api/prospects',
            messages: '/api/messages',
            sequences: '/api/sequences',
            events: '/api/events',
            analytics: '/api/analytics'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);

    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }

    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Backend server running on port ${PORT}`);
        console.log(`📊 Health check available at http://localhost:${PORT}/health`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
}

module.exports = app;
