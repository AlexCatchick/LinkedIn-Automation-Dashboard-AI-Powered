const bcrypt = require('bcryptjs');
const db = require('../database');

class User {
    static async create({ email, password, firstName, lastName, company, position }) {
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert user into database
        const query = `
            INSERT INTO users (email, password_hash, first_name, last_name, company, position)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, first_name, last_name, company, position, created_at
        `;

        const values = [email, passwordHash, firstName, lastName, company, position];

        try {
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { // unique violation
                throw new Error('User with this email already exists');
            }
            throw error;
        }
    }

    static async findByEmail(email) {
        const query = `
            SELECT id, email, password_hash, first_name, last_name, company, position, created_at
            FROM users 
            WHERE email = $1
        `;

        const result = await db.query(query, [email]);
        return result.rows[0] || null;
    }

    static async findById(id) {
        const query = `
            SELECT id, email, first_name, last_name, company, position, created_at
            FROM users 
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }

    static async validatePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    static async createDemoUser() {
        // Check if demo user already exists
        const existingUser = await this.findByEmail('demo@example.com');
        if (existingUser) {
            return existingUser;
        }

        // Create demo user
        return await this.create({
            email: 'demo@example.com',
            password: 'demo123',
            firstName: 'Demo',
            lastName: 'User',
            company: 'Demo Company',
            position: 'Demo Position'
        });
    }

    static async getAll() {
        const query = `
            SELECT id, email, first_name, last_name, company, position, created_at
            FROM users 
            ORDER BY created_at DESC
        `;

        const result = await db.query(query);
        return result.rows;
    }
}

module.exports = User;
