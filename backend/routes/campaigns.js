const express = require('express');
const { query, transaction } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all campaigns for authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const result = await query(
            `SELECT 
        c.*,
        COUNT(p.id) as prospect_count,
        COUNT(CASE WHEN p.status = 'contacted' THEN 1 END) as contacted_count,
        COUNT(CASE WHEN p.status = 'responded' THEN 1 END) as response_count
       FROM campaigns c
       LEFT JOIN prospects p ON c.id = p.campaign_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
            [req.user.userId]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({
            error: 'Failed to fetch campaigns'
        });
    }
});

// Get single campaign
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await query(
            `SELECT 
        c.*,
        COUNT(p.id) as prospect_count,
        COUNT(CASE WHEN p.status = 'contacted' THEN 1 END) as contacted_count,
        COUNT(CASE WHEN p.status = 'responded' THEN 1 END) as response_count
       FROM campaigns c
       LEFT JOIN prospects p ON c.id = p.campaign_id
       WHERE c.id = $1 AND c.user_id = $2
       GROUP BY c.id`,
            [req.params.id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Campaign not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({
            error: 'Failed to fetch campaign'
        });
    }
});

// Create new campaign
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, intake_json } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({
                error: 'Campaign name is required'
            });
        }

        if (!intake_json || typeof intake_json !== 'object') {
            return res.status(400).json({
                error: 'Campaign intake data is required'
            });
        }

        // Validate intake_json structure
        const requiredFields = ['target_audience', 'value_proposition', 'outreach_strategy', 'goals_metrics'];
        for (const field of requiredFields) {
            if (!intake_json[field]) {
                return res.status(400).json({
                    error: `Missing required intake field: ${field}`
                });
            }
        }

        // Get user's organization_id
        const userResult = await query(
            'SELECT organization_id FROM users WHERE id = $1',
            [req.user.userId]
        );

        const result = await query(
            `INSERT INTO campaigns (name, description, user_id, organization_id, intake_json) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
            [
                name.trim(),
                description?.trim() || null,
                req.user.userId,
                userResult.rows[0]?.organization_id || null,
                JSON.stringify(intake_json)
            ]
        );

        // Log campaign creation event
        await query(
            `INSERT INTO events (kind, campaign_id, payload_json) 
       VALUES ($1, $2, $3)`,
            [
                'campaign_created',
                result.rows[0].id,
                JSON.stringify({ name: name.trim() })
            ]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({
            error: 'Failed to create campaign'
        });
    }
});

// Update campaign
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, description, status, intake_json } = req.body;
        const campaignId = req.params.id;

        // Check if campaign exists and belongs to user
        const existingCampaign = await query(
            'SELECT id, status FROM campaigns WHERE id = $1 AND user_id = $2',
            [campaignId, req.user.userId]
        );

        if (existingCampaign.rows.length === 0) {
            return res.status(404).json({
                error: 'Campaign not found'
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name && name.trim()) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name.trim());
        }

        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description?.trim() || null);
        }

        if (status && ['draft', 'active', 'paused', 'completed'].includes(status)) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (intake_json && typeof intake_json === 'object') {
            updates.push(`intake_json = $${paramIndex++}`);
            values.push(JSON.stringify(intake_json));
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update'
            });
        }

        updates.push(`updated_at = NOW()`);
        values.push(campaignId, req.user.userId);

        const result = await query(
            `UPDATE campaigns 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING *`,
            values
        );

        // Log campaign update event
        await query(
            `INSERT INTO events (kind, campaign_id, payload_json) 
       VALUES ($1, $2, $3)`,
            [
                'campaign_updated',
                campaignId,
                JSON.stringify({ updates: Object.keys(req.body) })
            ]
        );

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update campaign error:', error);
        res.status(500).json({
            error: 'Failed to update campaign'
        });
    }
});

// Delete campaign
router.delete('/:id', auth, async (req, res) => {
    try {
        const campaignId = req.params.id;

        // Check if campaign exists and belongs to user
        const existingCampaign = await query(
            'SELECT id, name FROM campaigns WHERE id = $1 AND user_id = $2',
            [campaignId, req.user.userId]
        );

        if (existingCampaign.rows.length === 0) {
            return res.status(404).json({
                error: 'Campaign not found'
            });
        }

        // Delete campaign (cascades will handle related records)
        await transaction(async (client) => {
            // Log deletion event before deleting
            await client.query(
                `INSERT INTO events (kind, campaign_id, payload_json) 
         VALUES ($1, $2, $3)`,
                [
                    'campaign_deleted',
                    campaignId,
                    JSON.stringify({ name: existingCampaign.rows[0].name })
                ]
            );

            // Delete campaign
            await client.query(
                'DELETE FROM campaigns WHERE id = $1 AND user_id = $2',
                [campaignId, req.user.userId]
            );
        });

        res.json({
            success: true,
            message: 'Campaign deleted successfully'
        });

    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({
            error: 'Failed to delete campaign'
        });
    }
});

// Get campaign statistics
router.get('/:id/stats', auth, async (req, res) => {
    try {
        const campaignId = req.params.id;

        // Check if campaign exists and belongs to user
        const campaignExists = await query(
            'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
            [campaignId, req.user.userId]
        );

        if (campaignExists.rows.length === 0) {
            return res.status(404).json({
                error: 'Campaign not found'
            });
        }

        // Get prospect statistics
        const prospectStats = await query(
            `SELECT 
        status,
        COUNT(*) as count,
        AVG(fit_score) as avg_fit_score
       FROM prospects 
       WHERE campaign_id = $1 
       GROUP BY status`,
            [campaignId]
        );

        // Get message statistics
        const messageStats = await query(
            `SELECT 
        m.type,
        m.status,
        COUNT(*) as count
       FROM messages m
       WHERE m.campaign_id = $1
       GROUP BY m.type, m.status`,
            [campaignId]
        );

        // Get recent activity
        const recentActivity = await query(
            `SELECT 
        kind,
        payload_json,
        created_at
       FROM events
       WHERE campaign_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
            [campaignId]
        );

        res.json({
            success: true,
            data: {
                prospect_stats: prospectStats.rows,
                message_stats: messageStats.rows,
                recent_activity: recentActivity.rows
            }
        });

    } catch (error) {
        console.error('Get campaign stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch campaign statistics'
        });
    }
});

module.exports = router;
