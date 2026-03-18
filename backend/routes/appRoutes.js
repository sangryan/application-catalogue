const express = require('express');
const Application = require('../models/Application');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/applications — list with role-based filtering
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, country, department, billingFrequency, paymentMethod, includeDisabled } = req.query;
        const filter = {};

        // Role-based scoping: non-admin users only see their department
        if (req.user.role !== 'Admin') {
            filter.department = req.user.department;
        }

        // Optional filters
        if (country) filter.country = country;
        if (department && req.user.role === 'Admin') filter.department = department;
        if (billingFrequency) filter.billingFrequency = billingFrequency;
        if (paymentMethod) filter.paymentMethod = paymentMethod;
        if (!includeDisabled || includeDisabled === 'false') filter.status = 'Active';
        if (search) filter.appName = { $regex: search, $options: 'i' };

        const applications = await Application.find(filter).sort({ appName: 1 });
        res.json({ success: true, data: applications });
    } catch (err) {
        console.error('Applications error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/dashboard/stats — aggregated dashboard data
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const filter = { status: 'Active' };
        if (req.user.role !== 'Admin') {
            filter.department = req.user.department;
        }

        const apps = await Application.find(filter);

        const totalActive = apps.length;
        const monthlyRecurring = apps.filter(a => a.billingFrequency === 'Monthly').reduce((sum, a) => sum + a.cost, 0);
        const annualRecurring = apps.filter(a => a.billingFrequency === 'Annually').reduce((sum, a) => sum + a.cost, 0);
        const monthlyCount = apps.filter(a => a.billingFrequency === 'Monthly').length;
        const annualCount = apps.filter(a => a.billingFrequency === 'Annually').length;

        // License usage
        const totalLicenses = apps.reduce((sum, a) => sum + a.licenseTotal, 0);
        const usedLicenses = apps.reduce((sum, a) => sum + a.licenseUsed, 0);

        // Expiring soon (within 30 days)
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiringSoon = apps.filter(a => a.expiryDate <= thirtyDaysFromNow && a.expiryDate >= now);

        // Closest expiry
        let closestExpiry = null;
        let daysToExpiry = null;
        if (expiringSoon.length > 0) {
            const sorted = expiringSoon.sort((a, b) => a.expiryDate - b.expiryDate);
            closestExpiry = sorted[0];
            daysToExpiry = Math.ceil((closestExpiry.expiryDate - now) / (1000 * 60 * 60 * 24));
        }

        // Departments breakdown
        const departments = [...new Set(apps.map(a => a.department))];
        // Countries breakdown
        const countries = [...new Set(apps.map(a => a.country))];

        res.json({
            success: true,
            data: {
                totalActive,
                monthlyRecurring,
                annualRecurring,
                monthlyCount,
                annualCount,
                totalLicenses,
                usedLicenses,
                licensePercentage: totalLicenses > 0 ? Math.round((usedLicenses / totalLicenses) * 100) : 0,
                expiringSoonCount: expiringSoon.length,
                daysToExpiry,
                closestExpiryApp: closestExpiry ? closestExpiry.appName : null,
                departments,
                countries
            }
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
