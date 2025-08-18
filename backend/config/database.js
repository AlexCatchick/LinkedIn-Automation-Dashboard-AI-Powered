const { Pool } = require('pg');
const path = require('path');

// Check if we should use SQLite fallback for development
const useSqlite = !process.env.DATABASE_URL || process.env.USE_SQLITE === 'true';

let pool;
let db;

if (useSqlite) {
    // SQLite fallback for development
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '../database.sqlite');
    db = new Database(dbPath);
    console.log('📦 Using SQLite database for development');
} else {
    // PostgreSQL/Supabase configuration
    const dbConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false
        } : false,
        // Connection pool settings
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
        maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
    };

    // Create the connection pool
    pool = new Pool(dbConfig);
}

// Handle pool errors for PostgreSQL
if (pool) {
    pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
    });
}

// Database query helper
const query = async (text, params = []) => {
    const start = Date.now();
    try {
        let res;

        if (useSqlite) {
            // SQLite query
            if (text.includes('RETURNING')) {
                // Handle RETURNING clause for SQLite
                const insertText = text.replace(/RETURNING.*/, '');
                const stmt = db.prepare(insertText);
                const result = stmt.run(params);
                res = {
                    rows: [{ id: result.lastInsertRowid }],
                    rowCount: result.changes
                };
            } else if (text.trim().toUpperCase().startsWith('SELECT')) {
                // SELECT query
                const stmt = db.prepare(text);
                const rows = stmt.all(params);
                res = { rows, rowCount: rows.length };
            } else {
                // INSERT/UPDATE/DELETE
                const stmt = db.prepare(text);
                const result = stmt.run(params);
                res = { rows: [], rowCount: result.changes };
            }
        } else {
            // PostgreSQL query
            res = await pool.query(text, params);
        }

        const duration = Date.now() - start;
        console.log('Executed query', { text: text.slice(0, 50) + '...', duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', { text: text.slice(0, 50) + '...', error: error.message });
        throw error;
    }
};

// Database transaction helper
const transaction = async (callback) => {
    if (useSqlite) {
        // SQLite transaction
        try {
            const transaction = db.transaction(callback);
            return transaction();
        } catch (error) {
            console.error('SQLite transaction error:', error);
            throw error;
        }
    } else {
        // PostgreSQL transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('PostgreSQL transaction error:', error);
            throw error;
        } finally {
            client.release();
        }
    }
};

// Test database connection
const testConnection = async () => {
    try {
        if (useSqlite) {
            // Test SQLite
            const result = await query("SELECT datetime('now') as current_time");
            console.log('✅ SQLite database connected successfully at:', result.rows[0].current_time);
        } else {
            // Test PostgreSQL
            const result = await query('SELECT NOW() as current_time');
            console.log('✅ PostgreSQL database connected successfully at:', result.rows[0].current_time);
        }
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Initialize database (create tables if they don't exist)
const initializeDatabase = async () => {
    try {
        console.log('🔧 Initializing database...');

        // Read and execute the schema
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '../../database/schema.sql');

        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await query(schema);
            console.log('✅ Database schema initialized');
        } else {
            console.log('⚠️ Schema file not found, creating basic tables...');
            await createBasicTables();
        }

        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        return false;
    }
};

// Create basic tables if schema file is missing
const createBasicTables = async () => {
    const basicSchema = useSqlite ? `
    -- Users table (SQLite)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      organization_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Organizations table (SQLite)
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      domain TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Campaigns table (SQLite)
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      user_id TEXT NOT NULL,
      organization_id TEXT,
      intake_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Prospects table (SQLite)
    CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      campaign_id TEXT NOT NULL,
      linkedin_url TEXT NOT NULL,
      full_name TEXT,
      email TEXT,
      title TEXT,
      company TEXT,
      location TEXT,
      industry TEXT,
      status TEXT DEFAULT 'new',
      fit_score INTEGER,
      hooks TEXT,
      profile_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    -- Messages table (SQLite)
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      campaign_id TEXT NOT NULL,
      prospect_id TEXT NOT NULL,
      message_type TEXT NOT NULL,
      subject TEXT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      scheduled_at DATETIME,
      sent_at DATETIME,
      response_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
    );

    -- Sequences table (SQLite)
    CREATE TABLE IF NOT EXISTS sequences (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      prospect_filters TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    -- Sequence steps table (SQLite)
    CREATE TABLE IF NOT EXISTS sequence_steps (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      sequence_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      content TEXT NOT NULL,
      subject TEXT,
      delay_days INTEGER DEFAULT 1,
      conditions TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE
    );

    -- Sequence prospects table (SQLite)
    CREATE TABLE IF NOT EXISTS sequence_prospects (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      sequence_id TEXT NOT NULL,
      prospect_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      current_step INTEGER DEFAULT 1,
      next_action_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
    );

    -- Events table (SQLite)
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      campaign_id TEXT NOT NULL,
      prospect_id TEXT,
      kind TEXT NOT NULL,
      payload_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
    CREATE INDEX IF NOT EXISTS idx_prospects_campaign_id ON prospects(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_messages_prospect_id ON messages(prospect_id);
    CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
  ` : `
    -- Users table (PostgreSQL)
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      organization_id UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Organizations table (PostgreSQL)
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Campaigns table (PostgreSQL)
    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id UUID REFERENCES organizations(id),
      intake_json JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Prospects table (PostgreSQL)
    CREATE TABLE IF NOT EXISTS prospects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      linkedin_url VARCHAR(500) NOT NULL,
      full_name VARCHAR(255),
      email VARCHAR(255),
      title VARCHAR(255),
      company VARCHAR(255),
      location VARCHAR(255),
      industry VARCHAR(255),
      status VARCHAR(50) DEFAULT 'new',
      fit_score INTEGER,
      hooks TEXT[],
      profile_json JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Messages table (PostgreSQL)
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
      message_type VARCHAR(50) NOT NULL,
      subject VARCHAR(255),
      content TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      scheduled_at TIMESTAMP,
      sent_at TIMESTAMP,
      response_content TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Sequences table (PostgreSQL)
    CREATE TABLE IF NOT EXISTS sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'active',
      prospect_filters JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Sequence steps table (PostgreSQL)
    CREATE TABLE IF NOT EXISTS sequence_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      subject VARCHAR(255),
      delay_days INTEGER DEFAULT 1,
      conditions JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Sequence prospects table (PostgreSQL)
    CREATE TABLE IF NOT EXISTS sequence_prospects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
      prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'active',
      current_step INTEGER DEFAULT 1,
      next_action_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Events table (PostgreSQL)
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
      kind VARCHAR(100) NOT NULL,
      payload_json JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
    CREATE INDEX IF NOT EXISTS idx_prospects_campaign_id ON prospects(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_messages_prospect_id ON messages(prospect_id);
    CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
  `;

    if (useSqlite) {
        // Execute SQLite schema step by step
        const statements = basicSchema.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
            if (statement.trim()) {
                await query(statement.trim());
            }
        }
    } else {
        await query(basicSchema);
    }
};

// Close database connection
const closeConnection = async () => {
    try {
        if (useSqlite) {
            db.close();
            console.log('✅ SQLite database connection closed');
        } else {
            await pool.end();
            console.log('✅ PostgreSQL database connection closed');
        }
    } catch (error) {
        console.error('❌ Error closing database connection:', error.message);
    }
};

module.exports = {
    pool,
    db,
    query,
    transaction,
    testConnection,
    initializeDatabase,
    closeConnection,
    useSqlite
};
