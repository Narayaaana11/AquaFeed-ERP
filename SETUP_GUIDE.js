#!/usr/bin/env node
/**
 * Dashboard & WebSocket Integration - Complete Setup Guide
 * 
 * This guide explains how the AquaFlow ERP dashboard now has full real-time
 * updates using WebSocket and Socket.IO.
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         AQUAFLOW ERP - DASHBOARD & WEBSOCKET SETUP            ║
╚════════════════════════════════════════════════════════════════╝

📦 WHAT WAS IMPLEMENTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ WebSocket Server (Socket.IO)
   • Real-time dashboard updates
   • JWT authentication for WebSocket connections
   • Event-based data streaming

2. ✅ Real-time Data Channels
   • dashboard_update - KPIs, sales trends, recent sales
   • product_update - Product inventory changes
   • inventory_update - Stock level changes
   • sales_update - New sales notifications
   • low_stock_alert - Low stock product warnings

3. ✅ Frontend Integration
   • useWebSocket React hook
   • Dashboard component listens to real-time events
   • Automatic fallback to REST API

4. ✅ Database Seeding
   • 10 aquafeed products
   • 8 customers with credit limits
   • 37 invoices (7 months of historical data)
   • 42 expenses (categorized)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 QUICK START GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1: Start MongoDB (if not running)
  Windows:
    net start MongoDB
  Or use Docker:
    docker run -d -p 27017:27017 --name mongodb mongo

STEP 2: Start Backend Server
  cd "Feeds System/server"
  npm run dev
  Expected output:
    ✅ MongoDB connected: localhost
    AquaFeed ERP Server running on http://localhost:5000
    WebSocket server running on ws://localhost:5000

STEP 3: Start Frontend (in a new terminal)
  cd "Feeds System/aquaflow-erp"
  npm run dev
  Expected output:
    ➜  Local:   http://localhost:5173/
    ➜  Press h for help

STEP 4: Open Browser
  Navigate to http://localhost:5173/
  Login with:
    Email: admin@aquafarm.co
    Password: admin123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 DASHBOARD FEATURES NOW ACTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Real-time KPI Cards
  • Period Sales with trend percentage
  • Total Products count
  • Low Stock Items requiring reorder
  • Total Customers with overdue accounts

✓ Charts & Visualizations
  • Sales Trend Chart (area chart with historical data)
  • Inventory Value Breakdown (pie chart by category)
  • Top Selling Products (horizontal bar chart)
  • Recent Sales Table

✓ Real-time Updates
  • Dashboard refreshes automatically when data changes
  • WebSocket connection maintains live updates
  • Fallback to REST API polling if needed
  • Low stock alerts displayed in real-time

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backend (.env)
  PORT=5000
  MONGODB_URI=mongodb://localhost:27017/aquafeed
  JWT_SECRET=aquafeed_jwt_secret_key_change_in_production_2026
  JWT_EXPIRES_IN=7d
  NODE_ENV=development

Frontend (useWebSocket hook)
  • Auto-connects to ws://localhost:5000
  • Uses JWT token from localStorage
  • Subscribes to dashboard channel on mount
  • Reconnects with exponential backoff

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Verify Backend is Running
   curl http://localhost:5000/api/health

2. Check Dashboard API Endpoint
   curl -H "Authorization: Bearer <JWT_TOKEN>" \\
        http://localhost:5000/api/reports/dashboard

3. WebSocket Connection Test
   • Open browser DevTools (F12)
   • Go to Console tab
   • You should see: "✅ WebSocket connected"
   • Monitor real-time events in Network > WS

4. Real-time Update Test
   • Make changes in other modules (add products, create invoice)
   • Dashboard should update automatically via WebSocket
   • If WebSocket disconnects, falls back to REST API

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 PROJECT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backend Files Modified:
  server/
    ├── src/
    │   ├── index.js ........................ WebSocket setup
    │   ├── controllers/
    │   │   └── reportsController.js ........ WebSocket emissions
    │   └── utils/
    │       └── websocket.js ............... Event utilities
    └── .env ............................ Configuration

Frontend Files Modified:
  aquaflow-erp/
    ├── src/
    │   ├── hooks/
    │   │   └── useWebSocket.ts ........... WebSocket hook
    │   └── pages/
    │       └── Dashboard.tsx ............ Real-time dashboard
    └── package.json ................... socket.io-client

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issue: WebSocket connection fails
Solution:
  1. Check server is running: npm run dev
  2. Verify JWT token in localStorage
  3. Check console for specific error message
  4. Ensure firewall allows port 5000

Issue: Dashboard shows no data
Solution:
  1. Verify seed data: npm run seed
  2. Check API endpoint: http://localhost:5000/api/reports/dashboard
  3. Inspect Network tab for failed requests
  4. Check server logs for errors

Issue: Real-time updates not working
Solution:
  1. Check WebSocket connection in DevTools
  2. Verify 'subscribe_dashboard' event emitted
  3. Check server logs for emission errors
  4. Fall back to REST API (automatic)

Issue: CORS errors
Solution:
  1. Ensure origin in CORS config matches frontend URL
  2. Check server CORS configuration
  3. Clear browser cache and restart

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ READY TO USE!
Your AquaFlow ERP Dashboard is now fully functional with real-time 
WebSocket updates. All data is live and automatically synced!

For questions or issues, check the console logs for detailed error messages.

╚════════════════════════════════════════════════════════════════╝
`);
