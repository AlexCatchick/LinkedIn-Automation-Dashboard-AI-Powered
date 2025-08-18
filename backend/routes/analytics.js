const express = require('express');
const { query } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get dashboard analytics overview
router.get('/dashboard', auth, async (req, res) => {
    try {
        const { campaign_id, start_date, end_date } = req.query;

        let whereClause = 'WHERE c.user_id = $1';
        const values = [req.user.userId];
        let paramIndex = 2;

        if (campaign_id) {
            whereClause += ` AND c.id = $${paramIndex++}`;
            values.push(campaign_id);
        }

        let dateFilter = '';
        if (start_date) {
            dateFilter += ` AND created_at >= $${paramIndex++}`;
            values.push(new Date(start_date));
        }

        if (end_date) {
            dateFilter += ` AND created_at <= $${paramIndex++}`;
            values.push(new Date(end_date));
        }

        // Campaign statistics
        const campaignStats = await query(
            `SELECT 
         COUNT(*) as total_campaigns,
         COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_campaigns,
         COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_campaigns
       FROM campaigns c
       ${whereClause}`,
            values.slice(0, campaign_id ? 2 : 1)
        );

        // Prospect statistics
        const prospectStats = await query(
            `SELECT 
         COUNT(*) as total_prospects,
         COUNT(CASE WHEN p.status = 'new' THEN 1 END) as new_prospects,
         COUNT(CASE WHEN p.status = 'contacted' THEN 1 END) as contacted_prospects,
         COUNT(CASE WHEN p.status = 'responded' THEN 1 END) as responded_prospects,
         COUNT(CASE WHEN p.status = 'converted' THEN 1 END) as converted_prospects,
         AVG(p.fit_score) as avg_fit_score
       FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       ${whereClause}${dateFilter.replace('created_at', 'p.created_at')}`,
            values
        );

        // Message statistics
        const messageStats = await query(
            `SELECT 
         COUNT(*) as total_messages,
         COUNT(CASE WHEN m.status = 'sent' THEN 1 END) as sent_messages,
         COUNT(CASE WHEN m.status = 'scheduled' THEN 1 END) as scheduled_messages,
         COUNT(CASE WHEN m.status = 'failed' THEN 1 END) as failed_messages,
         COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END) as responses_received,
         COUNT(DISTINCT m.prospect_id) as unique_prospects_messaged
       FROM messages m
       JOIN campaigns c ON m.campaign_id = c.id
       ${whereClause}${dateFilter.replace('created_at', 'm.created_at')}`,
            values
        );

        // Sequence statistics
        const sequenceStats = await query(
            `SELECT 
         COUNT(*) as total_sequences,
         COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_sequences,
         COUNT(DISTINCT sp.prospect_id) as prospects_in_sequences,
         COUNT(CASE WHEN sp.status = 'completed' THEN 1 END) as completed_sequence_runs
       FROM sequences s
       JOIN campaigns c ON s.campaign_id = c.id
       LEFT JOIN sequence_prospects sp ON s.id = sp.sequence_id
       ${whereClause}`,
            values.slice(0, campaign_id ? 2 : 1)
        );

        // Response rate calculation
        const responseRates = await query(
            `SELECT 
         COUNT(CASE WHEN m.status = 'sent' THEN 1 END) as sent_count,
         COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END) as response_count,
         CASE 
           WHEN COUNT(CASE WHEN m.status = 'sent' THEN 1 END) > 0 
           THEN (COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END)::float / COUNT(CASE WHEN m.status = 'sent' THEN 1 END)::float * 100)
           ELSE 0 
         END as response_rate_percentage
       FROM messages m
       JOIN campaigns c ON m.campaign_id = c.id
       ${whereClause}${dateFilter.replace('created_at', 'm.created_at')}`,
            values
        );

        // Recent activity (last 7 days)
        const recentActivity = await query(
            `SELECT 
         DATE(e.created_at) as activity_date,
         COUNT(*) as event_count,
         COUNT(CASE WHEN e.kind LIKE '%message%' THEN 1 END) as message_events,
         COUNT(CASE WHEN e.kind LIKE '%prospect%' THEN 1 END) as prospect_events
       FROM events e
       JOIN campaigns c ON e.campaign_id = c.id
       WHERE c.user_id = $1 
       AND e.created_at >= NOW() - INTERVAL '7 days'
       ${campaign_id ? 'AND c.id = $2' : ''}
       GROUP BY DATE(e.created_at)
       ORDER BY activity_date DESC`,
            campaign_id ? [req.user.userId, campaign_id] : [req.user.userId]
        );

        // Top performing campaigns
        const topCampaigns = await query(
            `SELECT 
         c.id,
         c.name,
         COUNT(p.id) as prospect_count,
         COUNT(CASE WHEN m.status = 'sent' THEN 1 END) as messages_sent,
         COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END) as responses_received,
         CASE 
           WHEN COUNT(CASE WHEN m.status = 'sent' THEN 1 END) > 0 
           THEN (COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END)::float / COUNT(CASE WHEN m.status = 'sent' THEN 1 END)::float * 100)
           ELSE 0 
         END as response_rate
       FROM campaigns c
       LEFT JOIN prospects p ON c.id = p.campaign_id
       LEFT JOIN messages m ON c.id = m.campaign_id
       WHERE c.user_id = $1
       ${campaign_id ? 'AND c.id = $2' : ''}
       GROUP BY c.id, c.name
       ORDER BY response_rate DESC, messages_sent DESC
       LIMIT 10`,
            campaign_id ? [req.user.userId, campaign_id] : [req.user.userId]
        );

        res.json({
            success: true,
            data: {
                campaigns: campaignStats.rows[0],
                prospects: prospectStats.rows[0],
                messages: messageStats.rows[0],
                sequences: sequenceStats.rows[0],
                response_rates: responseRates.rows[0],
                recent_activity: recentActivity.rows,
                top_campaigns: topCampaigns.rows
            }
        });

    } catch (error) {
        console.error('Get dashboard analytics error:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard analytics'
        });
    }
});

// Get campaign performance analytics
router.get('/campaigns/:id/performance', auth, async (req, res) => {
    try {
        const campaignId = req.params.id;

        // Verify campaign belongs to user
        const campaignCheck = await query(
            'SELECT id, name, created_at FROM campaigns WHERE id = $1 AND user_id = $2',
            [campaignId, req.user.userId]
        );

        if (campaignCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Campaign not found'
            });
        }

        const campaign = campaignCheck.rows[0];

        // Prospect funnel
        const prospectFunnel = await query(
            `SELECT 
         status,
         COUNT(*) as count,
         (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM prospects WHERE campaign_id = $1)) as percentage
       FROM prospects 
       WHERE campaign_id = $1
       GROUP BY status
       ORDER BY 
         CASE status
           WHEN 'new' THEN 1
           WHEN 'processing' THEN 2
           WHEN 'analyzed' THEN 3
           WHEN 'contacted' THEN 4
           WHEN 'responded' THEN 5
           WHEN 'converted' THEN 6
           ELSE 7
         END`,
            [campaignId]
        );

        // Message performance by type
        const messagePerformance = await query(
            `SELECT 
         message_type,
         COUNT(*) as total_sent,
         COUNT(CASE WHEN response_content IS NOT NULL THEN 1 END) as responses,
         AVG(CASE WHEN sent_at IS NOT NULL AND response_content IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (created_at - sent_at))/3600 END) as avg_response_time_hours
       FROM messages 
       WHERE campaign_id = $1 AND status = 'sent'
       GROUP BY message_type`,
            [campaignId]
        );

        // Daily activity timeline
        const activityTimeline = await query(
            `SELECT 
         DATE(created_at) as date,
         COUNT(CASE WHEN kind LIKE '%prospect%' THEN 1 END) as prospect_events,
         COUNT(CASE WHEN kind LIKE '%message%' THEN 1 END) as message_events,
         COUNT(CASE WHEN kind LIKE '%sequence%' THEN 1 END) as sequence_events
       FROM events 
       WHERE campaign_id = $1
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
            [campaignId]
        );

        // Top prospects by engagement
        const topProspects = await query(
            `SELECT 
         p.id,
         p.full_name,
         p.title,
         p.company,
         p.linkedin_url,
         p.fit_score,
         COUNT(m.id) as messages_sent,
         COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END) as responses,
         MAX(m.sent_at) as last_contact
       FROM prospects p
       LEFT JOIN messages m ON p.id = m.prospect_id
       WHERE p.campaign_id = $1
       GROUP BY p.id, p.full_name, p.title, p.company, p.linkedin_url, p.fit_score
       ORDER BY responses DESC, messages_sent DESC, p.fit_score DESC
       LIMIT 20`,
            [campaignId]
        );

        // Sequence effectiveness
        const sequenceEffectiveness = await query(
            `SELECT 
         s.id,
         s.name,
         COUNT(sp.id) as total_prospects,
         COUNT(CASE WHEN sp.status = 'completed' THEN 1 END) as completed,
         COUNT(CASE WHEN sp.status = 'active' THEN 1 END) as active,
         AVG(sp.current_step) as avg_current_step
       FROM sequences s
       LEFT JOIN sequence_prospects sp ON s.id = sp.sequence_id
       WHERE s.campaign_id = $1
       GROUP BY s.id, s.name`,
            [campaignId]
        );

        // Response sentiment analysis (basic)
        const responseSentiment = await query(
            `SELECT 
         CASE 
           WHEN LOWER(response_content) LIKE '%yes%' OR LOWER(response_content) LIKE '%interested%' 
                OR LOWER(response_content) LIKE '%sure%' OR LOWER(response_content) LIKE '%sounds good%'
           THEN 'positive'
           WHEN LOWER(response_content) LIKE '%no%' OR LOWER(response_content) LIKE '%not interested%' 
                OR LOWER(response_content) LIKE '%stop%' OR LOWER(response_content) LIKE '%remove%'
           THEN 'negative'
           ELSE 'neutral'
         END as sentiment,
         COUNT(*) as count
       FROM messages 
       WHERE campaign_id = $1 AND response_content IS NOT NULL
       GROUP BY 
         CASE 
           WHEN LOWER(response_content) LIKE '%yes%' OR LOWER(response_content) LIKE '%interested%' 
                OR LOWER(response_content) LIKE '%sure%' OR LOWER(response_content) LIKE '%sounds good%'
           THEN 'positive'
           WHEN LOWER(response_content) LIKE '%no%' OR LOWER(response_content) LIKE '%not interested%' 
                OR LOWER(response_content) LIKE '%stop%' OR LOWER(response_content) LIKE '%remove%'
           THEN 'negative'
           ELSE 'neutral'
         END`,
            [campaignId]
        );

        res.json({
            success: true,
            data: {
                campaign: campaign,
                prospect_funnel: prospectFunnel.rows,
                message_performance: messagePerformance.rows,
                activity_timeline: activityTimeline.rows,
                top_prospects: topProspects.rows,
                sequence_effectiveness: sequenceEffectiveness.rows,
                response_sentiment: responseSentiment.rows
            }
        });

    } catch (error) {
        console.error('Get campaign performance error:', error);
        res.status(500).json({
            error: 'Failed to fetch campaign performance analytics'
        });
    }
});

// Get prospect analytics
router.get('/prospects', auth, async (req, res) => {
    try {
        const { campaign_id } = req.query;

        let whereClause = 'WHERE c.user_id = $1';
        const values = [req.user.userId];

        if (campaign_id) {
            whereClause += ' AND p.campaign_id = $2';
            values.push(campaign_id);
        }

        // Prospect status distribution
        const statusDistribution = await query(
            `SELECT 
         p.status,
         COUNT(*) as count,
         AVG(p.fit_score) as avg_fit_score
       FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       ${whereClause}
       GROUP BY p.status`,
            values
        );

        // Company analysis
        const companyAnalysis = await query(
            `SELECT 
         p.company,
         COUNT(*) as prospect_count,
         AVG(p.fit_score) as avg_fit_score,
         COUNT(CASE WHEN p.status = 'responded' THEN 1 END) as responded_count
       FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       ${whereClause}
       AND p.company IS NOT NULL
       GROUP BY p.company
       HAVING COUNT(*) >= 2
       ORDER BY prospect_count DESC, avg_fit_score DESC
       LIMIT 20`,
            values
        );

        // Title analysis
        const titleAnalysis = await query(
            `SELECT 
         p.title,
         COUNT(*) as prospect_count,
         AVG(p.fit_score) as avg_fit_score,
         COUNT(CASE WHEN p.status = 'responded' THEN 1 END) as responded_count
       FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       ${whereClause}
       AND p.title IS NOT NULL
       GROUP BY p.title
       HAVING COUNT(*) >= 2
       ORDER BY prospect_count DESC, avg_fit_score DESC
       LIMIT 20`,
            values
        );

        // Location analysis
        const locationAnalysis = await query(
            `SELECT 
         p.location,
         COUNT(*) as prospect_count,
         AVG(p.fit_score) as avg_fit_score,
         COUNT(CASE WHEN p.status = 'responded' THEN 1 END) as responded_count
       FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       ${whereClause}
       AND p.location IS NOT NULL
       GROUP BY p.location
       HAVING COUNT(*) >= 2
       ORDER BY prospect_count DESC
       LIMIT 15`,
            values
        );

        // Fit score distribution
        const fitScoreDistribution = await query(
            `SELECT 
         CASE 
           WHEN p.fit_score >= 80 THEN 'High (80-100)'
           WHEN p.fit_score >= 60 THEN 'Medium (60-79)'
           WHEN p.fit_score >= 40 THEN 'Low (40-59)'
           WHEN p.fit_score IS NOT NULL THEN 'Very Low (0-39)'
           ELSE 'Not Scored'
         END as score_range,
         COUNT(*) as count,
         COUNT(CASE WHEN p.status = 'responded' THEN 1 END) as responded_count
       FROM prospects p
       JOIN campaigns c ON p.campaign_id = c.id
       ${whereClause}
       GROUP BY 
         CASE 
           WHEN p.fit_score >= 80 THEN 'High (80-100)'
           WHEN p.fit_score >= 60 THEN 'Medium (60-79)'
           WHEN p.fit_score >= 40 THEN 'Low (40-59)'
           WHEN p.fit_score IS NOT NULL THEN 'Very Low (0-39)'
           ELSE 'Not Scored'
         END
       ORDER BY 
         CASE 
           WHEN p.fit_score >= 80 THEN 1
           WHEN p.fit_score >= 60 THEN 2
           WHEN p.fit_score >= 40 THEN 3
           WHEN p.fit_score IS NOT NULL THEN 4
           ELSE 5
         END`,
            values
        );

        res.json({
            success: true,
            data: {
                status_distribution: statusDistribution.rows,
                company_analysis: companyAnalysis.rows,
                title_analysis: titleAnalysis.rows,
                location_analysis: locationAnalysis.rows,
                fit_score_distribution: fitScoreDistribution.rows
            }
        });

    } catch (error) {
        console.error('Get prospect analytics error:', error);
        res.status(500).json({
            error: 'Failed to fetch prospect analytics'
        });
    }
});

// Get message analytics
router.get('/messages', auth, async (req, res) => {
    try {
        const { campaign_id, start_date, end_date } = req.query;

        let whereClause = 'WHERE c.user_id = $1';
        const values = [req.user.userId];
        let paramIndex = 2;

        if (campaign_id) {
            whereClause += ` AND m.campaign_id = $${paramIndex++}`;
            values.push(campaign_id);
        }

        if (start_date) {
            whereClause += ` AND m.created_at >= $${paramIndex++}`;
            values.push(new Date(start_date));
        }

        if (end_date) {
            whereClause += ` AND m.created_at <= $${paramIndex++}`;
            values.push(new Date(end_date));
        }

        // Message performance by hour of day
        const hourlyPerformance = await query(
            `SELECT 
         EXTRACT(HOUR FROM m.sent_at) as hour,
         COUNT(*) as messages_sent,
         COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END) as responses
       FROM messages m
       JOIN campaigns c ON m.campaign_id = c.id
       ${whereClause} AND m.status = 'sent' AND m.sent_at IS NOT NULL
       GROUP BY EXTRACT(HOUR FROM m.sent_at)
       ORDER BY hour`,
            values
        );

        // Message performance by day of week
        const weeklyPerformance = await query(
            `SELECT 
         EXTRACT(DOW FROM m.sent_at) as day_of_week,
         COUNT(*) as messages_sent,
         COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END) as responses
       FROM messages m
       JOIN campaigns c ON m.campaign_id = c.id
       ${whereClause} AND m.status = 'sent' AND m.sent_at IS NOT NULL
       GROUP BY EXTRACT(DOW FROM m.sent_at)
       ORDER BY day_of_week`,
            values
        );

        // Average response times
        const responseTimeAnalysis = await query(
            `SELECT 
         m.message_type,
         COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END) as response_count,
         AVG(CASE WHEN m.response_content IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (m.updated_at - m.sent_at))/3600 END) as avg_response_time_hours,
         MIN(CASE WHEN m.response_content IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (m.updated_at - m.sent_at))/3600 END) as min_response_time_hours,
         MAX(CASE WHEN m.response_content IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (m.updated_at - m.sent_at))/3600 END) as max_response_time_hours
       FROM messages m
       JOIN campaigns c ON m.campaign_id = c.id
       ${whereClause} AND m.status = 'sent'
       GROUP BY m.message_type`,
            values
        );

        // Message length vs response rate
        const lengthAnalysis = await query(
            `SELECT 
         CASE 
           WHEN LENGTH(m.content) <= 50 THEN 'Very Short (≤50)'
           WHEN LENGTH(m.content) <= 100 THEN 'Short (51-100)'
           WHEN LENGTH(m.content) <= 200 THEN 'Medium (101-200)'
           WHEN LENGTH(m.content) <= 300 THEN 'Long (201-300)'
           ELSE 'Very Long (>300)'
         END as length_category,
         COUNT(*) as messages_sent,
         COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END) as responses,
         AVG(LENGTH(m.content)) as avg_length
       FROM messages m
       JOIN campaigns c ON m.campaign_id = c.id
       ${whereClause} AND m.status = 'sent'
       GROUP BY 
         CASE 
           WHEN LENGTH(m.content) <= 50 THEN 'Very Short (≤50)'
           WHEN LENGTH(m.content) <= 100 THEN 'Short (51-100)'
           WHEN LENGTH(m.content) <= 200 THEN 'Medium (101-200)'
           WHEN LENGTH(m.content) <= 300 THEN 'Long (201-300)'
           ELSE 'Very Long (>300)'
         END
       ORDER BY avg_length`,
            values
        );

        // Subject line performance (for messages with subjects)
        const subjectLinePerformance = await query(
            `SELECT 
         m.subject,
         COUNT(*) as messages_sent,
         COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END) as responses,
         (COUNT(CASE WHEN m.response_content IS NOT NULL THEN 1 END)::float / COUNT(*)::float * 100) as response_rate
       FROM messages m
       JOIN campaigns c ON m.campaign_id = c.id
       ${whereClause} AND m.status = 'sent' AND m.subject IS NOT NULL
       GROUP BY m.subject
       HAVING COUNT(*) >= 3
       ORDER BY response_rate DESC, messages_sent DESC
       LIMIT 20`,
            values
        );

        res.json({
            success: true,
            data: {
                hourly_performance: hourlyPerformance.rows,
                weekly_performance: weeklyPerformance.rows,
                response_time_analysis: responseTimeAnalysis.rows,
                length_analysis: lengthAnalysis.rows,
                subject_line_performance: subjectLinePerformance.rows
            }
        });

    } catch (error) {
        console.error('Get message analytics error:', error);
        res.status(500).json({
            error: 'Failed to fetch message analytics'
        });
    }
});

// Export analytics data
router.get('/export', auth, async (req, res) => {
    try {
        const { type, campaign_id, format = 'json' } = req.query;

        if (!type || !['dashboard', 'campaigns', 'prospects', 'messages'].includes(type)) {
            return res.status(400).json({
                error: 'Valid analytics type is required (dashboard, campaigns, prospects, messages)'
            });
        }

        let data;
        switch (type) {
            case 'dashboard':
                // Reuse dashboard endpoint logic
                const dashboardData = await getDashboardData(req.user.userId, campaign_id);
                data = dashboardData;
                break;
            // Add other cases as needed
            default:
                return res.status(400).json({ error: 'Export type not implemented' });
        }

        if (format === 'csv') {
            // Convert to CSV format
            const csvContent = convertToCSV(data);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csvContent);
        } else {
            res.json({
                success: true,
                data: data,
                exported_at: new Date().toISOString(),
                type: type
            });
        }

    } catch (error) {
        console.error('Export analytics error:', error);
        res.status(500).json({
            error: 'Failed to export analytics data'
        });
    }
});

// Helper function to convert data to CSV (basic implementation)
function convertToCSV(data) {
    // This is a simplified implementation
    // In practice, you'd want more sophisticated CSV conversion
    return JSON.stringify(data, null, 2);
}

module.exports = router;
