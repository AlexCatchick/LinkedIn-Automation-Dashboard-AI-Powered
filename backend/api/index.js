const express = require('express');
const cors = require('cors');

const app = express();

// Simple CORS configuration for Vercel
app.use(cors({
    origin: true,
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`, req.body);
    next();
});

// Simple in-memory user store (for demo purposes)
const users = new Map();
const tokens = new Map();

// Pre-populate with demo user
users.set('demo@linkedin.com', {
    id: 'demo-user-id',
    email: 'demo@linkedin.com',
    password: 'demo123',
    full_name: 'Demo User',
    organization_id: 'demo-org-id'
});

// Helper function to generate simple tokens
function generateToken(userId) {
    const token = 'token-' + userId + '-' + Date.now();
    return token;
}

// Helper function to validate token
function validateToken(token) {
    return tokens.get(token);
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'LinkedIn Automation API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        status: 'operational'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// Simple auth endpoints for testing
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = users.get(email);
        if (!user || user.password !== password) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(user.id);
        tokens.set(token, user);

        // Return user data without password
        const userResponse = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            organization_id: user.organization_id
        };

        res.json({
            success: true,
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        // Check if user already exists
        if (users.has(email)) {
            return res.status(400).json({
                success: false,
                error: 'User already exists with this email'
            });
        }

        // Validate input
        if (!email || !password || !fullName) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and full name are required'
            });
        }

        // Create new user
        const user = {
            id: 'user-' + Date.now(),
            email,
            password,
            full_name: fullName,
            organization_id: null
        };

        // Store user
        users.set(email, user);

        // Generate token
        const token = generateToken(user.id);
        tokens.set(token, user);

        // Return user data without password
        const userResponse = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            organization_id: user.organization_id
        };

        res.json({
            success: true,
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

app.get('/api/auth/me', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No valid token provided'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const user = validateToken(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        // Return user data without password
        const userResponse = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            organization_id: user.organization_id
        };

        res.json({
            success: true,
            data: userResponse
        });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

app.post('/api/auth/logout', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            tokens.delete(token); // Invalidate the token
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Demo login endpoint for quick testing
app.post('/api/auth/demo-login', (req, res) => {
    try {
        const user = users.get('demo@linkedin.com');
        
        if (!user) {
            return res.status(500).json({
                success: false,
                error: 'Demo user not found'
            });
        }

        // Generate token
        const token = generateToken(user.id);
        tokens.set(token, user);

        // Return user data without password
        const userResponse = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            organization_id: user.organization_id
        };

        res.json({
            success: true,
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        console.error('Demo login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Mock campaigns endpoint
app.get('/api/campaigns', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});

app.post('/api/campaigns', (req, res) => {
    const campaign = {
        id: 'campaign-' + Date.now(),
        name: req.body.name || 'New Campaign',
        status: 'draft',
        created_at: new Date().toISOString()
    };

    res.json({
        success: true,
        data: campaign
    });
});

// Mock AI endpoints
app.post('/api/ai/generate-message', (req, res) => {
    res.json({
        success: true,
        data: {
            generatedMessage: "Hi [Name], I noticed your work in [Industry] and thought you'd be interested in our innovative approach to [Solution].",
            confidence: 0.85,
            suggestions: ['Add more personalization', 'Include specific value proposition'],
            personalizedElements: ['Name', 'Industry', 'Solution']
        }
    });
});

app.post('/api/ai/analyze-prospect', (req, res) => {
    res.json({
        success: true,
        data: {
            fitScore: 0.78,
            keyInsights: ['Professional background matches target criteria'],
            recommendedApproach: 'Professional and value-focused outreach',
            personalizedHooks: ['Industry experience', 'Company background'],
            industryTrends: ['Digital transformation', 'Remote work adaptation'],
            connectionStrategy: 'Lead with industry insights and mutual value'
        }
    });
});

app.post('/api/ai/optimize-message', (req, res) => {
    const { message } = req.body;
    res.json({
        success: true,
        data: {
            originalMessage: message,
            optimizedMessage: message + ' [AI Optimized]',
            improvements: ['Added more personalization', 'Improved call-to-action'],
            engagementPrediction: 0.75,
            tone: 'professional'
        }
    });
});

// Catch-all error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Export for Vercel
module.exports = app;
