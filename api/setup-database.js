#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const database = require('./database');

async function setupDatabase() {
    console.log('🗃️  Setting up LinkedIn Automation Database...\n');

    try {
        // Read the schema file
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('📋 Executing database schema...');
        await database.query(schema);
        console.log('✅ Database schema created successfully!\n');

        // Create demo user
        console.log('👤 Creating demo user...');
        const userService = require('./services/userService');
        await userService.initializeDatabase();

        console.log('\n🎉 Database setup complete!');
        console.log('\nDemo credentials:');
        console.log('Email: demo@linkedin.com');
        console.log('Password: demo123');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Make sure your DATABASE_URL is correctly set in .env');
        console.error('2. Ensure your Supabase project is active');
        console.error('3. Check your database password is correct');
        process.exit(1);
    } finally {
        await database.close();
    }
}

// Run if called directly
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;
