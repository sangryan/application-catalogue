import React, { useState, useEffect, useMemo } from 'react';
import './Dashboard.css';
import logo from '../assets/logo.png';
import footerLogo from '../assets/footer-logo.png';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Exchange rates relative to USD
const EXCHANGE_RATES = { USD: 1, EUR: 0.92, KES: 129 };
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', KES: 'KSh' };

// Color palettes for donut segments
const DONUT_COLORS = [
    '#1a3e7c', '#28a745', '#fd7e14', '#dc3545', '#6f42c1',
    '#17a2b8', '#e83e8c', '#20c997', '#ffc107', '#6610f2'
];

function Dashboard({ user, token, onLogout }) {
    const [apps, setApps] = useState([]);
    const [currency, setCurrency] = useState('USD');
    const [donutView, setDonutView] = useState('Frequency');
    const [filters, setFilters] = useState({
        search: '',
        country: '',
        department: '',
        billingFrequency: '',
        paymentMethod: '',
        includeDisabled: false,
    });
    const [expiryFilter, setExpiryFilter] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch applications
    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.country) params.append('country', filters.country);
        if (filters.department) params.append('department', filters.department);
        if (filters.billingFrequency) params.append('billingFrequency', filters.billingFrequency);
        if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
        if (filters.includeDisabled) params.append('includeDisabled', 'true');

        fetch(`${API_BASE}/applications?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) setApps(data.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Apps fetch error:', err);
                setLoading(false);
            });
    }, [token, filters]);

    // Expiry filter (client-side for quick toggle)
    const displayedApps = useMemo(() => {
        if (!expiryFilter) return apps;
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return apps.filter(app => new Date(app.expiryDate) <= thirtyDays);
    }, [apps, expiryFilter]);

    // Extract unique departments for the filter dropdown
    const uniqueDepartments = useMemo(() => {
        return Array.from(new Set(apps.map(a => a.department).filter(Boolean))).sort();
    }, [apps]);

    // Currency conversion
    const convertCost = (costInUSD) => {
        return Math.round(costInUSD * EXCHANGE_RATES[currency]);
    };

    const currencySymbol = CURRENCY_SYMBOLS[currency];

    const formatCost = (cost) => {
        const converted = convertCost(cost);
        return `${currencySymbol}${converted.toLocaleString()}/yr`;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const getLicenseBarColor = (used, total) => {
        const pct = (used / total) * 100;
        if (pct >= 90) return '#dc3545';
        if (pct >= 70) return '#fd7e14';
        return '#28a745';
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Calculate fully dynamic stats based on currently displayed apps
    const dynamicStats = useMemo(() => {
        let monthlyCount = 0;
        let annualCount = 0;
        let monthlyRecurring = 0;
        let annualRecurring = 0;
        let usedLicenses = 0;
        let totalLicenses = 0;
        let closestExpiry = null;

        displayedApps.forEach(app => {
            if (app.billingFrequency === 'Monthly') {
                monthlyCount++;
                monthlyRecurring += app.cost;
            } else {
                annualCount++;
                annualRecurring += app.cost;
            }
            usedLicenses += (app.licenseUsed || 0);
            totalLicenses += (app.licenseTotal || 0);

            if (app.expiryDate) {
                const expiry = new Date(app.expiryDate);
                if (!closestExpiry || expiry < closestExpiry) {
                    closestExpiry = expiry;
                }
            }
        });

        let daysToExpiry = null;
        if (closestExpiry) {
            const now = new Date();
            const diffTime = Math.ceil((closestExpiry - now) / (1000 * 60 * 60 * 24));
            // Show absolute minimum days left, max 0 to prevent negative
            daysToExpiry = Math.max(0, diffTime);
        }

        const licensePercentage = totalLicenses > 0
            ? Math.round((usedLicenses / totalLicenses) * 100)
            : 0;

        return {
            totalActive: displayedApps.length,
            monthlyCount,
            annualCount,
            monthlyRecurring,
            annualRecurring,
            usedLicenses,
            totalLicenses,
            licensePercentage,
            daysToExpiry
        };
    }, [displayedApps]);

    // Dynamic donut chart — computed from displayed apps data
    const donutSegments = useMemo(() => {
        if (!displayedApps.length) return { segments: [], total: 0 };

        let groups = {};
        if (donutView === 'Frequency') {
            displayedApps.forEach(app => {
                groups[app.billingFrequency] = (groups[app.billingFrequency] || 0) + 1;
            });
        } else if (donutView === 'Department') {
            displayedApps.forEach(app => {
                groups[app.department] = (groups[app.department] || 0) + 1;
            });
        } else if (donutView === 'Country') {
            displayedApps.forEach(app => {
                groups[app.country] = (groups[app.country] || 0) + 1;
            });
        }

        const total = Object.values(groups).reduce((s, v) => s + v, 0);
        const segments = Object.entries(groups).map(([label, count], i) => ({
            label,
            count,
            color: DONUT_COLORS[i % DONUT_COLORS.length],
            percentage: count / (total || 1)
        }));

        return { segments, total };
    }, [displayedApps, donutView]);

    return (
        <div className="dashboard-wrapper">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <img src={logo} alt="B! Logo" className="header-logo" />
                    <h1 className="header-title">Application Catalogue Manager</h1>
                </div>
                <div className="header-right">
                    <span className="user-info">{user.role} ({user.name})</span>
                    <div className="avatar-stack" onClick={onLogout}>
                        <svg className="avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
                        </svg>
                        <span className="logout-text">Logout</span>
                        <svg className="chevron-down" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>
            </header>

            {/* Toolbar */}
            <div className="toolbar">
                <div className="currency-tabs">
                    {['USD', 'EUR', 'KES'].map(c => (
                        <button
                            key={c}
                            className={`currency-tab ${currency === c ? 'active' : ''}`}
                            onClick={() => setCurrency(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>
                <div className="toolbar-actions">
                    {['Master Data', 'Rates', 'Audit Trail', 'Manage Users'].map(label => (
                        <button key={label} className="toolbar-btn">{label}</button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            {dynamicStats && (
                <div className="summary-row">
                    {/* Active Apps Card */}
                    <div className="summary-card active-apps-card">
                        <div className="card-header-badge">
                            <span className="badge-number">{dynamicStats.totalActive}</span>
                            <span className="badge-label">Active apps</span>
                        </div>
                        <div className="active-apps-bottom">
                            <hr className="card-divider" />
                            <div className="cost-breakdown">
                                <div className="cost-row">
                                    <span>Monthly Recurring</span>
                                    <span className="cost-value">{currencySymbol}{convertCost(dynamicStats.monthlyRecurring).toLocaleString()}</span>
                                </div>
                                <hr className="card-divider" />
                                <div className="cost-row">
                                    <span>Annual Recurring</span>
                                    <span className="cost-value">{currencySymbol}{convertCost(dynamicStats.annualRecurring).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Donut Chart Card */}
                    <div className="summary-card donut-card">
                        <div className="donut-header">
                            <span className="donut-title">Active apps</span>
                            <div className="donut-tabs">
                                {['Frequency', 'Department', 'Country'].map(view => (
                                    <span
                                        key={view}
                                        className={`donut-tab ${donutView === view ? 'active' : ''}`}
                                        onClick={() => setDonutView(view)}
                                    >
                                        {view}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <hr className="card-divider" />
                        <div className="donut-body">
                            <div className="donut-chart-container">
                                <svg viewBox="0 0 120 120" className="donut-svg">
                                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e0e0e0" strokeWidth="20" />
                                    {(() => {
                                        let offset = 0;
                                        return donutSegments.segments.map((seg, i) => {
                                            const arc = seg.percentage * 314;
                                            const el = (
                                                <circle
                                                    key={seg.label}
                                                    cx="60" cy="60" r="50"
                                                    fill="none"
                                                    stroke={seg.color}
                                                    strokeWidth="20"
                                                    strokeDasharray={`${arc} 314`}
                                                    strokeDashoffset={`${-offset}`}
                                                    transform="rotate(-90 60 60)"
                                                    style={{ transition: 'all 0.4s ease' }}
                                                />
                                            );
                                            offset += arc;
                                            return el;
                                        });
                                    })()}
                                    <text x="60" y="55" textAnchor="middle" className="donut-center-number">{donutSegments.total}</text>
                                    <text x="60" y="72" textAnchor="middle" className="donut-center-label">Categories</text>
                                </svg>
                            </div>
                            <div className="donut-legend">
                                {donutSegments.segments.map(seg => (
                                    <div className="legend-item" key={seg.label}>
                                        <span className="legend-dot" style={{ backgroundColor: seg.color }}></span>
                                        <span>{seg.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column Stack */}
                    <div className="right-summary-column">
                        {/* Expiring Soon Card */}
                        <div className="small-card">
                            <div className="expiry-header">
                                <span className="expiry-dot"></span>
                                <span className="expiry-title">Expiring Soon</span>
                            </div>
                            <hr className="card-divider" />
                            <div className="expiry-countdown">
                                {dynamicStats.daysToExpiry !== null
                                    ? <span className="expiry-days">{dynamicStats.daysToExpiry} Days to go!</span>
                                    : <span className="expiry-days safe">All clear!</span>
                                }
                            </div>
                        </div>

                        {/* License Usage Card */}
                        <div className="small-card">
                            <div className="license-header-row">
                                <span className="license-title-text">Number of users</span>
                                <span className="license-pct">
                                    {dynamicStats.licensePercentage}% used
                                </span>
                            </div>
                            <hr className="card-divider" />
                            <div className="license-bar-row">
                                <div className="license-bar-container">
                                    <div
                                        className="license-bar-fill"
                                        style={{ width: `${dynamicStats.licensePercentage}%` }}
                                    ></div>
                                </div>
                                <span className="license-detail">{dynamicStats.usedLicenses} users of {dynamicStats.totalLicenses} users</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filters-container">
                <div className="filters-row">
                    <input
                        type="text"
                        className="filter-input search-input"
                        placeholder="Search by name... e.g Photoshop"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                    <select className="filter-select" value={filters.country} onChange={(e) => handleFilterChange('country', e.target.value)}>
                        <option value="">Country</option>
                        <option value="Global">Global</option>
                        <option value="Kenya">Kenya</option>
                    </select>
                    <select className="filter-select" value={filters.department} onChange={(e) => handleFilterChange('department', e.target.value)}>
                        <option value="">Department</option>
                        {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="filter-select" value={filters.billingFrequency} onChange={(e) => handleFilterChange('billingFrequency', e.target.value)}>
                        <option value="">Billing Frequency</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Annually">Annually</option>
                    </select>
                    <select className="filter-select" value={filters.paymentMethod} onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}>
                        <option value="">Payment Method</option>
                        <option value="RTGS">RTGS</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Wire Transfer">Wire Transfer</option>
                        <option value="M-Pesa">M-Pesa</option>
                    </select>
                </div>

                <hr className="filters-divider" />

                <div className="filters-row-secondary">
                    <select className="filter-select recurring-select" defaultValue="Monthly (Recurring)">
                        <option>Monthly (Recurring)</option>
                        <option>Annually (Recurring)</option>
                    </select>

                    <div className={`custom-expiry-toggle ${expiryFilter ? 'active' : ''}`} onClick={() => setExpiryFilter(!expiryFilter)}>
                        <div className="expiry-thumb">Expiry in 30 Days</div>
                    </div>

                    <label className="toggle-label-wrap">
                        <span className={`custom-switch ${filters.includeDisabled ? 'on' : 'off'}`}
                            onClick={() => handleFilterChange('includeDisabled', !filters.includeDisabled)}>
                            <span className="switch-knob"></span>
                        </span>
                        <span className="switch-text">Include Disabled</span>
                    </label>

                    <button className="filter-btn bulk-upload-btn">
                        Bulk Upload
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </button>
                    <button className="filter-btn add-new-btn">+ New</button>
                </div>
            </div>

            {/* Data Table */}
            <div className="table-container">
                {loading ? (
                    <div className="loading-state">Loading applications...</div>
                ) : (
                    <table className="apps-table">
                        <thead>
                            <tr>
                                <th>App Name</th>
                                <th>Country</th>
                                <th>Department</th>
                                <th>Stakeholder</th>
                                <th>Cost</th>
                                <th>Payment Method</th>
                                <th>Lisence Usage</th>
                                <th>Purchase Date</th>
                                <th>Expiry Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedApps.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="empty-state">No applications found</td>
                                </tr>
                            ) : (
                                displayedApps.map(app => (
                                    <tr key={app._id}>
                                        <td className="app-name-cell">{app.appName}</td>
                                        <td>{app.country}</td>
                                        <td>{app.department}</td>
                                        <td>{app.stakeholder}</td>
                                        <td>{formatCost(app.cost)}</td>
                                        <td>{app.paymentMethod}</td>
                                        <td>
                                            <div className="license-cell">
                                                <span className="license-text">{app.licenseUsed}/ {app.licenseTotal}</span>
                                                <div className="license-bar-small">
                                                    <div
                                                        className="license-bar-fill-small"
                                                        style={{
                                                            width: `${(app.licenseUsed / app.licenseTotal) * 100}%`,
                                                            backgroundColor: getLicenseBarColor(app.licenseUsed, app.licenseTotal)
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{formatDate(app.purchaseDate)}</td>
                                        <td>{formatDate(app.expiryDate)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer */}
            <footer className="dashboard-header-footer dashboard-footer">
                <img src={footerLogo} alt="Footer Logo" className="footer-logo" />
                <p className="footer-text">
                    Application Catalogue Manager is an internal application<br />
                    and is not to be shared with the general public
                </p>
            </footer>
        </div>
    );
}

export default Dashboard;
