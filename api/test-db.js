require('dotenv').config({ path: '../.env' });
const db = require('./database');

async function checkDatabase() {
    try {
        // Check what tables exist
        const tablesResult = await db.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        console.log('Tables:', tablesResult.rows.map(row => row.table_name));

        // Check users table columns if it exists
        const columnsResult = await db.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
        );
        console.log('Users table columns:', columnsResult.rows.map(row => row.column_name));

    } catch (error) {
        console.error('Database error:', error.message);
    } finally {
        await db.close();
    }
}

checkDatabase();
