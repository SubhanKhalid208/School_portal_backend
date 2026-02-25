import express from 'express';
const router = express.Router();
import db from '../db.js'; 

// ✅ MUHAMMAD AHMED: Messages ko read mark karne wali API
router.put('/mark-read/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        // Teacher ki ID hum aksar middleware se lete hain, lekin yahan logic simple rakha hai
        // Ye query un tamam messages ko true kar degi jo is student ne bheje hain
        await db.query(
            "UPDATE messages SET is_read = true WHERE sender_id = $1 AND is_read = false",
            [studentId]
        );
        res.json({ success: true, message: "Messages marked as read" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/chat-history/:roomId', async (req, res) => {
    try {
        let { roomId } = req.params;

        // ✅ MUHAMMAD AHMED: Logic for extracting Student ID while keeping the original roomId intact
        let studentId = roomId;
        if (roomId.includes('_')) {
            // Agar 'private_32' hai toh '32' nikle, agar '31_32' hai toh student (jo aksar bari ID hoti hai) nikle
            studentId = roomId.split('_').pop();
        }

        // ✅ Database Query: Muhammad Ahmed, humne tamam conditions ko sath rakha hai
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
            // Muhammad Ahmed: File handling agar db mein column ho (safety check)
            fileUrl: msg.file_url || null,
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