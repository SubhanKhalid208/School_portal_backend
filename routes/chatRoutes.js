import express from 'express';
const router = express.Router();
import db from '../db.js'; 

router.get('/chat-history/:roomId', async (req, res) => {
    try {
        let { roomId } = req.params;

        // ✅ MUHAMMAD AHMED: Logic for extracting Student ID while keeping the original roomId intact
        let studentId = roomId;
        if (roomId.includes('_')) {
            // Agar 'private_32' hai toh '32' nikle, agar '31_32' hai toh student (jo aksar bari ID hoti hai) nikle
            // Hum .pop() use kar rahe hain taake akhri hissa mil jaye
            studentId = roomId.split('_').pop();
        }

        // ✅ Database Query: Muhammad Ahmed, humne tamam conditions ko sath rakha hai
        // 1. room_id = $1 (Exact match: '31_32')
        // 2. room_id = $2 (Individual ID: '32')
        // 3. room_id LIKE (Format checks: '%_32' or '32_%')
        // 4. receiver_id ya sender_id match (Fallback safety)
        const result = await db.query(
            `SELECT * FROM messages 
             WHERE room_id = $1 
             OR room_id = $2
             OR room_id LIKE $3 
             OR room_id LIKE $4 
             OR receiver_id = $5
             OR sender_id = $5
             ORDER BY created_at ASC`, 
            [
                roomId,              // $1: Original (e.g., '31_32' or 'private_32')
                studentId,           // $2: Extracted ID (e.g., '32')
                `%_${studentId}`,    // $3: For any underscore format ending in ID
                `${studentId}_%`,    // $4: For any underscore format starting with ID
                studentId            // $5: For direct column matches
            ]
        );
        
        // Data ko frontend ke format ke mutabiq map karna
        const formattedMessages = result.rows.map(msg => ({
            room: msg.room_id, 
            senderId: msg.sender_id,
            senderName: msg.sender_name || "User", 
            message: msg.message_text, 
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        res.json({
            success: true,
            data: formattedMessages
        });

    } catch (err) {
        console.error("❌ Fetch Error:", err);
        res.status(500).json({ 
            success: false, 
            error: "Chat load nahi ho saki",
            details: err.message 
        });
    }
});

export default router;