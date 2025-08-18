const express = require('express');
const { query } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get events
router.get('/', auth, async (req, res) => {
    try {
        const {
            campaign_id,
            prospect_id,
            kind,
            start_date,
            end_date,
            limit = 100,
            offset = 0
        } = req.query;

        let queryStr = `
      SELECT e.*, c.name as campaign_name, p.full_name as prospect_name
      FROM events e
      JOIN campaigns c ON e.campaign_id = c.id
      LEFT JOIN prospects p ON e.prospect_id = p.id
      WHERE c.user_id = $1
    `;
        const values = [req.user.userId];
        let paramIndex = 2;

        if (campaign_id) {
            queryStr += ` AND e.campaign_id = $${paramIndex++}`;
            values.push(campaign_id);
        }

        if (prospect_id) {
            queryStr += ` AND e.prospect_id = $${paramIndex++}`;
            values.push(prospect_id);
        }

        if (kind) {
            queryStr += ` AND e.kind = $${paramIndex++}`;
            values.push(kind);
        }

        if (start_date) {
            queryStr += ` AND e.created_at >= $${paramIndex++}`;
            values.push(new Date(start_date));
        }

        if (end_date) {
            queryStr += ` AND e.created_at <= $${paramIndex++}`;
            values.push(new Date(end_date));
        }

        queryStr += ` ORDER BY e.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(parseInt(limit), parseInt(offset));

        const result = await query(queryStr, values);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({
            error: 'Failed to fetch events'
        });
    }
});

// Get events summary/statistics
router.get('/summary', auth, async (req, res) => {
    try {
        const { campaign_id, start_date, end_date } = req.query;

        let whereClause = 'WHERE c.user_id = $1';
        const values = [req.user.userId];
        let paramIndex = 2;

        if (campaign_id) {
            whereClause += ` AND e.campaign_id = $${paramIndex++}`;
            values.push(campaign_id);
        }

        if (start_date) {
            whereClause += ` AND e.created_at >= $${paramIndex++}`;
            values.push(new Date(start_date));
        }

        if (end_date) {
            whereClause += ` AND e.created_at <= $${paramIndex++}`;
            values.push(new Date(end_date));
        }

        // Get event counts by type
        const eventCounts = await query(
            `SELECT e.kind, COUNT(*) as count
       FROM events e
       JOIN campaigns c ON e.campaign_id = c.id
       ${whereClause}
       GROUP BY e.kind
       ORDER BY count DESC`,
            values
        );

        // Get events timeline (daily counts for last 30 days)
        const timelineQuery = `
      SELECT 
        DATE(e.created_at) as date,
        e.kind,
        COUNT(*) as count
      FROM events e
      JOIN campaigns c ON e.campaign_id = c.id
      ${whereClause}
      AND e.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(e.created_at), e.kind
      ORDER BY date DESC, e.kind
    `;

        const timeline = await query(timelineQuery, values);

        // Get recent critical events
        const criticalEvents = await query(
            `SELECT e.*, c.name as campaign_name, p.full_name as prospect_name
       FROM events e
       JOIN campaigns c ON e.campaign_id = c.id
       LEFT JOIN prospects p ON e.prospect_id = p.id
       ${whereClause}
       AND e.kind IN ('error', 'message_failed', 'sequence_failed', 'campaign_error')
       ORDER BY e.created_at DESC
       LIMIT 20`,
            values
        );

        // Get activity summary
        const activitySummary = await query(
            `SELECT 
         COUNT(*) as total_events,
         COUNT(DISTINCT e.campaign_id) as active_campaigns,
         COUNT(DISTINCT e.prospect_id) as prospects_with_activity,
         COUNT(CASE WHEN e.kind LIKE '%_sent' OR e.kind LIKE '%_delivered' THEN 1 END) as successful_actions,
         COUNT(CASE WHEN e.kind LIKE '%_failed' OR e.kind = 'error' THEN 1 END) as failed_actions
       FROM events e
       JOIN campaigns c ON e.campaign_id = c.id
       ${whereClause}`,
            values
        );

        res.json({
            success: true,
            data: {
                event_counts: eventCounts.rows,
                timeline: timeline.rows,
                critical_events: criticalEvents.rows,
                summary: activitySummary.rows[0]
            }
        });

    } catch (error) {
        console.error('Get events summary error:', error);
        res.status(500).json({
            error: 'Failed to fetch events summary'
        });
    }
});

// Get single event
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await query(
            `SELECT e.*, c.name as campaign_name, p.full_name as prospect_name
       FROM events e
       JOIN campaigns c ON e.campaign_id = c.id
       LEFT JOIN prospects p ON e.prospect_id = p.id
       WHERE e.id = $1 AND c.user_id = $2`,
            [req.params.id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Event not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({
            error: 'Failed to fetch event'
        });
    }
});

// Create event (for manual logging)
router.post('/', auth, async (req, res) => {
    try {
        const { campaign_id, prospect_id, kind, payload_json } = req.body;

        if (!campaign_id || !kind) {
            return res.status(400).json({
                error: 'Campaign ID and event kind are required'
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

        // Verify prospect if provided
        if (prospect_id) {
            const prospectCheck = await query(
                'SELECT id FROM prospects WHERE id = $1 AND campaign_id = $2',
                [prospect_id, campaign_id]
            );

            if (prospectCheck.rows.length === 0) {
                return res.status(404).json({
                    error: 'Prospect not found in this campaign'
                });
            }
        }

        const result = await query(
            `INSERT INTO events (campaign_id, prospect_id, kind, payload_json)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [campaign_id, prospect_id || null, kind.trim(), payload_json || {}]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({
            error: 'Failed to create event'
        });
    }
});

// Get event types/kinds
router.get('/types/available', auth, async (req, res) => {
    try {
        const result = await query(
            `SELECT DISTINCT e.kind, COUNT(*) as count
       FROM events e
       JOIN campaigns c ON e.campaign_id = c.id
       WHERE c.user_id = $1
       GROUP BY e.kind
       ORDER BY count DESC`,
            [req.user.userId]
        );

        // Common event types with descriptions
        const eventTypes = [
            { kind: 'campaign_created', description: 'Campaign was created', category: 'campaign' },
            { kind: 'campaign_started', description: 'Campaign was started', category: 'campaign' },
            { kind: 'campaign_paused', description: 'Campaign was paused', category: 'campaign' },
            { kind: 'campaign_completed', description: 'Campaign was completed', category: 'campaign' },
            { kind: 'prospect_created', description: 'Prospect was added', category: 'prospect' },
            { kind: 'prospect_analyzed', description: 'Prospect was analyzed by AI', category: 'prospect' },
            { kind: 'prospect_updated', description: 'Prospect information was updated', category: 'prospect' },
            { kind: 'message_created', description: 'Message was created', category: 'message' },
            { kind: 'message_generated', description: 'Message was generated by AI', category: 'message' },
            { kind: 'message_scheduled', description: 'Message was scheduled', category: 'message' },
            { kind: 'message_sent', description: 'Message was sent', category: 'message' },
            { kind: 'message_delivered', description: 'Message was delivered', category: 'message' },
            { kind: 'message_failed', description: 'Message sending failed', category: 'message' },
            { kind: 'message_responded', description: 'Prospect responded to message', category: 'message' },
            { kind: 'sequence_created', description: 'Sequence was created', category: 'sequence' },
            { kind: 'sequence_executed', description: 'Sequence step was executed', category: 'sequence' },
            { kind: 'prospects_uploaded', description: 'Prospects were uploaded from CSV', category: 'bulk' },
            { kind: 'messages_batch_scheduled', description: 'Batch of messages were scheduled', category: 'bulk' },
            { kind: 'linkedin_profile_scraped', description: 'LinkedIn profile was scraped', category: 'linkedin' },
            { kind: 'linkedin_connection_sent', description: 'LinkedIn connection request sent', category: 'linkedin' },
            { kind: 'linkedin_message_sent', description: 'LinkedIn message was sent', category: 'linkedin' },
            { kind: 'error', description: 'An error occurred', category: 'system' },
            { kind: 'warning', description: 'A warning was generated', category: 'system' }
        ];

        // Merge with actual data
        const actualEvents = result.rows.map(row => row.kind);
        const enhancedTypes = eventTypes.map(type => ({
            ...type,
            count: result.rows.find(row => row.kind === type.kind)?.count || 0,
            active: actualEvents.includes(type.kind)
        }));

        res.json({
            success: true,
            data: {
                event_types: enhancedTypes,
                total_events: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
                unique_types: result.rows.length
            }
        });

    } catch (error) {
        console.error('Get event types error:', error);
        res.status(500).json({
            error: 'Failed to fetch event types'
        });
    }
});

// Export events to CSV
router.get('/export/csv', auth, async (req, res) => {
    try {
        const { campaign_id, start_date, end_date, kind } = req.query;

        let whereClause = 'WHERE c.user_id = $1';
        const values = [req.user.userId];
        let paramIndex = 2;

        if (campaign_id) {
            whereClause += ` AND e.campaign_id = $${paramIndex++}`;
            values.push(campaign_id);
        }

        if (start_date) {
            whereClause += ` AND e.created_at >= $${paramIndex++}`;
            values.push(new Date(start_date));
        }

        if (end_date) {
            whereClause += ` AND e.created_at <= $${paramIndex++}`;
            values.push(new Date(end_date));
        }

        if (kind) {
            whereClause += ` AND e.kind = $${paramIndex++}`;
            values.push(kind);
        }

        const result = await query(
            `SELECT 
         e.id,
         e.kind,
         e.created_at,
         c.name as campaign_name,
         p.full_name as prospect_name,
         p.linkedin_url,
         e.payload_json
       FROM events e
       JOIN campaigns c ON e.campaign_id = c.id
       LEFT JOIN prospects p ON e.prospect_id = p.id
       ${whereClause}
       ORDER BY e.created_at DESC`,
            values
        );

        // Convert to CSV format
        const csvHeaders = ['ID', 'Event Type', 'Date', 'Campaign', 'Prospect', 'LinkedIn URL', 'Details'];
        const csvRows = result.rows.map(row => [
            row.id,
            row.kind,
            row.created_at.toISOString(),
            row.campaign_name || '',
            row.prospect_name || '',
            row.linkedin_url || '',
            JSON.stringify(row.payload_json || {})
        ]);

        const csvContent = [
            csvHeaders.join(','),
            ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="events-export-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);

    } catch (error) {
        console.error('Export events error:', error);
        res.status(500).json({
            error: 'Failed to export events'
        });
    }
});

// Delete old events (cleanup)
router.delete('/cleanup', auth, async (req, res) => {
    try {
        const { days_old = 90, event_types = [] } = req.body;

        if (days_old < 30) {
            return res.status(400).json({
                error: 'Cannot delete events newer than 30 days'
            });
        }

        let deleteQuery = `
      DELETE FROM events 
      WHERE id IN (
        SELECT e.id FROM events e
        JOIN campaigns c ON e.campaign_id = c.id
        WHERE c.user_id = $1 
        AND e.created_at < NOW() - INTERVAL '${parseInt(days_old)} days'
    `;

        const values = [req.user.userId];

        if (event_types.length > 0) {
            deleteQuery += ` AND e.kind = ANY($2)`;
            values.push(event_types);
        }

        deleteQuery += ')';

        const result = await query(deleteQuery, values);

        res.json({
            success: true,
            data: {
                deleted_count: result.rowCount,
                days_old: parseInt(days_old),
                event_types: event_types.length > 0 ? event_types : 'all'
            }
        });

    } catch (error) {
        console.error('Cleanup events error:', error);
        res.status(500).json({
            error: 'Failed to cleanup events'
        });
    }
});

module.exports = router;
