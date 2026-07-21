const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const ensureDirectoriesExist = () => {
    const directories = [
        'uploads/images',
        'uploads/videos',
        'uploads/banners/images',
        'uploads/banners/videos',
        'uploads/products/images',
        'uploads/products/videos'
    ];
    
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

// Create directories on startup
ensureDirectoriesExist();

// Common storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = "uploads/";
        
        // Determine destination based on field name
        if (file.fieldname === 'image' || file.fieldname === 'images') {
            uploadPath += "products/images/";
        } else if (file.fieldname === 'video' || file.fieldname === 'videos') {
            uploadPath += "products/videos/";
        } else if (file.fieldname === 'bannerImage') {
            uploadPath += "banners/images/";
        } else if (file.fieldname === 'bannerVideo') {
            uploadPath += "banners/videos/";
        } else if (file.fieldname === 'media') {
            // For backward compatibility
            uploadPath += "banners/";
        } else if (file.fieldname === 'productImages') {
            uploadPath += "products/images/";
        } else if (file.fieldname === 'productVideo') {
            uploadPath += "products/videos/";
        } else {
            uploadPath += "others/";
        }
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const extension = path.extname(file.originalname);
        const filename = file.fieldname + "-" + uniqueSuffix + extension;
        cb(null, filename);
    },
});

// Main upload instance
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB default
});

// Create middleware functions
const uploadMiddleware = {
    // Single file upload (for backward compatibility)
    single: (fieldName) => upload.single(fieldName),
    
    // Multiple files upload
    array: (fieldName, maxCount) => upload.array(fieldName, maxCount),
    
    // Multiple fields with multiple files
    fields: (fields) => upload.fields(fields),
    
    // Specific middleware for banners (image + video)
    bannerFiles: upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'video', maxCount: 1 }
    ]),
    
    // Specific middleware for products (up to 4 images + video)
    productFiles: upload.fields([
        { name: 'images', maxCount: 4 },
        { name: 'video', maxCount: 1 }
    ]),
    
    // Single image upload
    singleImage: upload.single('image'),
    
    // Single video upload
    singleVideo: upload.single('video'),
    
    // For backward compatibility
    singleMedia: upload.single('media')
};

module.exports = uploadMiddleware;