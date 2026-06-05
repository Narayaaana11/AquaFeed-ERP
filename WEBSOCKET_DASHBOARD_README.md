# AquaFlow ERP Dashboard - Real-time WebSocket Integration

## 🎉 What's New

The AquaFlow ERP Dashboard now features **real-time WebSocket-powered updates** with Socket.IO! This means:

✨ **Live Data Updates** - Dashboard automatically refreshes when new data comes in  
⚡ **Zero-latency Notifications** - Get instant alerts for low stock items, new sales, etc.  
🔄 **Automatic Fallback** - Falls back to REST API polling if WebSocket is unavailable  
🛡️ **Secure Connections** - JWT-based authentication for WebSocket connections  

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Start the Backend Server

```bash
cd "Feeds System/server"
npm install          # (if not already done)
npm run dev         # Start with nodemon
```

Expected output:
```
✅ MongoDB connected: localhost
AquaFeed ERP Server running on http://localhost:5000
WebSocket server running on ws://localhost:5000
```

### 2. Start the Frontend

In a **new terminal**:
```bash
cd "Feeds System/aquaflow-erp"
npm install          # (if not already done)
npm run dev         # Start Vite dev server
```

Expected output:
```
➜  Local:   http://localhost:8080/
➜  press h for help
```

### 3. Open in Browser

Navigate to `http://localhost:8080` (or `http://localhost:5173` depending on your Vite config)

### 4. Login

Use test credentials:
- **Email**: `admin@aquafarm.co`
- **Password**: `admin123`

## 📊 Dashboard Features

### Real-time KPI Cards
- **Period Sales** - Total sales with % change vs previous period
- **Total Products** - Count of active products
- **Low Stock Items** - Products requiring reorder
- **Total Customers** - Active customers with overdue count

### Interactive Charts
- **Sales Trend** - Area chart showing sales over time
- **Inventory Value** - Pie chart breakdown by category
- **Top Selling Products** - Horizontal bar chart
- **Recent Sales** - Live transaction feed

### Real-time Features
- ✅ Auto-refresh every 5 minutes via REST API
- ✅ Instant updates when WebSocket events arrive
- ✅ Low stock alerts displayed immediately
- ✅ Recent sales table updates in real-time

## 🔌 WebSocket Events

The dashboard listens for these real-time events:

```typescript
// Dashboard updates
'dashboard_update' -> KPIs, sales trends, recent sales

// Inventory alerts
'low_stock_alert' -> Products below threshold
'inventory_update' -> Stock level changes

// Sales updates
'sales_update' -> New sales notifications

// Product updates
'product_update' -> Product changes
```

## 🛠️ Development

### WebSocket Hook Usage

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

export default function Dashboard() {
  const { isConnected, subscribe, on, off } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      subscribe('dashboard');
      
      on('dashboard_update', (data) => {
        console.log('Real-time update:', data);
        // Update component state
      });

      return () => off('dashboard_update');
    }
  }, [isConnected, subscribe, on, off]);
}
```

### Emitting Events from Backend

```javascript
// In your controller
const io = req.app.locals.io;
emitDashboardUpdate(io, companyId, dashboardData);
```

## 🧪 Testing

### 1. Check Backend Health
```bash
curl http://localhost:5000/api/health
```

### 2. Test WebSocket Connection
Open browser DevTools (F12) and check Console for:
```
✅ WebSocket connected
📡 Subscribed to dashboard
```

### 3. Real-time Update Test
1. Open Dashboard in two browser tabs
2. Go to Products page and create a new product
3. Dashboard should update automatically with new product count

### 4. Check Network Tab
- Go to DevTools → Network
- Filter by "WS" to see WebSocket connections
- Look for `dashboard_update` messages

## 📁 Architecture

```
Backend (Node.js + Socket.IO)
├── HTTP Server (port 5000)
└── WebSocket Server (ws://localhost:5000)
    ├── Auth Middleware (JWT)
    ├── Event Handlers
    │   ├── subscribe_dashboard
    │   ├── subscribe_products
    │   ├── subscribe_inventory
    │   └── subscribe_sales
    └── Emitters
        ├── emitDashboardUpdate()
        ├── emitProductUpdate()
        ├── emitInventoryUpdate()
        └── emitLowStockAlert()

Frontend (React + TypeScript)
├── useWebSocket Hook
│   ├── Socket initialization
│   ├── Auth handling
│   ├── Event listeners
│   └── Reconnection logic
└── Dashboard Component
    ├── Real-time subscriptions
    ├── Live data state
    └── Auto-refresh fallback
```

## ⚙️ Configuration

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aquafeed
JWT_SECRET=aquafeed_jwt_secret_key_change_in_production_2026
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### Frontend (useWebSocket)
- Auto-detects development vs production
- Uses `http://localhost:5000` in development
- Uses window origin in production
- Automatic reconnection with exponential backoff

## 🐛 Troubleshooting

### WebSocket Connection Fails
**Problem**: "WebSocket connection error" in console
**Solution**:
1. Check backend is running: `npm run dev` in server folder
2. Verify port 5000 is not blocked by firewall
3. Check JWT token exists in localStorage
4. Look for specific error message in console

### Dashboard Shows No Data
**Problem**: All KPI cards show 0 or "No data"
**Solution**:
1. Run seed script: `npm run seed` in server folder
2. Check database connection in server logs
3. Verify API endpoint returns data:
   ```bash
   curl -H "Authorization: Bearer <TOKEN>" \
        http://localhost:5000/api/reports/dashboard
   ```

### Real-time Updates Not Working
**Problem**: Dashboard doesn't update when changes happen
**Solution**:
1. Check WebSocket connection in DevTools Network tab
2. Verify `subscribe_dashboard` event was sent
3. Check server logs for emission errors
4. System will automatically fall back to 5-minute REST API refresh

### CORS Errors
**Problem**: "CORS policy: Access to XMLHttpRequest..."
**Solution**:
1. Ensure backend CORS config includes frontend URL
2. Clear browser cache: Ctrl+Shift+Delete
3. Check vite.config.ts proxy settings

## 📚 Database Seed Data

The system comes with pre-loaded sample data:
- **10 Products** - Various aquafeed types with stock levels
- **8 Customers** - Fisheries and distributors
- **37 Invoices** - 7 months of historical sales
- **42 Expenses** - Categorized operational costs

Login and click "Load Demo Data" button on dashboard to reload seed data.

## 🔐 Security Notes

- WebSocket connections require valid JWT token
- Tokens are validated on each connection attempt
- Socket rooms are company-specific (`dashboard_<companyId>`)
- No sensitive data is transmitted without authentication
- All events are logged in server console for debugging

## 📈 Performance Tips

1. **Subscriptions** - Subscribe only to needed channels
2. **Event Handlers** - Clean up listeners with `off()`
3. **State Updates** - Use React.memo for expensive components
4. **Batching** - Consider batching rapid updates
5. **Throttling** - Throttle high-frequency events if needed

## 🔄 Data Refresh Strategy

- **WebSocket (Primary)** - Real-time updates when available
- **REST API Polling (Fallback)** - Queries every 5 minutes automatically
- **Manual Refresh** - Click refresh button anytime
- **Auto-reconnect** - Reconnects up to 5 times if disconnected

## 📞 Support

For issues or questions:
1. Check console logs (F12 → Console)
2. Check server logs (terminal where `npm run dev` runs)
3. Verify all prerequisites are installed and running
4. Review the SETUP_GUIDE.js in project root

---

**Happy real-time dashboarding! 🎉**
