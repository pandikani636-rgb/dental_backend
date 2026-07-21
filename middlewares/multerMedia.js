const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;

// Use memory storage to avoid local filesystem writes
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|ogg|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error("Only images and videos are allowed"));
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for videos
    fileFilter
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

// Middleware wrapper generator
const wrapMiddleware = (multerMiddleware) => {
    return (req, res, next) => {
        multerMiddleware(req, res, async (err) => {
            if (err) return next(err);
            try {
                if (req.file) {
                    let folder = "others";
                    if (req.file.fieldname === 'avatar') {
                        folder = "avatars";
                    } else if (req.file.fieldname === 'image') {
                        folder = "offers";
                    }
                    await uploadFileToCloudinary(req.file, folder);
                }
                next();
            } catch (uploadErr) {
                console.error("Cloudinary Upload Error:", uploadErr);
                next(uploadErr);
            }
        });
    };
};

const uploadMedia = {
    single: (fieldName) => wrapMiddleware(upload.single(fieldName)),
    array: (fieldName, maxCount) => wrapMiddleware(upload.array(fieldName, maxCount)),
    fields: (fields) => wrapMiddleware(upload.fields(fields))
};

module.exports = uploadMedia;
