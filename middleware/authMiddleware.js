import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ error: "Access Denied! Token nahi mila." });
    }

    try {

        const verified = jwt.verify(token, process.env.JWT_SECRET || 'lahore_portal_secret');
        req.user = verified; 
        next();
    } catch (err) {
        res.status(401).json({ error: "Ghalat ya Expired Token!" });
    }
};