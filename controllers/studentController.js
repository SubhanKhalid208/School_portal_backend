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
            const client = await pool.connect(); // Transaction ke liye client use karein
            try {
                await client.query('BEGIN'); // Start Transaction
                let successCount = 0;
                
                for (const row of results) {
                    let { email, dob, name } = row; 

                    if (!email) continue;

                    const cleanEmail = email.trim().toLowerCase();
                    
                    const userExists = await client.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
                    
                    if (userExists.rows.length === 0) {
                        // 1. Insert User (Added default password to prevent NOT NULL errors)
                        const insertRes = await client.query(
                            'INSERT INTO users (name, email, role, is_approved, dob, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                            [name || 'Student', cleanEmail, 'student', true, dob || null, 'student123']
                        );
                        
                        const newUserId = insertRes.rows[0].id;

                        // 2. ✅ Auto-enrollment (Adding this to match your route logic)
                        await client.query(
                            'INSERT INTO student_courses (student_id, course_id) SELECT $1, id FROM courses ON CONFLICT DO NOTHING',
                            [newUserId]
                        );

                        // 3. Trigger Email (Non-blocking)
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
                
                await client.query('COMMIT'); // Save Changes

                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                res.json({ 
                    success: true, 
                    message: `Lahore Portal: ${successCount} naye students add huay aur enrollment mukammal hui!`,
                    totalProcessed: results.length
                });

            } catch (err) {
                await client.query('ROLLBACK'); // Error pe rollback karein
                console.error("Bulk Upload Error:", err);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                res.status(500).json({ error: "Database error during bulk upload: " + err.message });
            } finally {
                client.release();
            }
        });
};