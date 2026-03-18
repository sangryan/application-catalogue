const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    appName: { type: String, required: true },
    country: { type: String, default: 'Global' },
    department: { type: String, required: true },
    stakeholder: { type: String, required: true },
    cost: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'EUR', 'KES'], default: 'USD' },
    paymentMethod: { type: String, enum: ['RTGS', 'Credit Card', 'Wire Transfer', 'M-Pesa'], default: 'RTGS' },
    billingFrequency: { type: String, enum: ['Monthly', 'Annually'], default: 'Annually' },
    licenseTotal: { type: Number, default: 50 },
    licenseUsed: { type: Number, default: 0 },
    purchaseDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Disabled'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
