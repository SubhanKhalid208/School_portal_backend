import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Disk Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Unique name taake files aapas mein mix na hon
        const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Muhammad Ahmed: Limit 10MB kar di hai taake bari PDF bhi aa jaye
    fileFilter: (req, file, cb) => {
        // ✅ Ab Images ke sath PDF aur Word docs bhi allowed hain
        const allowedMimes = [
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp',
            'application/pdf', // PDF ke liye
            'application/msword', // .doc ke liye
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx ke liye
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            // Muhammad Ahmed: Ab ye error tabhi aayega jab koi bilkul hi ajeeb file hogi
            cb(new Error('Only Images, PDFs, and Word documents are allowed!'), false);
        }
    }
});

export { upload };