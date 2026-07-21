const Contactus = require("../models/ContactusModel");
const Counter = require("../models/counterModel");
const asyncErrorHandler = require("../middlewares/asyncErrorHandler");
const ErrorHandler = require("../utils/errorHandler");

// Create Contact → Public
exports.createContact = asyncErrorHandler(async (req, res, next) => {
    let { name, email, phone, message } = req.body;

    // If user is logged in, prefer their stored details when fields are missing
    if (req.user) {
        if (!name) name = req.user.name;
        if (!email) email = req.user.email;
        if (!phone && req.user.phone) phone = req.user.phone;
    }

    if (!name || !email || !phone || !message) {
        return next(new ErrorHandler("All fields are required", 400));
    }

    // Check if table is empty → reset auto sequence
    const totalContacts = await Contactus.countDocuments();
    if (totalContacts === 0) {
        await Counter.findByIdAndUpdate(
            { _id: "contactId" },
            { seq: 0 },
            { upsert: true }
        );
    }

    const contactPayload = { name, email, phone, message };
    if (req.user) contactPayload.user = req.user._id;

    const contact = await Contactus.create(contactPayload);

    res.status(201).json({
        success: true,
        contact,
        message: "Thank you for contacting us! Our team will reach out soon."
    });
});

// Get All Contacts → Admin
exports.getAllContacts = asyncErrorHandler(async (req, res, next) => {
    const contacts = await Contactus.find().populate('user', 'name email phone').sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        total: contacts.length,
        contacts
    });
});

// Get Single Contact → Admin
exports.getContactDetails = asyncErrorHandler(async (req, res, next) => {
    const contact = await Contactus.findById(req.params.id);

    if (!contact) {
        return next(new ErrorHandler("Contact not found", 404));
    }

    res.status(200).json({
        success: true,
        contact
    });
});

// Delete Contact → Admin
exports.deleteContact = asyncErrorHandler(async (req, res, next) => {
    const contact = await Contactus.findById(req.params.id);

    if (!contact) {
        return next(new ErrorHandler("Contact not found", 404));
    }

    await contact.remove();

    res.status(200).json({
        success: true,
        message: "Contact deleted successfully"
    });
});
