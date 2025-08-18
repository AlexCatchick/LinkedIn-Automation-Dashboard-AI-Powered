-- LinkedIn Automation Platform Database Schema
-- PostgreSQL Version

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    organization_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    intake_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Prospects table
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Sequences table
CREATE TABLE IF NOT EXISTS sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    prospect_filters JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sequence steps table
CREATE TABLE IF NOT EXISTS sequence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    subject VARCHAR(255),
    delay_days INTEGER DEFAULT 1,
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sequence prospects table
CREATE TABLE IF NOT EXISTS sequence_prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    current_step INTEGER DEFAULT 1,
    next_action_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
    kind VARCHAR(100) NOT NULL,
    payload_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_prospects_campaign_id ON prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_prospect_id ON messages(prospect_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_sequences_campaign_id ON sequences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_prospects_sequence_id ON sequence_prospects(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_prospects_prospect_id ON sequence_prospects(prospect_id);
CREATE INDEX IF NOT EXISTS idx_events_campaign_id ON events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Add foreign key constraint for organization_id in users table
ALTER TABLE users ADD CONSTRAINT fk_users_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON prospects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequences_updated_at BEFORE UPDATE ON sequences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequence_prospects_updated_at BEFORE UPDATE ON sequence_prospects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
