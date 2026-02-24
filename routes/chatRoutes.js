import express from 'express';
const router = express.Router();
import db from '../db.js'; // ✅ Muhammad Ahmed, check karein aapka db connection kahan hai

// 📍 Purane messages fetch karne ka rasta
router.get('/history/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const result = await db.query(
            "SELECT * FROM messages WHERE room = $1 ORDER BY created_at ASC", 
            [roomId]
        );
        
        // Frontend ki format ke mutabiq data bhejna
        const formattedMessages = result.rows.map(msg => ({
            room: msg.room,
            senderId: msg.sender_id,
            senderName: msg.sender_name,
            message: msg.message,
            time: msg.time
        }));

        res.json(formattedMessages);
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ error: "Chat load nahi ho saki" });
    }
});

export default router;