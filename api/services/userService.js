const bcrypt = require('bcryptjs');
const db = require('../database');

class UserService {
    async createUser(userData) {
        const { email, password, firstName, lastName, company, position } = userData;

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Combine first and last name for full_name field
        const fullName = `${firstName} ${lastName}`;

        try {
            const result = await db.query(
                `INSERT INTO users (email, password_hash, full_name) 
                 VALUES ($1, $2, $3) 
                 RETURNING id, email, full_name, created_at`,
                [email, passwordHash, fullName]
            );

            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('User with this email already exists');
            }
            throw error;
        }
    }

    async findUserByEmail(email) {
        const result = await db.query(
            'SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = $1',
            [email]
        );

        return result.rows[0] || null;
    }

    async findUserById(id) {
        const result = await db.query(
            'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
            [id]
        );

        return result.rows[0] || null;
    }

    async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    async updateUser(id, updateData) {
        const { firstName, lastName } = updateData;
        const fullName = `${firstName} ${lastName}`;

        const result = await db.query(
            `UPDATE users 
             SET full_name = COALESCE($2, full_name),
                 updated_at = NOW()
             WHERE id = $1 
             RETURNING id, email, full_name, updated_at`,
            [id, fullName]
        );

        return result.rows[0] || null;
    }

    async deleteUser(id) {
        const result = await db.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );

        return result.rows.length > 0;
    }

    // Helper method to format user data for API responses
    formatUser(user) {
        if (!user) return null;

        // Split full_name into first and last name for frontend compatibility
        const nameParts = (user.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        return {
            id: user.id,
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            company: user.company || '',
            position: user.position || '',
            createdAt: user.created_at
        };
    }

    // Demo user for testing - first try to get from database, fallback to mock
    async getDemoUser() {
        try {
            const demoUser = await this.findUserByEmail('demo@linkedin.com');
            if (demoUser) {
                return this.formatUser(demoUser);
            }
        } catch (error) {
            console.log('Database not available, using fallback demo user');
        }

        // Fallback for when database is not available
        return {
            id: 'demo-user-id',
            email: 'demo@linkedin.com',
            firstName: 'Demo',
            lastName: 'User',
            company: 'LinkedIn Automation Co.',
            position: 'Sales Director',
            createdAt: new Date().toISOString()
        };
    }

    // Initialize database and create demo user if needed
    async initializeDatabase() {
        try {
            // Test database connection
            const testQuery = 'SELECT NOW() as current_time';
            const result = await db.query(testQuery);
            console.log('✅ Database connected successfully at:', result.rows[0].current_time);

            // Create demo user if it doesn't exist
            const demoUser = await this.findUserByEmail('demo@linkedin.com');
            if (!demoUser) {
                console.log('Creating demo user...');
                await this.createUser({
                    email: 'demo@linkedin.com',
                    password: 'demo123',
                    firstName: 'Demo',
                    lastName: 'User'
                });
                console.log('✅ Demo user created successfully');
            } else {
                console.log('✅ Demo user already exists');
            }

            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            console.error('Using fallback mode without persistent storage');
            return false;
        }
    }
}

module.exports = new UserService();
