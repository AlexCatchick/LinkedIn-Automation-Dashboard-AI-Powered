const express = require('express');
const { query, transaction } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get sequences
router.get('/', auth, async (req, res) => {
    try {
        const { campaign_id, status, limit = 50, offset = 0 } = req.query;

        let queryStr = `
      SELECT s.*, c.name as campaign_name,
             COUNT(sp.id) as total_prospects,
             COUNT(CASE WHEN sp.status = 'active' THEN 1 END) as active_prospects,
             COUNT(CASE WHEN sp.status = 'completed' THEN 1 END) as completed_prospects
      FROM sequences s
      JOIN campaigns c ON s.campaign_id = c.id
      LEFT JOIN sequence_prospects sp ON s.id = sp.sequence_id
      WHERE c.user_id = $1
    `;
        const values = [req.user.userId];
        let paramIndex = 2;

        if (campaign_id) {
            queryStr += ` AND s.campaign_id = $${paramIndex++}`;
            values.push(campaign_id);
        }

        if (status) {
            queryStr += ` AND s.status = $${paramIndex++}`;
            values.push(status);
        }

        queryStr += ` GROUP BY s.id, c.name ORDER BY s.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(parseInt(limit), parseInt(offset));

        const result = await query(queryStr, values);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get sequences error:', error);
        res.status(500).json({
            error: 'Failed to fetch sequences'
        });
    }
});

// Get single sequence with steps
router.get('/:id', auth, async (req, res) => {
    try {
        const sequenceId = req.params.id;

        // Get sequence details
        const sequenceResult = await query(
            `SELECT s.*, c.name as campaign_name
       FROM sequences s
       JOIN campaigns c ON s.campaign_id = c.id
       WHERE s.id = $1 AND c.user_id = $2`,
            [sequenceId, req.user.userId]
        );

        if (sequenceResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Sequence not found'
            });
        }

        // Get sequence steps
        const stepsResult = await query(
            'SELECT * FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_order',
            [sequenceId]
        );

        // Get sequence prospects
        const prospectsResult = await query(
            `SELECT sp.*, p.full_name, p.linkedin_url, p.email
       FROM sequence_prospects sp
       JOIN prospects p ON sp.prospect_id = p.id
       WHERE sp.sequence_id = $1
       ORDER BY sp.created_at DESC`,
            [sequenceId]
        );

        const sequence = sequenceResult.rows[0];
        sequence.steps = stepsResult.rows;
        sequence.prospects = prospectsResult.rows;

        res.json({
            success: true,
            data: sequence
        });

    } catch (error) {
        console.error('Get sequence error:', error);
        res.status(500).json({
            error: 'Failed to fetch sequence'
        });
    }
});

// Create sequence
router.post('/', auth, async (req, res) => {
    try {
        const {
            campaign_id,
            name,
            description,
            steps = [],
            prospect_filters = {}
        } = req.body;

        if (!campaign_id || !name) {
            return res.status(400).json({
                error: 'Campaign ID and name are required'
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

        // Validate steps
        if (steps.length === 0) {
            return res.status(400).json({
                error: 'At least one step is required'
            });
        }

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (!step.action_type || !step.content) {
                return res.status(400).json({
                    error: `Step ${i + 1} is missing required fields (action_type, content)`
                });
            }

            if (!['connection_request', 'message', 'follow_up', 'email'].includes(step.action_type)) {
                return res.status(400).json({
                    error: `Step ${i + 1} has invalid action_type`
                });
            }

            if (typeof step.delay_days !== 'number' || step.delay_days < 0) {
                return res.status(400).json({
                    error: `Step ${i + 1} must have valid delay_days (number >= 0)`
                });
            }
        }

        await transaction(async (client) => {
            // Create sequence
            const sequenceResult = await client.query(
                `INSERT INTO sequences (campaign_id, name, description, prospect_filters)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
                [campaign_id, name.trim(), description?.trim() || null, prospect_filters]
            );

            const sequenceId = sequenceResult.rows[0].id;

            // Create sequence steps
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                await client.query(
                    `INSERT INTO sequence_steps (sequence_id, step_order, action_type, content, subject, delay_days, conditions)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        sequenceId,
                        i + 1,
                        step.action_type,
                        step.content.trim(),
                        step.subject?.trim() || null,
                        step.delay_days,
                        step.conditions || {}
                    ]
                );
            }

            // Log sequence creation
            await client.query(
                `INSERT INTO events (kind, campaign_id, payload_json)
         VALUES ($1, $2, $3)`,
                [
                    'sequence_created',
                    campaign_id,
                    JSON.stringify({
                        sequence_id: sequenceId,
                        name,
                        steps_count: steps.length
                    })
                ]
            );

            return sequenceResult.rows[0];
        });

        res.status(201).json({
            success: true,
            data: { message: 'Sequence created successfully' }
        });

    } catch (error) {
        console.error('Create sequence error:', error);
        res.status(500).json({
            error: 'Failed to create sequence'
        });
    }
});

// Add prospects to sequence
router.post('/:id/prospects', auth, async (req, res) => {
    try {
        const sequenceId = req.params.id;
        const { prospect_ids } = req.body;

        if (!prospect_ids || !Array.isArray(prospect_ids) || prospect_ids.length === 0) {
            return res.status(400).json({
                error: 'Array of prospect IDs is required'
            });
        }

        // Verify sequence belongs to user
        const sequenceCheck = await query(
            `SELECT s.id, s.campaign_id FROM sequences s
       JOIN campaigns c ON s.campaign_id = c.id
       WHERE s.id = $1 AND c.user_id = $2`,
            [sequenceId, req.user.userId]
        );

        if (sequenceCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Sequence not found'
            });
        }

        const sequence = sequenceCheck.rows[0];

        // Verify prospects belong to same campaign
        const prospectsCheck = await query(
            'SELECT id FROM prospects WHERE campaign_id = $1 AND id = ANY($2)',
            [sequence.campaign_id, prospect_ids]
        );

        if (prospectsCheck.rows.length !== prospect_ids.length) {
            return res.status(400).json({
                error: 'Some prospects do not belong to this campaign'
            });
        }

        let added = 0;
        let skipped = 0;

        for (const prospectId of prospect_ids) {
            try {
                // Check if prospect already in sequence
                const existingCheck = await query(
                    'SELECT id FROM sequence_prospects WHERE sequence_id = $1 AND prospect_id = $2',
                    [sequenceId, prospectId]
                );

                if (existingCheck.rows.length === 0) {
                    await query(
                        `INSERT INTO sequence_prospects (sequence_id, prospect_id, status, current_step)
             VALUES ($1, $2, 'active', 1)`,
                        [sequenceId, prospectId]
                    );
                    added++;
                } else {
                    skipped++;
                }
            } catch (error) {
                console.error(`Failed to add prospect ${prospectId} to sequence:`, error);
                skipped++;
            }
        }

        // Log prospect addition
        await query(
            `INSERT INTO events (kind, campaign_id, payload_json)
       VALUES ($1, $2, $3)`,
            [
                'prospects_added_to_sequence',
                sequence.campaign_id,
                JSON.stringify({
                    sequence_id: sequenceId,
                    added,
                    skipped,
                    total: prospect_ids.length
                })
            ]
        );

        res.json({
            success: true,
            data: { added, skipped, total: prospect_ids.length }
        });

    } catch (error) {
        console.error('Add prospects to sequence error:', error);
        res.status(500).json({
            error: 'Failed to add prospects to sequence'
        });
    }
});

// Update sequence
router.put('/:id', auth, async (req, res) => {
    try {
        const sequenceId = req.params.id;
        const { name, description, status, prospect_filters } = req.body;

        // Verify sequence belongs to user
        const sequenceCheck = await query(
            `SELECT s.id FROM sequences s
       JOIN campaigns c ON s.campaign_id = c.id
       WHERE s.id = $1 AND c.user_id = $2`,
            [sequenceId, req.user.userId]
        );

        if (sequenceCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Sequence not found'
            });
        }

        // Build update query
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name?.trim() || null);
        }

        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description?.trim() || null);
        }

        if (status && ['active', 'paused', 'completed'].includes(status)) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (prospect_filters !== undefined) {
            updates.push(`prospect_filters = $${paramIndex++}`);
            values.push(prospect_filters);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update'
            });
        }

        updates.push(`updated_at = NOW()`);
        values.push(sequenceId);

        const result = await query(
            `UPDATE sequences 
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
        console.error('Update sequence error:', error);
        res.status(500).json({
            error: 'Failed to update sequence'
        });
    }
});

// Execute next step for prospects in sequence
router.post('/:id/execute', auth, async (req, res) => {
    try {
        const sequenceId = req.params.id;

        // Verify sequence belongs to user
        const sequenceCheck = await query(
            `SELECT s.id, s.campaign_id, s.status FROM sequences s
       JOIN campaigns c ON s.campaign_id = c.id
       WHERE s.id = $1 AND c.user_id = $2`,
            [sequenceId, req.user.userId]
        );

        if (sequenceCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Sequence not found'
            });
        }

        const sequence = sequenceCheck.rows[0];

        if (sequence.status !== 'active') {
            return res.status(400).json({
                error: 'Sequence is not active'
            });
        }

        // Get prospects ready for next step
        const readyProspects = await query(
            `SELECT sp.*, ss.action_type, ss.content, ss.subject, ss.delay_days
       FROM sequence_prospects sp
       JOIN sequence_steps ss ON sp.sequence_id = ss.sequence_id AND sp.current_step = ss.step_order
       WHERE sp.sequence_id = $1 
         AND sp.status = 'active'
         AND (sp.next_action_at IS NULL OR sp.next_action_at <= NOW())`,
            [sequenceId]
        );

        let executed = 0;
        const errors = [];

        for (const prospect of readyProspects.rows) {
            try {
                await transaction(async (client) => {
                    // Create message for this step
                    await client.query(
                        `INSERT INTO messages (campaign_id, prospect_id, content, subject, message_type, status)
             VALUES ($1, $2, $3, $4, $5, 'scheduled')`,
                        [
                            sequence.campaign_id,
                            prospect.prospect_id,
                            prospect.content,
                            prospect.subject,
                            prospect.action_type === 'connection_request' ? 'connection_request' : 'follow_up'
                        ]
                    );

                    // Check if this is the last step
                    const nextStepCheck = await client.query(
                        'SELECT id FROM sequence_steps WHERE sequence_id = $1 AND step_order = $2',
                        [sequenceId, prospect.current_step + 1]
                    );

                    if (nextStepCheck.rows.length > 0) {
                        // Move to next step
                        const nextActionDate = new Date(Date.now() + (prospect.delay_days * 24 * 60 * 60 * 1000));
                        await client.query(
                            `UPDATE sequence_prospects 
               SET current_step = current_step + 1, 
                   next_action_at = $1,
                   updated_at = NOW()
               WHERE id = $2`,
                            [nextActionDate, prospect.id]
                        );
                    } else {
                        // Mark as completed
                        await client.query(
                            `UPDATE sequence_prospects 
               SET status = 'completed',
                   completed_at = NOW(),
                   updated_at = NOW()
               WHERE id = $1`,
                            [prospect.id]
                        );
                    }

                    executed++;
                });
            } catch (error) {
                console.error(`Failed to execute step for prospect ${prospect.prospect_id}:`, error);
                errors.push({ prospect_id: prospect.prospect_id, error: error.message });
            }
        }

        // Log execution
        await query(
            `INSERT INTO events (kind, campaign_id, payload_json)
       VALUES ($1, $2, $3)`,
            [
                'sequence_executed',
                sequence.campaign_id,
                JSON.stringify({
                    sequence_id: sequenceId,
                    executed,
                    errors: errors.length,
                    total_ready: readyProspects.rows.length
                })
            ]
        );

        res.json({
            success: true,
            data: {
                executed,
                errors: errors.length,
                total_ready: readyProspects.rows.length,
                error_details: errors.slice(0, 5) // Return first 5 errors
            }
        });

    } catch (error) {
        console.error('Execute sequence error:', error);
        res.status(500).json({
            error: 'Failed to execute sequence'
        });
    }
});

// Remove prospect from sequence
router.delete('/:id/prospects/:prospect_id', auth, async (req, res) => {
    try {
        const { id: sequenceId, prospect_id: prospectId } = req.params;

        // Verify sequence belongs to user
        const sequenceCheck = await query(
            `SELECT s.id, s.campaign_id FROM sequences s
       JOIN campaigns c ON s.campaign_id = c.id
       WHERE s.id = $1 AND c.user_id = $2`,
            [sequenceId, req.user.userId]
        );

        if (sequenceCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Sequence not found'
            });
        }

        // Remove prospect from sequence
        const result = await query(
            'DELETE FROM sequence_prospects WHERE sequence_id = $1 AND prospect_id = $2',
            [sequenceId, prospectId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: 'Prospect not found in this sequence'
            });
        }

        res.json({
            success: true,
            message: 'Prospect removed from sequence successfully'
        });

    } catch (error) {
        console.error('Remove prospect from sequence error:', error);
        res.status(500).json({
            error: 'Failed to remove prospect from sequence'
        });
    }
});

// Delete sequence
router.delete('/:id', auth, async (req, res) => {
    try {
        const sequenceId = req.params.id;

        // Verify sequence belongs to user
        const sequenceCheck = await query(
            `SELECT s.id, s.campaign_id FROM sequences s
       JOIN campaigns c ON s.campaign_id = c.id
       WHERE s.id = $1 AND c.user_id = $2`,
            [sequenceId, req.user.userId]
        );

        if (sequenceCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Sequence not found'
            });
        }

        const sequence = sequenceCheck.rows[0];

        // Delete sequence (cascade will handle related records)
        await query(
            'DELETE FROM sequences WHERE id = $1',
            [sequenceId]
        );

        // Log deletion
        await query(
            `INSERT INTO events (kind, campaign_id, payload_json)
       VALUES ($1, $2, $3)`,
            [
                'sequence_deleted',
                sequence.campaign_id,
                JSON.stringify({ sequence_id: sequenceId })
            ]
        );

        res.json({
            success: true,
            message: 'Sequence deleted successfully'
        });

    } catch (error) {
        console.error('Delete sequence error:', error);
        res.status(500).json({
            error: 'Failed to delete sequence'
        });
    }
});

module.exports = router;
