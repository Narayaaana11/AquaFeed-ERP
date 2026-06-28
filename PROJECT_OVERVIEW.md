# AquaFeed ERP - Complete Project Overview & Architecture

This document provides a comprehensive, step-by-step breakdown of how the AquaFeed ERP system works, its architecture, technology stack, and integration points.

## 1. High-Level Architecture

AquaFeed ERP is a full-stack web application designed for aquaculture feed management. It consists of three main components:
1. **Frontend (`aquaflow-erp`)**: A React Single Page Application (SPA) that provides the user interface.
2. **Backend Server (`server`)**: A Node.js/Express REST API that handles business logic, real-time events, and database communication.
3. **Tally Integration Utility (`tally-database-loader-utility-1.0.43`)**: A separate utility designed to synchronize data between the ERP and Tally (an accounting software).

---

## 2. Technology Stack

### Frontend (`aquaflow-erp`)
- **Core Framework**: React 18, built with Vite for fast bundling and HMR.
- **Routing**: `react-router-dom` for client-side navigation.
- **State Management & Data Fetching**: `@tanstack/react-query` for API data caching and invalidation.
- **Real-time Communication**: `socket.io-client` for receiving live updates from the server.
- **Styling**: Tailwind CSS combined with `shadcn/ui` (Radix UI) for accessible, highly customizable UI components.
- **Forms & Validation**: `react-hook-form` paired with `zod` for robust schema validation.
- **Charting**: `recharts` for visual data representation on dashboards and reports.

### Backend (`server`)
- **Core Framework**: Node.js with Express.
- **Database**: MongoDB (interacted with via `mongoose` ODM).
- **Authentication**: JSON Web Tokens (JWT) and `bcryptjs` for secure password hashing.
- **Real-time Communication**: `socket.io` for pushing updates to connected clients (e.g., when an invoice is paid or inventory changes).
- **File Uploads**: `multer` handling in-memory storage for image uploads.

### Tally Utility
- **Node.js Scripts / GUI**: Reads from Tally's local server (via XML HTTP requests) and syncs data to databases. Configured via `.yaml` and `.json` files.

---

## 3. Step-by-Step Workflow of the System

### Step 1: Application Startup and Pre-warming
When a user opens the frontend app in their browser (`App.tsx`):
1. **Health Check**: The frontend makes an immediate `/api/health` request to the backend. This acts as a "pre-warm" request in case the backend is hosted on a serverless or free-tier platform (like Render) that spins down during inactivity.
2. **Authentication Check**: The `ProtectedLayout` component verifies if a valid JWT token exists in `localStorage` and checks its expiration date.
   - If invalid, the user is redirected to `/login`.
   - If valid, the user is granted access and the `CompanyProvider` and `WebSocketProvider` contexts are initialized.

### Step 2: Authentication Flow
1. **Login**: User submits credentials on the frontend.
2. **Verification**: Backend verifies credentials against MongoDB, signs a JWT token with the user's ID and `companyId`, and returns it.
3. **Storage**: Frontend stores the token and user details in `localStorage`.
4. **WebSocket Connection**: The `WebSocketProvider` establishes a persistent connection to the server using `socket.io`, authenticating the socket connection by passing the JWT token.

### Step 3: Real-Time Data Synchronization (WebSockets)
The application relies heavily on real-time updates.
- When a user navigates to a specific page (e.g., Sales), the frontend emits a `subscribe_sales` event to the backend.
- The backend places the user's socket into a specific room (e.g., `sales_{companyId}`).
- When a sale is created or modified by *any* user in the same company, the backend emits an event to that room.
- The frontend receives the event and uses `react-query` to automatically invalidate and refetch the stale data, instantly updating the UI without a page refresh.
- When the user leaves the page, an `unsubscribe_sales` event is emitted to save bandwidth.

### Step 4: Core Business Modules Operation
The system is divided into multiple interconnected modules:
- **Products & Inventory**: Manage feed types, variants, and stock levels. Inventory tracks stock in specific **Warehouses**.
- **Customers & Suppliers**: Entity management for sales and purchasing.
- **Sales & Invoices**: Creating sales records generates Invoices. Invoices have statuses (Paid, Credit, Overdue).
  - *Automated Task*: The backend runs a scheduler (`markOverdueInvoices`) every 6 hours that scans for unpaid "Credit" invoices past their `dueDate` and automatically marks them as "Overdue".
- **Expenses**: Tracking company expenditures.
- **Purchase Orders & Credit Notes**: Financial and stock adjustment documents.
- **Reports**: Aggregating data across sales, expenses, and inventory for business intelligence.

### Step 5: Tally Synchronization
If Tally integration is enabled (`TALLY_ENABLED='true'` in `.env`):
1. The backend initializes `tallySyncService` on startup.
2. It runs scheduled tasks to pull or push financial data (Ledgers, Vouchers, Inventory items) between the MongoDB database and the local Tally Prime software.
3. The standalone `tally-database-loader-utility` acts as a heavy-lifting tool for initial bulk imports or structural database syncing using predefined SQL schemas or JSON configs.

### Step 6: Deployment & Serving
- In a production environment where both are hosted on the same server, the Express backend serves the built React static files from the `aquaflow-erp/dist` directory.
- It features a catch-all route `app.get('*')` to allow React Router to handle client-side routing.
- Alternatively, the frontend can be deployed independently to Vercel/Netlify, communicating with the backend via CORS-enabled API endpoints.

---

## Summary of the Data Flow Example (Creating a Sale)
1. **User Action**: User fills out the New Sale form in the frontend.
2. **Validation**: `zod` validates the form schema client-side.
3. **API Request**: Frontend sends a POST request to `/api/sales` with the JWT token in headers.
4. **Backend Processing**: 
   - Express router passes request to the Sales Controller.
   - Controller deducts stock from the specified Warehouse (MongoDB Transaction).
   - Controller creates the Sale and Invoice records.
5. **Real-time Broadcast**: Backend calls `io.to('sales_companyId').emit('sale_created')` and `io.to('inventory_companyId').emit('inventory_updated')`.
6. **Client Update**: All connected clients viewing Sales or Inventory pages receive the WebSocket event and automatically refetch the latest data, reflecting the new sale and updated stock instantly.
