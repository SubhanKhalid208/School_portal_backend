import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // Header se token nikalna (Bearer token)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(403).json({ 
            success: false, 
            message: "Access Denied: Aapke paas token nahi hai!" 
        });
    }

    try {
        // Aapki .env wali key yahan use hogi
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; 
        next(); // Agay janay ki ijazat hai
    } catch (err) {
        res.status(401).json({ 
            success: false, 
            message: "Token galat hai ya expire ho chuka hai!" 
        });
    }
};