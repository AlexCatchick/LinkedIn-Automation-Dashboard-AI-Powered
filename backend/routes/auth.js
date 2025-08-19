const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, transaction } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation helper
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, organization_name } = req.body;

        // Validation
        if (!full_name || !email || !password) {
            return res.status(400).json({
                error: 'Full name, email, and password are required'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user without transaction for now (will fix later)
        let organization_id = null;

        // Create organization if provided  
        if (organization_name && organization_name.trim()) {
            try {
                const orgResult = await query(
                    'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
                    [organization_name.trim()]
                );
                organization_id = orgResult.rows[0].id;
            } catch (orgError) {
                console.error('Organization creation error:', orgError);
                // Continue without organization
            }
        }

        // Create user
        const result = await query(
            `INSERT INTO users (full_name, email, password_hash, organization_id) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, full_name, email, organization_id, created_at`,
            [full_name.trim(), email.toLowerCase(), password_hash, organization_id]
        );

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: result.rows[0].id,
                email: result.rows[0].email
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: result.rows[0].id,
                    email: result.rows[0].email,
                    full_name: result.rows[0].full_name,
                    organization_id: result.rows[0].organization_id,
                    created_at: result.rows[0].created_at
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed. Please try again.'
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        // Find user
        const result = await query(
            'SELECT id, email, password_hash, full_name, organization_id, created_at FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const user = result.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    organization_id: user.organization_id,
                    created_at: user.created_at
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed. Please try again.'
        });
    }
});

// Get current user (protected route)
router.get('/me', auth, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, email, full_name, organization_id, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Failed to fetch user data'
        });
    }
});

// Update user profile (protected route)
router.put('/profile', auth, async (req, res) => {
    try {
        const { full_name } = req.body;

        if (!full_name || !full_name.trim()) {
            return res.status(400).json({
                error: 'Full name is required'
            });
        }

        const result = await query(
            `UPDATE users 
       SET full_name = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, email, full_name, organization_id, created_at, updated_at`,
            [full_name.trim(), req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Failed to update profile'
        });
    }
});

// Change password (protected route)
router.put('/password', auth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                error: 'Current password and new password are required'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                error: 'New password must be at least 6 characters long'
            });
        }

        // Get current password hash
        const userResult = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(
            current_password,
            userResult.rows[0].password_hash
        );

        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const new_password_hash = await bcrypt.hash(new_password, saltRounds);

        // Update password
        await query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [new_password_hash, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Failed to change password'
        });
    }
});

// Demo login endpoint for testing
router.post('/demo-login', async (req, res) => {
    try {
        // Create or get demo user
        let result = await query(
            'SELECT id, email, full_name, organization_id, created_at FROM users WHERE email = $1',
            ['demo@linkedin.com']
        );

        let user;
        if (result.rows.length === 0) {
            // Create demo user
            const password_hash = await bcrypt.hash('demo123', 12);
            const createResult = await query(
                `INSERT INTO users (full_name, email, password_hash) 
         VALUES ($1, $2, $3) 
         RETURNING id, full_name, email, organization_id, created_at`,
                ['Demo User', 'demo@linkedin.com', password_hash]
            );
            user = createResult.rows[0];
        } else {
            user = result.rows[0];
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    organization_id: user.organization_id,
                    created_at: user.created_at
                }
            }
        });

    } catch (error) {
        console.error('Demo login error:', error);
        res.status(500).json({
            error: 'Demo login failed'
        });
    }
});

module.exports = router;
