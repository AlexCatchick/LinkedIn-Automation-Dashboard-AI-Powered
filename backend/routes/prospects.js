const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { query, transaction } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Get prospects
router.get('/', auth, async (req, res) => {
    try {
        const { campaign_id, status, limit = 50, offset = 0 } = req.query;

        let queryStr = `
      SELECT p.*, c.name as campaign_name
      FROM prospects p
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE c.user_id = $1
    `;
        const values = [req.user.userId];
        let paramIndex = 2;

        if (campaign_id) {
            queryStr += ` AND p.campaign_id = $${paramIndex++}`;
            values.push(campaign_id);
        }

        if (status) {
            queryStr += ` AND p.status = $${paramIndex++}`;
            values.push(status);
        }

        queryStr += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(parseInt(limit), parseInt(offset));

        const result = await query(queryStr, values);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get prospects error:', error);
        res.status(500).json({
            error: 'Failed to fetch prospects'
        });
    }
});

// Get single prospect
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await query(
            `SELECT p.*, c.name as campaign_name
       FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       WHERE p.id = $1 AND c.user_id = $2`,
            [req.params.id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Prospect not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get prospect error:', error);
        res.status(500).json({
            error: 'Failed to fetch prospect'
        });
    }
});

// Create prospect
router.post('/', auth, async (req, res) => {
    try {
        const { campaign_id, linkedin_url, email, full_name, title, company } = req.body;

        if (!campaign_id || !linkedin_url) {
            return res.status(400).json({
                error: 'Campaign ID and LinkedIn URL are required'
            });
        }

        // Verify campaign belongs to user
        const campaignCheck = await query(
            'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
            [campaign_id, req.user.userId]
        );

        if (campaignCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Campaign not found'
            });
        }

        // Check for duplicate LinkedIn URL in same campaign
        const duplicateCheck = await query(
            'SELECT id FROM prospects WHERE campaign_id = $1 AND linkedin_url = $2',
            [campaign_id, linkedin_url]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Prospect with this LinkedIn URL already exists in this campaign'
            });
        }

        const result = await query(
            `INSERT INTO prospects (campaign_id, linkedin_url, email, full_name, title, company)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [campaign_id, linkedin_url, email || null, full_name || null, title || null, company || null]
        );

        // Log prospect creation
        await query(
            `INSERT INTO events (kind, campaign_id, prospect_id, payload_json)
       VALUES ($1, $2, $3, $4)`,
            ['prospect_created', campaign_id, result.rows[0].id, JSON.stringify({ linkedin_url })]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create prospect error:', error);
        res.status(500).json({
            error: 'Failed to create prospect'
        });
    }
});

// Upload prospects from CSV
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    let filePath = null;

    try {
        const { campaign_id } = req.body;

        if (!campaign_id) {
            return res.status(400).json({
                error: 'Campaign ID is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'CSV file is required'
            });
        }

        filePath = req.file.path;

        // Verify campaign belongs to user
        const campaignCheck = await query(
            'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
            [campaign_id, req.user.userId]
        );

        if (campaignCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Campaign not found'
            });
        }

        const prospects = [];
        const errors = [];

        // Parse CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    // Validate required fields
                    if (!row.linkedin_url || !row.linkedin_url.trim()) {
                        errors.push({ row: prospects.length + 1, error: 'Missing LinkedIn URL' });
                        return;
                    }

                    prospects.push({
                        campaign_id,
                        linkedin_url: row.linkedin_url.trim(),
                        email: row.email?.trim() || null,
                        full_name: row.full_name?.trim() || row.name?.trim() || null,
                        title: row.title?.trim() || row.position?.trim() || null,
                        company: row.company?.trim() || row.organization?.trim() || null,
                        location: row.location?.trim() || null,
                        industry: row.industry?.trim() || null
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (prospects.length === 0) {
            return res.status(400).json({
                error: 'No valid prospects found in CSV file'
            });
        }

        // Insert prospects in batches
        let imported = 0;
        let failed = errors.length;

        for (const prospect of prospects) {
            try {
                // Check for duplicates
                const duplicateCheck = await query(
                    'SELECT id FROM prospects WHERE campaign_id = $1 AND linkedin_url = $2',
                    [campaign_id, prospect.linkedin_url]
                );

                if (duplicateCheck.rows.length === 0) {
                    await query(
                        `INSERT INTO prospects (campaign_id, linkedin_url, email, full_name, title, company, location, industry)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            prospect.campaign_id,
                            prospect.linkedin_url,
                            prospect.email,
                            prospect.full_name,
                            prospect.title,
                            prospect.company,
                            prospect.location,
                            prospect.industry
                        ]
                    );
                    imported++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error('Failed to insert prospect:', error);
                failed++;
            }
        }

        // Log upload event
        await query(
            `INSERT INTO events (kind, campaign_id, payload_json)
       VALUES ($1, $2, $3)`,
            [
                'prospects_uploaded',
                campaign_id,
                JSON.stringify({ imported, failed, total: prospects.length })
            ]
        );

        res.json({
            success: true,
            data: {
                imported,
                failed,
                total: prospects.length,
                errors: errors.slice(0, 10) // Return first 10 errors
            }
        });

    } catch (error) {
        console.error('Upload prospects error:', error);
        res.status(500).json({
            error: 'Failed to upload prospects'
        });
    } finally {
        // Clean up uploaded file
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});

// Update prospect
router.put('/:id', auth, async (req, res) => {
    try {
        const prospectId = req.params.id;
        const { status, full_name, email, title, company, location, industry, fit_score, hooks } = req.body;

        // Verify prospect belongs to user's campaign
        const prospectCheck = await query(
            `SELECT p.id FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       WHERE p.id = $1 AND c.user_id = $2`,
            [prospectId, req.user.userId]
        );

        if (prospectCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Prospect not found'
            });
        }

        // Build update query
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (status && ['new', 'processing', 'analyzed', 'contacted', 'responded', 'converted', 'failed'].includes(status)) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (full_name !== undefined) {
            updates.push(`full_name = $${paramIndex++}`);
            values.push(full_name?.trim() || null);
        }

        if (email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            values.push(email?.trim() || null);
        }

        if (title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            values.push(title?.trim() || null);
        }

        if (company !== undefined) {
            updates.push(`company = $${paramIndex++}`);
            values.push(company?.trim() || null);
        }

        if (location !== undefined) {
            updates.push(`location = $${paramIndex++}`);
            values.push(location?.trim() || null);
        }

        if (industry !== undefined) {
            updates.push(`industry = $${paramIndex++}`);
            values.push(industry?.trim() || null);
        }

        if (fit_score !== undefined && typeof fit_score === 'number') {
            updates.push(`fit_score = $${paramIndex++}`);
            values.push(fit_score);
        }

        if (hooks !== undefined && Array.isArray(hooks)) {
            updates.push(`hooks = $${paramIndex++}`);
            values.push(hooks);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update'
            });
        }

        updates.push(`updated_at = NOW()`);
        values.push(prospectId);

        const result = await query(
            `UPDATE prospects 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex++}
       RETURNING *`,
            values
        );

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update prospect error:', error);
        res.status(500).json({
            error: 'Failed to update prospect'
        });
    }
});

// Delete prospect
router.delete('/:id', auth, async (req, res) => {
    try {
        const prospectId = req.params.id;

        // Verify prospect belongs to user's campaign
        const prospectCheck = await query(
            `SELECT p.id, p.campaign_id FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       WHERE p.id = $1 AND c.user_id = $2`,
            [prospectId, req.user.userId]
        );

        if (prospectCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Prospect not found'
            });
        }

        // Delete prospect (cascade will handle related records)
        await query(
            'DELETE FROM prospects WHERE id = $1',
            [prospectId]
        );

        // Log deletion
        await query(
            `INSERT INTO events (kind, campaign_id, payload_json)
       VALUES ($1, $2, $3)`,
            [
                'prospect_deleted',
                prospectCheck.rows[0].campaign_id,
                JSON.stringify({ prospect_id: prospectId })
            ]
        );

        res.json({
            success: true,
            message: 'Prospect deleted successfully'
        });

    } catch (error) {
        console.error('Delete prospect error:', error);
        res.status(500).json({
            error: 'Failed to delete prospect'
        });
    }
});

module.exports = router;
