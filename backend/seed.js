const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Application = require('./models/Application');
const Department = require('./models/Department');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/app-catalogue';

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Application.deleteMany({});
        await Department.deleteMany({});
        console.log('Cleared existing data');

        // Create departments
        const departments = await Department.insertMany([
            { name: 'CREATIVE' },
            { name: 'FINANCE' },
            { name: 'ENGINEERING' },
            { name: 'MARKETING' },
            { name: 'HR' }
        ]);
        console.log(`Created ${departments.length} departments`);

        // Create users
        const hashedPassword = await bcrypt.hash('password123', 10);

        const users = await User.insertMany([
            { name: 'Peter Admin', email: 'peter@company.com', password: hashedPassword, role: 'Admin', department: 'CREATIVE' },
            { name: 'Jane Manager', email: 'jane@company.com', password: hashedPassword, role: 'User', department: 'CREATIVE' },
            { name: 'Alex Analyst', email: 'alex@company.com', password: hashedPassword, role: 'User', department: 'FINANCE' }
        ]);
        console.log(`Created ${users.length} users`);

        const [peter, jane, alex] = users;
        const now = new Date();

        // Helper to create dates
        const daysFromNow = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        const applications = await Application.insertMany([
            // CREATIVE department apps
            { appName: 'Creative Suite', country: 'Global', department: 'CREATIVE', stakeholder: 'John Doe', cost: 10000, currency: 'USD', paymentMethod: 'RTGS', billingFrequency: 'Annually', licenseTotal: 50, licenseUsed: 45, purchaseDate: daysAgo(365), expiryDate: daysFromNow(2), status: 'Active', createdBy: peter._id },
            { appName: 'Slack', country: 'Global', department: 'CREATIVE', stakeholder: 'John Doe', cost: 10000, currency: 'USD', paymentMethod: 'RTGS', billingFrequency: 'Annually', licenseTotal: 50, licenseUsed: 45, purchaseDate: daysAgo(365), expiryDate: daysFromNow(90), status: 'Active', createdBy: peter._id },
            { appName: 'Jira', country: 'Global', department: 'CREATIVE', stakeholder: 'John Doe', cost: 10000, currency: 'USD', paymentMethod: 'RTGS', billingFrequency: 'Annually', licenseTotal: 50, licenseUsed: 45, purchaseDate: daysAgo(365), expiryDate: daysFromNow(120), status: 'Active', createdBy: peter._id },
            { appName: 'Figma', country: 'Global', department: 'CREATIVE', stakeholder: 'Sarah Kim', cost: 5000, currency: 'USD', paymentMethod: 'Credit Card', billingFrequency: 'Annually', licenseTotal: 30, licenseUsed: 28, purchaseDate: daysAgo(200), expiryDate: daysFromNow(165), status: 'Active', createdBy: jane._id },
            { appName: 'Canva Pro', country: 'Kenya', department: 'CREATIVE', stakeholder: 'Sarah Kim', cost: 150, currency: 'USD', paymentMethod: 'Credit Card', billingFrequency: 'Monthly', licenseTotal: 20, licenseUsed: 15, purchaseDate: daysAgo(60), expiryDate: daysFromNow(30), status: 'Active', createdBy: jane._id },
            { appName: 'Adobe Premiere', country: 'Global', department: 'CREATIVE', stakeholder: 'John Doe', cost: 3000, currency: 'USD', paymentMethod: 'Wire Transfer', billingFrequency: 'Annually', licenseTotal: 10, licenseUsed: 8, purchaseDate: daysAgo(300), expiryDate: daysFromNow(65), status: 'Active', createdBy: peter._id },

            // FINANCE department apps
            { appName: 'SAP ERP', country: 'Global', department: 'FINANCE', stakeholder: 'Alice Mwangi', cost: 50000, currency: 'USD', paymentMethod: 'RTGS', billingFrequency: 'Annually', licenseTotal: 100, licenseUsed: 85, purchaseDate: daysAgo(365), expiryDate: daysFromNow(15), status: 'Active', createdBy: peter._id },
            { appName: 'QuickBooks', country: 'Kenya', department: 'FINANCE', stakeholder: 'Alice Mwangi', cost: 800, currency: 'USD', paymentMethod: 'M-Pesa', billingFrequency: 'Monthly', licenseTotal: 25, licenseUsed: 20, purchaseDate: daysAgo(180), expiryDate: daysFromNow(180), status: 'Active', createdBy: alex._id },
            { appName: 'Tableau', country: 'Global', department: 'FINANCE', stakeholder: 'Bob Otieno', cost: 12000, currency: 'USD', paymentMethod: 'Wire Transfer', billingFrequency: 'Annually', licenseTotal: 40, licenseUsed: 35, purchaseDate: daysAgo(280), expiryDate: daysFromNow(85), status: 'Active', createdBy: alex._id },
            { appName: 'Xero', country: 'Kenya', department: 'FINANCE', stakeholder: 'Bob Otieno', cost: 200, currency: 'USD', paymentMethod: 'Credit Card', billingFrequency: 'Monthly', licenseTotal: 15, licenseUsed: 12, purchaseDate: daysAgo(90), expiryDate: daysFromNow(270), status: 'Active', createdBy: alex._id },

            // ENGINEERING department apps
            { appName: 'GitHub Enterprise', country: 'Global', department: 'ENGINEERING', stakeholder: 'James Kariuki', cost: 25000, currency: 'USD', paymentMethod: 'RTGS', billingFrequency: 'Annually', licenseTotal: 80, licenseUsed: 72, purchaseDate: daysAgo(365), expiryDate: daysFromNow(50), status: 'Active', createdBy: peter._id },
            { appName: 'AWS Console', country: 'Global', department: 'ENGINEERING', stakeholder: 'James Kariuki', cost: 5000, currency: 'USD', paymentMethod: 'Credit Card', billingFrequency: 'Monthly', licenseTotal: 60, licenseUsed: 55, purchaseDate: daysAgo(400), expiryDate: daysFromNow(200), status: 'Active', createdBy: peter._id },
        ]);
        console.log(`Created ${applications.length} applications`);

        console.log('\n--- Seed Complete ---');
        console.log('Mock Users:');
        console.log('  peter@company.com / password123 (Admin — sees ALL apps)');
        console.log('  jane@company.com  / password123 (User  — sees CREATIVE apps)');
        console.log('  alex@company.com  / password123 (User  — sees FINANCE apps)');

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err);
        await mongoose.disconnect();
        process.exit(1);
    }
}

seed();
