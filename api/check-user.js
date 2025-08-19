require('dotenv').config({ path: '../.env' });
const db = require('./database');

async function checkUser() {
    try {
        const result = await db.query('SELECT email, full_name FROM users WHERE email = $1', ['1nt22cs023.alex@nmit.ac.in']);

        if (result.rows.length > 0) {
            console.log('✅ User found:', result.rows[0]);
        } else {
            console.log('❌ User not found');

            // Let's see all users
            const allUsers = await db.query('SELECT email, full_name FROM users ORDER BY created_at');
            console.log('📋 All users in database:');
            allUsers.rows.forEach((user, index) => {
                console.log(`${index + 1}. ${user.email} - ${user.full_name}`);
            });
        }
    } catch (error) {
        console.error('Database error:', error.message);
    } finally {
        await db.close();
    }
}

checkUser();
