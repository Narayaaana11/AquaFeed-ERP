require('dotenv').config();
const http = require('http');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { verify } = require('jsonwebtoken');

// Route imports
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const salesRoutes = require('./routes/sales');
const expenseRoutes = require('./routes/expenses');
const warehouseRoutes = require('./routes/warehouses');
const inventoryRoutes = require('./routes/inventory');
const reportsRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// CORS origins configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    callback(new Error(`CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true,
};

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication token missing'));
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET || 'aquafeed_jwt_secret_key_change_in_production_2026');
    socket.userId = decoded.id;
    socket.companyId = decoded.companyId;
    next();
  } catch (err) {
    console.error('❌ WebSocket auth error:', err.message);
    next(new Error('Invalid token'));
  }
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log(`✅ User ${socket.userId} connected via WebSocket`);

  // Dashboard subscriptions
  socket.on('subscribe_dashboard', () => {
    socket.join(`dashboard_${socket.companyId}`);
    console.log(`📊 User ${socket.userId} subscribed to dashboard updates`);
  });

  socket.on('unsubscribe_dashboard', () => {
    socket.leave(`dashboard_${socket.companyId}`);
    console.log(`📊 User ${socket.userId} unsubscribed from dashboard`);
  });

  // Products subscriptions
  socket.on('subscribe_products', () => {
    socket.join(`products_${socket.companyId}`);
    console.log(`📦 User ${socket.userId} subscribed to product updates`);
  });

  socket.on('unsubscribe_products', () => {
    socket.leave(`products_${socket.companyId}`);
  });

  // Customers subscriptions
  socket.on('subscribe_customers', () => {
    socket.join(`customers_${socket.companyId}`);
    console.log(`👥 User ${socket.userId} subscribed to customer updates`);
  });

  socket.on('unsubscribe_customers', () => {
    socket.leave(`customers_${socket.companyId}`);
  });

  // Inventory subscriptions
  socket.on('subscribe_inventory', () => {
    socket.join(`inventory_${socket.companyId}`);
    console.log(`📦 User ${socket.userId} subscribed to inventory updates`);
  });

  socket.on('unsubscribe_inventory', () => {
    socket.leave(`inventory_${socket.companyId}`);
  });

  // Sales subscriptions
  socket.on('subscribe_sales', () => {
    socket.join(`sales_${socket.companyId}`);
    console.log(`💰 User ${socket.userId} subscribed to sales updates`);
  });

  socket.on('unsubscribe_sales', () => {
    socket.leave(`sales_${socket.companyId}`);
  });

  // Expenses subscriptions
  socket.on('subscribe_expenses', () => {
    socket.join(`expenses_${socket.companyId}`);
    console.log(`💸 User ${socket.userId} subscribed to expense updates`);
  });

  socket.on('unsubscribe_expenses', () => {
    socket.leave(`expenses_${socket.companyId}`);
  });

  // Warehouses subscriptions
  socket.on('subscribe_warehouses', () => {
    socket.join(`warehouses_${socket.companyId}`);
    console.log(`🏢 User ${socket.userId} subscribed to warehouse updates`);
  });

  socket.on('unsubscribe_warehouses', () => {
    socket.leave(`warehouses_${socket.companyId}`);
  });

  // Settings subscriptions
  socket.on('subscribe_settings', () => {
    socket.join(`settings_${socket.companyId}`);
    console.log(`⚙️ User ${socket.userId} subscribed to settings updates`);
  });

  socket.on('unsubscribe_settings', () => {
    socket.leave(`settings_${socket.companyId}`);
  });

  // Company-wide notifications
  socket.on('subscribe_company', () => {
    socket.join(`company_${socket.companyId}`);
    console.log(`🏢 User ${socket.userId} joined company notifications`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ User ${socket.userId} disconnected`);
  });
});

// Store io instance for global access
app.locals.io = io;

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

app.use(express.static('public'));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AquaFeed ERP API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth')(upload));
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// Serve React frontend only if the dist folder exists (self-hosted / same-server deploy).
// When frontend is on Vercel and backend is on Render, dist won't exist — skip silently.
const frontendBuildPath = path.join(__dirname, '../../aquaflow-erp/dist');
if (fs.existsSync(frontendBuildPath)) {
  console.log('📁 Serving bundled frontend from', frontendBuildPath);
  app.use(express.static(frontendBuildPath));
  // Handle React Router — return index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // API-only mode (Render backend + Vercel frontend)
  app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
  });
}

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 AquaFeed ERP Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server running on ws://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
