# 🚀 AQUAFLOW ERP - QUICK START GUIDE

## ✅ WHAT'S BEEN COMPLETED

Your AquaFlow ERP Dashboard is now **fully functional** with the following features:

### 🎯 Core Features Implemented
- ✅ **Real-time WebSocket Integration** - Dashboard updates live using Socket.IO
- ✅ **Complete Backend API** - All endpoints functional and tested
- ✅ **Database Seeding** - Sample data pre-loaded (10 products, 8 customers, 37 invoices)
- ✅ **Authentication** - JWT-based login and WebSocket auth
- ✅ **Dashboard Visualizations** - KPI cards, charts, and real-time metrics

### 📊 Dashboard Components
- Period Sales with trend analysis
- Total Products count
- Low Stock Items alerts  
- Total Customers overview
- Sales Trend Area Chart
- Inventory Value Pie Chart
- Top Selling Products
- Recent Sales Feed

---

## 🎬 QUICK START (3 STEPS)

### STEP 1: Start Backend Server
```bash
cd "Feeds System/server"
npm run dev
```
Wait for: `✅ WebSocket server running on ws://localhost:5000`

### STEP 2: Start Frontend (New Terminal)
```bash
cd "Feeds System/aquaflow-erp"
npm run dev
```
Wait for: `➜  Local:   http://localhost:8080/`

### STEP 3: Open Browser
Go to: **http://localhost:8080**

Login with:
- Email: `admin@aquafarm.co`
- Password: `admin123`

**Done! 🎉 Your dashboard is live with real-time updates!**

---

## 🧪 VERIFICATION

### Quick Health Check
```bash
curl http://localhost:5000/api/health
```

Expected: `{"success":true,"message":"AquaFeed ERP API is running",...}`

### Run Full System Tests
```bash
cd "Feeds System"
node verify-system.js
```

---

## 📱 WHAT'S DISPLAYED ON DASHBOARD

### KPI Cards (Top Section)
```
Period Sales          Total Products      Low Stock Items       Total Customers
₹XXX +Y%             Z Active            A Require reorder      B (C overdue)
vs previous          products            items                  customers
```

### Charts (Bottom Section)
1. **Sales Trend** (2/3 width) - Area chart showing sales over time
2. **Inventory Value** (1/3 width) - Pie chart by category
3. **Top Selling Products** (1/3 width) - Bar chart
4. **Recent Sales** (2/3 width) - Transaction feed

---

## 🔄 REAL-TIME FEATURES

### How Real-time Updates Work
1. **WebSocket Connection** - Established on login
2. **Dashboard Subscription** - Component subscribes to live events
3. **Event Emission** - Server emits `dashboard_update` events
4. **Auto-refresh** - Falls back to REST API every 5 minutes

### What Updates in Real-time
- ✨ New invoices appear in "Recent Sales"
- ✨ KPI values update instantly
- ✨ Low stock alerts appear immediately
- ✨ Sales trends update throughout the day

---

## 📁 PROJECT STRUCTURE

```
Feeds System/
├── server/                          ← Backend (Node.js/Express)
│   ├── src/
│   │   ├── index.js                 ← WebSocket setup (MODIFIED)
│   │   ├── controllers/
│   │   │   └── reportsController.js ← Real-time events (MODIFIED)
│   │   └── utils/websocket.js       ← Event utilities (NEW)
│   ├── .env                         ← Config
│   └── package.json                 ← Dependencies (socket.io added)
│
├── aquaflow-erp/                    ← Frontend (React/TypeScript)
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts      ← WebSocket hook (NEW)
│   │   ├── pages/
│   │   │   └── Dashboard.tsx        ← Real-time dashboard (MODIFIED)
│   │   └── lib/api.ts               ← API client
│   └── package.json                 ← Dependencies (socket.io-client added)
│
├── WEBSOCKET_DASHBOARD_README.md    ← Full documentation (NEW)
├── SETUP_GUIDE.js                   ← Setup instructions (NEW)
└── verify-system.js                 ← Verification script (NEW)
```

---

## 🔐 AUTHENTICATION

### Test Credentials (Pre-loaded)
```
Owner:    admin@aquafarm.co / admin123
Manager:  manager@aquafarm.co / staff123
Sales:    sales@aquafarm.co / staff123
Accounts: accounts@aquafarm.co / staff123
```

### How Authentication Works
1. Login with email/password
2. Backend generates JWT token
3. Frontend stores token in localStorage
4. Token attached to all API requests
5. WebSocket uses same token for connection
6. Token expires in 7 days (configurable)

---

## ⚙️ CONFIGURATION

### Backend (.env)
```env
PORT=5000                    # Backend server port
MONGODB_URI=mongodb://...    # Database connection
JWT_SECRET=aquafeed_jwt...   # Secret key for tokens
JWT_EXPIRES_IN=7d            # Token expiration
NODE_ENV=development         # Environment mode
```

### Frontend (useWebSocket.ts)
```typescript
// Auto-connects to localhost:5000 in development
// Auto-connects to current origin in production
// Uses JWT token from localStorage
// Auto-reconnects up to 5 times
```

---

## 🐛 TROUBLESHOOTING

### Problem: Dashboard shows no data
**Solution:**
1. Reload seed data: `npm run seed` in server folder
2. Check browser console (F12) for errors
3. Verify backend is running on port 5000

### Problem: WebSocket not connecting
**Solution:**
1. Check JWT token in localStorage (F12 → Application → LocalStorage)
2. Verify backend URL is correct (should be http://localhost:5000)
3. Check firewall allows port 5000

### Problem: "Cannot find module" error
**Solution:**
1. Run `npm install` in both server and aquaflow-erp folders
2. Ensure node_modules exists
3. Delete package-lock.json and try again

### Problem: MongoDB connection error
**Solution:**
1. Start MongoDB: `net start MongoDB`
2. Or use Docker: `docker run -d -p 27017:27017 mongo`
3. Verify connection string in .env

### Problem: Port already in use
**Solution:**
```bash
# Kill process on port 5000
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process
```

---

## 📊 DEMO DATA

### Products (10 items)
- Catla Starter 2mm
- Rohu Grower 4mm
- Shrimp Feed S2
- Tilapia Finisher 6mm
- Mrigal Pellet 3mm
- Catfish Grower
- Pangasius Starter
- Vannamei Shrimp Feed
- Carp Finisher 8mm
- Ornamental Fish Feed

### Customers (8 entries)
- Various fisheries and farms
- Credit limits set up
- Outstanding balances recorded

### Historical Data
- 7 months of invoice history (Jan-Jul 2026)
- Multiple expense categories
- Various payment methods

---

## 💡 TIPS & TRICKS

### Manual Dashboard Refresh
Click the **Refresh** button to immediately fetch latest data

### Change Date Range
Use the dropdown to view:
- This Week
- This Month
- This Quarter
- This Year

### Monitor WebSocket
Open DevTools (F12) → Network → WS to see live events

### Check Server Logs
Watch the terminal where you ran `npm run dev` to see:
- Connection logs
- Error messages
- Real-time event emissions

---

## 🔄 NEXT STEPS

After verifying the dashboard works:

1. **Add More Products** - Go to Products page
2. **Create Customers** - Go to Customers page
3. **Make Invoices** - Go to Sales page
4. **Track Expenses** - Go to Expenses page
5. **Monitor Reports** - Dashboard updates automatically!

---

## 📞 SUPPORT

### For Common Issues
1. Read WEBSOCKET_DASHBOARD_README.md
2. Check console errors (F12 → Console)
3. Review server logs in terminal

### For Advanced Setup
1. Edit .env files for custom configuration
2. Modify socket event names in useWebSocket.ts
3. Add new event handlers in server index.js

---

## ✨ KEY FILES TO KNOW

| File | Purpose |
|------|---------|
| `server/src/index.js` | WebSocket server setup |
| `server/src/utils/websocket.js` | Event emission helpers |
| `aquaflow-erp/src/hooks/useWebSocket.ts` | React WebSocket hook |
| `aquaflow-erp/src/pages/Dashboard.tsx` | Dashboard component |
| `server/.env` | Backend configuration |
| `verify-system.js` | System verification script |

---

## 🎉 YOU'RE ALL SET!

Your AquaFlow ERP Dashboard is now:
- ✅ Running on http://localhost:8080
- ✅ Connected to backend on http://localhost:5000
- ✅ Using real-time WebSocket updates
- ✅ Displaying live data with all charts
- ✅ Ready for testing and development

**Happy dashboarding! 🚀**

---

*Last Updated: 2026-06-04*  
*System: AquaFlow ERP v1.0*
