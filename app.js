const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const errorMiddleware = require("./middlewares/error");

const app = express();

// Load Environment Variables
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

// Database Connection Middleware
const connectDatabase = require("./config/database");
let dbPromise = null;
app.use(async (req, res, next) => {
    if (!dbPromise) {
        dbPromise = connectDatabase();
    }
    try {
        await dbPromise;
        next();
    } catch (err) {
        dbPromise = null;
        next(err);
    }
});

// ======================
// CORS Configuration
// ======================
app.use(
    cors({
        origin: (origin, callback) => {
            const allowedOrigins = process.env.FRONTEND_URL 
                ? process.env.FRONTEND_URL.split(",").map(url => url.trim()) 
                : [];
            
            allowedOrigins.push("http://localhost:3000");
            allowedOrigins.push("http://localhost:3001");
            allowedOrigins.push("http://localhost:5173");

            if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);

// ======================
// Middlewares
// ======================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// ======================
// Routes
// ======================
const user = require("./routes/userRoute");
const product = require("./routes/productRoute");
const order = require("./routes/orderRoute");
const payment = require("./routes/paymentRoute");
const categoryRoutes = require("./routes/categoryRoute");
const contactusRoutes = require("./routes/contactusRoute");
const roleRoutes = require("./routes/roleRoute");
const cart = require("./routes/cartRoute");
const banner = require("./routes/bannerRoute");
const location = require("./routes/locationRoute");
const offer = require("./routes/offerRoute");
const homeOffer = require("./routes/homeOfferRoute");
const cancelOrder = require("./routes/cancelOrderRoute");

// API Routes
app.use("/api/v1", user);
app.use("/api/v1", product);
app.use("/api/v1", order);
app.use("/api/v1", payment);
app.use("/api/v1", categoryRoutes);
app.use("/api/v1", contactusRoutes);
app.use("/api/v1", roleRoutes);
app.use("/api/v1/cart", cart);
app.use("/api/v1", banner);
app.use("/api/v1", location);
app.use("/api/v1", offer);
app.use("/api/v1", homeOffer);
app.use("/api/v1", cancelOrder);

// ======================
// Static Files
// ======================
app.use(
    "/admin/product/uploads",
    express.static(path.join(__dirname, "uploads"))
);

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// ======================
// Health Check
// ======================
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend API is Running 🚀",
    });
});

// ======================
// Error Middleware
// ======================
app.use(errorMiddleware);

module.exports = app;