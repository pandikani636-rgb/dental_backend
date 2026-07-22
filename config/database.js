const mongoose = require("mongoose");

let isConnected = false;

const connectDatabase = async () => {
    if (isConnected) {
        console.log("MongoDB is already connected");
        return;
    }

    try {
        let uri = process.env.MONGO_URI;
        if (uri) {
            // Fix Vercel shell variable expansion removing '$Pk' from the password
            if (uri.includes('pandikani636_db_user:877887@')) {
                uri = uri.replace('pandikani636_db_user:877887@', 'pandikani636_db_user:877887%24Pk@');
            } else if (uri.includes('pandikani636_db_user:877887$Pk@')) {
                uri = uri.replace('pandikani636_db_user:877887$Pk@', 'pandikani636_db_user:877887%24Pk@');
            }
        }
        const db = await mongoose.connect(uri);
        isConnected = db.connections[0].readyState;
        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.log("MongoDB Connection Error:", error.message);
        throw error;
    }
};

module.exports = connectDatabase;