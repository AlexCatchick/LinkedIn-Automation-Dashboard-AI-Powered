const express = require('express');
const { query, transaction } = require('../config/database');
const auth = require('../middleware/auth');
const OpenAI = require('openai');

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Get messages
router.get('/', auth, async (req, res) => {
    try {
        const { campaign_id, prospect_id, status, limit = 50, offset = 0 } = req.query;

        let queryStr = `
      SELECT m.*, p.full_name as prospect_name, p.linkedin_url, c.name as campaign_name
      FROM messages m
      JOIN prospects p ON m.prospect_id = p.id
      JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.user_id = $1
    `;
        const values = [req.user.userId];
        let paramIndex = 2;

        if (campaign_id) {
            queryStr += ` AND m.campaign_id = $${paramIndex++}`;
            values.push(campaign_id);
        }

        if (prospect_id) {
            queryStr += ` AND m.prospect_id = $${paramIndex++}`;
            values.push(prospect_id);
        }

        if (status) {
            queryStr += ` AND m.status = $${paramIndex++}`;
            values.push(status);
        }

        queryStr += ` ORDER BY m.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(parseInt(limit), parseInt(offset));

        const result = await query(queryStr, values);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            error: 'Failed to fetch messages'
        });
    }
});

// Get single message
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await query(
            `SELECT m.*, p.full_name as prospect_name, p.linkedin_url, c.name as campaign_name
       FROM messages m
       JOIN prospects p ON m.prospect_id = p.id
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE m.id = $1 AND c.user_id = $2`,
            [req.params.id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Message not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({
            error: 'Failed to fetch message'
        });
    }
});

// Generate personalized message using AI
router.post('/generate', auth, async (req, res) => {
    try {
        const { prospect_id, message_template, personalization_fields, tone = 'professional' } = req.body;

        if (!prospect_id || !message_template) {
            return res.status(400).json({
                error: 'Prospect ID and message template are required'
            });
        }

        // Get prospect data
        const prospectResult = await query(
            `SELECT p.*, c.user_id FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       WHERE p.id = $1 AND c.user_id = $2`,
            [prospect_id, req.user.userId]
        );

        if (prospectResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Prospect not found'
            });
        }

        const prospect = prospectResult.rows[0];

        // Build personalization context
        const context = {
            name: prospect.full_name || 'there',
            title: prospect.title || '',
            company: prospect.company || '',
            location: prospect.location || '',
            industry: prospect.industry || '',
            ...personalization_fields
        };

        // Create system prompt for AI
        const systemPrompt = `You are a professional LinkedIn outreach specialist. Generate a personalized message based on the template and prospect information.

Template: ${message_template}

Prospect Information:
- Name: ${context.name}
- Title: ${context.title}
- Company: ${context.company}
- Location: ${context.location}
- Industry: ${context.industry}

Tone: ${tone}

Guidelines:
1. Keep the message between 50-150 words
2. Use a ${tone} tone
3. Personalize based on prospect's role and company
4. Include a clear call to action
5. Avoid being salesy or pushy
6. Make it feel authentic and human

Replace placeholders in the template with personalized content and enhance the message to be more engaging.`;

        // Generate message using OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Generate a personalized LinkedIn message for ${context.name}` }
            ],
            max_tokens: 300,
            temperature: 0.7
        });

        const generatedMessage = completion.choices[0].message.content.trim();

        // Log AI generation event
        await query(
            `INSERT INTO events (kind, campaign_id, prospect_id, payload_json)
       VALUES ($1, $2, $3, $4)`,
            [
                'message_generated',
                prospect.campaign_id,
                prospect_id,
                JSON.stringify({
                    template: message_template,
                    generated_message: generatedMessage,
                    tone,
                    tokens_used: completion.usage.total_tokens
                })
            ]
        );

        res.json({
            success: true,
            data: {
                generated_message: generatedMessage,
                prospect_context: context,
                tokens_used: completion.usage.total_tokens
            }
        });

    } catch (error) {
        console.error('Generate message error:', error);

        if (error.code === 'insufficient_quota') {
            return res.status(429).json({
                error: 'OpenAI API quota exceeded'
            });
        }

        res.status(500).json({
            error: 'Failed to generate message'
        });
    }
});

// Create message
router.post('/', auth, async (req, res) => {
    try {
        const {
            campaign_id,
            prospect_id,
            content,
            subject,
            message_type = 'connection_request',
            scheduled_at
        } = req.body;

        if (!campaign_id || !prospect_id || !content) {
            return res.status(400).json({
                error: 'Campaign ID, prospect ID, and content are required'
            });
        }

        // Verify prospect belongs to user's campaign
        const prospectCheck = await query(
            `SELECT p.id FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       WHERE p.id = $1 AND c.id = $2 AND c.user_id = $3`,
            [prospect_id, campaign_id, req.user.userId]
        );

        if (prospectCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Prospect not found or does not belong to this campaign'
            });
        }

        // Validate message type
        const validTypes = ['connection_request', 'first_message', 'follow_up', 'thank_you'];
        if (!validTypes.includes(message_type)) {
            return res.status(400).json({
                error: 'Invalid message type'
            });
        }

        const result = await query(
            `INSERT INTO messages (campaign_id, prospect_id, content, subject, message_type, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [
                campaign_id,
                prospect_id,
                content.trim(),
                subject?.trim() || null,
                message_type,
                scheduled_at ? new Date(scheduled_at) : null
            ]
        );

        // Log message creation
        await query(
            `INSERT INTO events (kind, campaign_id, prospect_id, payload_json)
       VALUES ($1, $2, $3, $4)`,
            [
                'message_created',
                campaign_id,
                prospect_id,
                JSON.stringify({
                    message_id: result.rows[0].id,
                    message_type,
                    scheduled: !!scheduled_at
                })
            ]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create message error:', error);
        res.status(500).json({
            error: 'Failed to create message'
        });
    }
});

// Update message
router.put('/:id', auth, async (req, res) => {
    try {
        const messageId = req.params.id;
        const { content, subject, status, scheduled_at, sent_at, response_content } = req.body;

        // Verify message belongs to user's campaign
        const messageCheck = await query(
            `SELECT m.id, m.status FROM messages m
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE m.id = $1 AND c.user_id = $2`,
            [messageId, req.user.userId]
        );

        if (messageCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Message not found'
            });
        }

        // Build update query
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (content !== undefined) {
            updates.push(`content = $${paramIndex++}`);
            values.push(content?.trim() || null);
        }

        if (subject !== undefined) {
            updates.push(`subject = $${paramIndex++}`);
            values.push(subject?.trim() || null);
        }

        if (status && ['draft', 'scheduled', 'sending', 'sent', 'failed', 'responded'].includes(status)) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);

            // Auto-set sent_at when status becomes 'sent'
            if (status === 'sent' && !sent_at) {
                updates.push(`sent_at = NOW()`);
            }
        }

        if (scheduled_at !== undefined) {
            updates.push(`scheduled_at = $${paramIndex++}`);
            values.push(scheduled_at ? new Date(scheduled_at) : null);
        }

        if (sent_at !== undefined) {
            updates.push(`sent_at = $${paramIndex++}`);
            values.push(sent_at ? new Date(sent_at) : null);
        }

        if (response_content !== undefined) {
            updates.push(`response_content = $${paramIndex++}`);
            values.push(response_content?.trim() || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update'
            });
        }

        updates.push(`updated_at = NOW()`);
        values.push(messageId);

        const result = await query(
            `UPDATE messages 
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
        console.error('Update message error:', error);
        res.status(500).json({
            error: 'Failed to update message'
        });
    }
});

// Schedule multiple messages
router.post('/schedule-batch', auth, async (req, res) => {
    try {
        const { campaign_id, prospect_ids, message_template, delay_hours = 24 } = req.body;

        if (!campaign_id || !prospect_ids || !Array.isArray(prospect_ids) || !message_template) {
            return res.status(400).json({
                error: 'Campaign ID, prospect IDs array, and message template are required'
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

        // Verify all prospects belong to campaign
        const prospectsCheck = await query(
            'SELECT id FROM prospects WHERE campaign_id = $1 AND id = ANY($2)',
            [campaign_id, prospect_ids]
        );

        if (prospectsCheck.rows.length !== prospect_ids.length) {
            return res.status(400).json({
                error: 'Some prospects do not belong to this campaign'
            });
        }

        const results = [];
        const now = new Date();

        // Schedule messages with staggered timing
        for (let i = 0; i < prospect_ids.length; i++) {
            const scheduledTime = new Date(now.getTime() + (i * delay_hours * 60 * 60 * 1000));

            try {
                const result = await query(
                    `INSERT INTO messages (campaign_id, prospect_id, content, message_type, status, scheduled_at)
           VALUES ($1, $2, $3, 'first_message', 'scheduled', $4)
           RETURNING *`,
                    [campaign_id, prospect_ids[i], message_template, scheduledTime]
                );

                results.push(result.rows[0]);
            } catch (error) {
                console.error(`Failed to schedule message for prospect ${prospect_ids[i]}:`, error);
            }
        }

        // Log batch scheduling
        await query(
            `INSERT INTO events (kind, campaign_id, payload_json)
       VALUES ($1, $2, $3)`,
            [
                'messages_batch_scheduled',
                campaign_id,
                JSON.stringify({
                    total_scheduled: results.length,
                    delay_hours,
                    prospect_count: prospect_ids.length
                })
            ]
        );

        res.json({
            success: true,
            data: {
                scheduled: results.length,
                total: prospect_ids.length,
                messages: results
            }
        });

    } catch (error) {
        console.error('Schedule batch messages error:', error);
        res.status(500).json({
            error: 'Failed to schedule batch messages'
        });
    }
});

// Delete message
router.delete('/:id', auth, async (req, res) => {
    try {
        const messageId = req.params.id;

        // Verify message belongs to user's campaign
        const messageCheck = await query(
            `SELECT m.id, m.campaign_id, m.status FROM messages m
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE m.id = $1 AND c.user_id = $2`,
            [messageId, req.user.userId]
        );

        if (messageCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Message not found'
            });
        }

        const message = messageCheck.rows[0];

        // Prevent deletion of sent messages
        if (message.status === 'sent') {
            return res.status(400).json({
                error: 'Cannot delete sent messages'
            });
        }

        // Delete message
        await query(
            'DELETE FROM messages WHERE id = $1',
            [messageId]
        );

        // Log deletion
        await query(
            `INSERT INTO events (kind, campaign_id, payload_json)
       VALUES ($1, $2, $3)`,
            [
                'message_deleted',
                message.campaign_id,
                JSON.stringify({ message_id: messageId, status: message.status })
            ]
        );

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });

    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            error: 'Failed to delete message'
        });
    }
});

module.exports = router;
