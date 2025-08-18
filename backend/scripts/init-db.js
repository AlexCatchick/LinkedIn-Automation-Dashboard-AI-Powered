const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
    const client = await pool.connect();

    try {
        console.log('🔄 Initializing database schema...');

        // Create users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Create campaigns table
        await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Create prospects table
        await client.query(`
      CREATE TABLE IF NOT EXISTS prospects (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        linkedin_url TEXT NOT NULL,
        email VARCHAR(255),
        full_name VARCHAR(255),
        title VARCHAR(255),
        company VARCHAR(255),
        location VARCHAR(255),
        industry VARCHAR(255),
        status VARCHAR(50) DEFAULT 'new',
        fit_score INTEGER,
        hooks TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(campaign_id, linkedin_url)
      )
    `);

        // Create messages table
        await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        subject VARCHAR(255),
        message_type VARCHAR(50) DEFAULT 'connection_request',
        status VARCHAR(50) DEFAULT 'draft',
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        response_content TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Create sequences table
        await client.query(`
      CREATE TABLE IF NOT EXISTS sequences (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        prospect_filters JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Create sequence_steps table
        await client.query(`
      CREATE TABLE IF NOT EXISTS sequence_steps (
        id SERIAL PRIMARY KEY,
        sequence_id INTEGER REFERENCES sequences(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        subject VARCHAR(255),
        delay_days INTEGER DEFAULT 0,
        conditions JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Create sequence_prospects table
        await client.query(`
      CREATE TABLE IF NOT EXISTS sequence_prospects (
        id SERIAL PRIMARY KEY,
        sequence_id INTEGER REFERENCES sequences(id) ON DELETE CASCADE,
        prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'active',
        current_step INTEGER DEFAULT 1,
        next_action_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(sequence_id, prospect_id)
      )
    `);

        // Create events table
        await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        prospect_id INTEGER REFERENCES prospects(id) ON DELETE SET NULL,
        kind VARCHAR(100) NOT NULL,
        payload_json JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Create indexes for better performance
        await client.query('CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_prospects_campaign_id ON prospects(campaign_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_messages_prospect_id ON messages(prospect_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_events_campaign_id ON events(campaign_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)');

        console.log('✅ Database schema initialized successfully!');

        // Create demo user if it doesn't exist
        const demoUserEmail = 'demo@linkedinautomation.com';
        const demoUserCheck = await client.query('SELECT id FROM users WHERE email = $1', [demoUserEmail]);

        if (demoUserCheck.rows.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('demo123', 10);

            await client.query(
                'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4)',
                [demoUserEmail, hashedPassword, 'Demo', 'User']
            );

            console.log('✅ Demo user created: demo@linkedinautomation.com / demo123');
        } else {
            console.log('ℹ️  Demo user already exists');
        }

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('🎉 Database initialization complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Initialization failed:', error);
            process.exit(1);
        });
}

module.exports = { initializeDatabase };
