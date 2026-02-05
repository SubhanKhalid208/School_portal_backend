import fs from 'fs';
import csv from 'csv-parser';
import pool from '../config/db.js';
import { sendWelcomeEmail } from './authController.js'; 

export const bulkUploadStudents = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Please upload a CSV file!" });
    }

    const results = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                let successCount = 0;
                
                for (const row of results) {
                    let { email, dob, name } = row; 

                    if (!email) continue;

                    const cleanEmail = email.trim().toLowerCase();
                    
                    const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
                    
                    if (userExists.rows.length === 0) {
                        const insertRes = await pool.query(
                            'INSERT INTO users (name, email, role, is_approved, dob) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                            [name || 'Student', cleanEmail, 'student', true, dob]
                        );
                        
                        const newUserId = insertRes.rows[0].id;

                        try {
                            await sendWelcomeEmail(cleanEmail, newUserId);
                            console.log(`✅ Welcome Email triggered for: ${cleanEmail}`);
                        } catch (emailErr) {
                            console.error(`❌ Email failed for ${cleanEmail}:`, emailErr.message);
                        }

                        successCount++;
                    } else {
                        console.log(`ℹ️ User already exists: ${cleanEmail}`);
                    }
                }
                
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                res.json({ 
                    success: true, 
                    message: `${successCount} naye students add huay aur emails bhej di gayi hain!`,
                    totalProcessed: results.length
                });

            } catch (err) {
                console.error("Bulk Upload Error:", err);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                res.status(500).json({ error: "Database error during bulk upload" });
            }
        });
};