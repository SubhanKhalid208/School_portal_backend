import pool from '../config/db.js';
import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// --- 1. Get Users (Wahi purana logic) ---
export const getUsers = async (req, res) => {
    const { search } = req.query;
    try {
        let queryText = "SELECT id, name, email, role, is_approved, profile_pic FROM users";
        let queryParams = [];

        if (search) {
            queryText += " WHERE (email ILIKE $1 OR name ILIKE $1)"; 
            queryParams.push(`%${search}%`);
        }

        queryText += " ORDER BY id DESC";
        const usersRes = await pool.query(queryText, queryParams);
        res.json(usersRes.rows);
    } catch (err) {
        res.status(500).json({ error: "Backend search error: " + err.message });
    }
};

// --- 2. Login (Optimized & Clean) ---
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = userRes.rows[0];

        if (!user) return res.status(401).json({ error: "User nahi mila!" });
        
        // Agar password database mein nahi hai
        if (!user.password) return res.status(401).json({ error: "Password set nahi kiya gaya!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Password ghalat hai!" });

        // Approval check
        if (!user.is_approved) return res.status(403).json({ error: "Aapka account abhi pending hai!" });

        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET || 'lahore_portal_secret', 
            { expiresIn: '1d' }
        );

        // Returning data for frontend
        return res.status(200).json({ 
            success: true,
            message: "Login Successful!",
            token, 
            role: user.role,
            userId: user.id,
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });

    } catch (err) {
        console.error("Login Controller Error:", err.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// --- 3. Signup (Naya Direct Password Logic) ---
export const signup = async (req, res) => {
    const { email, dob, role, name, password } = req.body; // ✅ Frontend se password pakra
    
    try {
        if (!email || !password || !name) {
            return res.status(400).json({ error: "Name, Email aur Password sab zaroori hain!" });
        }

        const cleanEmail = email.trim().toLowerCase();
        
        // Check if user already exists
        const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "Yeh email pehle se register hai!" }); 
        }

        // ✅ Password ko hash karna registration ke waqt hi
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ✅ User ko insert karna hashed password ke sath
        const newUser = await pool.query(
            `INSERT INTO users (name, email, role, is_approved, dob, password) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, name, email, role`,
            [
                name.trim(), 
                cleanEmail, 
                role || 'student', 
                true, // Auto-approve for now
                dob || null, 
                hashedPassword // ✅ Password ab direct save ho raha hai
            ]
        );

        const newUserId = newUser.rows[0].id;
        console.log(`✅ New user registered with password: ${cleanEmail}`);

        res.status(201).json({ 
            success: true, 
            message: "Registration successful! Ab aap login kar sakte hain.",
            userId: newUserId
        });

    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ error: "Database error: " + err.message });
    }
};

// --- 4. Password Reset (Sirf bhoolne ki surat mein kaam ayega) ---
export const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lahore_portal_secret');
        const userId = decoded.id;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query( 
            "UPDATE users SET password = $1 WHERE id = $2",
            [hashedPassword, userId]
        );

        res.json({ success: true, message: "Password updated successfully!" });
    } catch (err) {
        res.status(400).json({ error: "Invalid or expired token!" });
    }
};