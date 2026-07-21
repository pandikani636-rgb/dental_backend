const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Use memory storage to avoid local filesystem writes
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Helper to upload a buffer directly to Cloudinary
const uploadFileToCloudinary = async (file, folder) => {
    if (!file || !file.buffer) return;
    
    let resource_type = "auto";
    if (file.mimetype && file.mimetype.startsWith("video/")) {
        resource_type = "video";
    }
    
    const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { 
                folder: folder, 
                resource_type: resource_type 
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        stream.end(file.buffer);
    });
    
    // Replace properties for controller compatibility
    file.path = result.secure_url;
    file.filename = result.public_id;
};

// Process uploads and send to Cloudinary
const processUploads = async (req) => {
    if (req.file) {
        let folder = "others";
        if (req.file.fieldname === 'image' || req.file.fieldname === 'media') {
            folder = "offers";
        }
        await uploadFileToCloudinary(req.file, folder);
    }
    
    if (req.files) {
        const uploadPromises = [];
        for (const fieldname in req.files) {
            const filesList = req.files[fieldname];
            let folder = "others";
            if (fieldname.includes("banner")) {
                folder = "banners";
            } else if (fieldname.includes("product") || fieldname === "images" || fieldname === "video") {
                folder = "products";
            }
            
            filesList.forEach(file => {
                uploadPromises.push(uploadFileToCloudinary(file, folder));
            });
        }
        await Promise.all(uploadPromises);
    }
};

// Middleware wrapper generator
const wrapMiddleware = (multerMiddleware) => {
    return (req, res, next) => {
        multerMiddleware(req, res, async (err) => {
            if (err) return next(err);
            try {
                await processUploads(req);
                next();
            } catch (uploadErr) {
                console.error("Cloudinary Upload Error:", uploadErr);
                next(uploadErr);
            }
        });
    };
};

const uploadMiddleware = {
    single: (fieldName) => wrapMiddleware(upload.single(fieldName)),
    array: (fieldName, maxCount) => wrapMiddleware(upload.array(fieldName, maxCount)),
    fields: (fields) => wrapMiddleware(upload.fields(fields)),
    bannerFiles: wrapMiddleware(upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'video', maxCount: 1 }
    ])),
    productFiles: wrapMiddleware(upload.fields([
        { name: 'images', maxCount: 4 },
        { name: 'video', maxCount: 1 }
    ])),
    singleImage: wrapMiddleware(upload.single('image')),
    singleVideo: wrapMiddleware(upload.single('video')),
    singleMedia: wrapMiddleware(upload.single('media'))
};

module.exports = uploadMiddleware;