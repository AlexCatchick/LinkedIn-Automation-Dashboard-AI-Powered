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
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Demo credentials for testing
        if (email === 'demo@linkedin.com' && password === 'demo123') {
            const user = {
                id: 'demo-user-id',
                email: 'demo@linkedin.com',
                full_name: 'Demo User',
                organization_id: 'demo-org-id'
            };

            const token = 'demo-jwt-token-' + Date.now();

            res.json({
                success: true,
                data: {
                    user,
                    token
                }
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        const user = {
            id: 'new-user-' + Date.now(),
            email,
            full_name: fullName,
            organization_id: null
        };

        const token = 'demo-jwt-token-' + Date.now();

        res.json({
            success: true,
            data: {
                user,
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

app.get('/auth/me', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No valid token provided'
            });
        }

        // For demo purposes, return a mock user
        const user = {
            id: 'demo-user-id',
            email: 'demo@linkedin.com',
            full_name: 'Demo User',
            organization_id: 'demo-org-id'
        };

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

app.post('/auth/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Mock campaigns endpoint
app.get('/campaigns', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});

app.post('/campaigns', (req, res) => {
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
app.post('/ai/generate-message', (req, res) => {
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

app.post('/ai/analyze-prospect', (req, res) => {
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

app.post('/ai/optimize-message', (req, res) => {
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
