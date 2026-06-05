# 🐟 AquaFeed ERP

> A modern, full-stack Enterprise Resource Planning system tailored for aquaculture feed businesses. Manage sales, inventory, customers, expenses, warehouses, and more — all in real-time.

[![CI/CD](https://github.com/Narayaaana11/AquaFeed-ERP/actions/workflows/ci.yml/badge.svg)](https://github.com/Narayaaana11/AquaFeed-ERP/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-6%2B-darkgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

- 📊 **Real-time Dashboard** — Live KPIs with WebSocket-powered updates (Socket.IO)
- 🛒 **Sales Management** — Track orders, invoices, and revenue
- 📦 **Inventory & Warehouse** — Multi-warehouse stock tracking with low-stock alerts
- 👥 **Customer Management** — Full CRM with customer profiles and history
- 💸 **Expense Tracking** — Categorized expenses with reporting
- 📈 **Reports** — Revenue, inventory, and customer analytics
- ⚙️ **Settings** — Company profile, user management, and configurations
- 🔐 **JWT Authentication** — Secure login with role-based access
- 🌙 **Dark Mode** — Built-in theme switching

---

## 🏗️ Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Frontend    | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend     | Node.js, Express.js                              |
| Database    | MongoDB (Mongoose ODM)                           |
| Real-time   | Socket.IO (WebSockets)                           |
| Auth        | JWT (JSON Web Tokens) + bcrypt                   |
| State       | TanStack Query (React Query)                     |
| Charts      | Recharts                                         |

---

## 📁 Project Structure

```
AquaFeed-ERP/
├── aquaflow-erp/         # React + Vite frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page-level components
│   │   ├── hooks/        # Custom React hooks (incl. WebSocket)
│   │   ├── lib/          # API clients, utilities
│   │   └── data/         # Static/mock data
│   └── ...
│
├── server/               # Express.js backend API
│   ├── src/
│   │   ├── config/       # Database connection
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # Auth, error handling
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # API route definitions
│   │   └── utils/        # Helpers
│   └── ...
│
├── .github/workflows/    # GitHub Actions CI/CD
└── package.json          # Monorepo root
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18.0.0
- [MongoDB](https://www.mongodb.com/) (local or [Atlas](https://www.mongodb.com/cloud/atlas))
- npm >= 8.0.0

### 1. Clone the repository

```bash
git clone https://github.com/Narayaaana11/AquaFeed-ERP.git
cd AquaFeed-ERP
```

### 2. Set up the Backend

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
```

### 3. Set up the Frontend

```bash
cd aquaflow-erp
cp .env.example .env
npm install
```

### 4. Seed the database (optional)

```bash
cd server
npm run seed
```

### 5. Run in Development

**Terminal 1 – Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 – Frontend:**
```bash
cd aquaflow-erp
npm run dev
```

- Frontend: [http://localhost:8080](http://localhost:8080)
- Backend API: [http://localhost:5000](http://localhost:5000)
- API Health Check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔧 Environment Variables

### Backend (`server/.env`)

| Variable        | Description                        | Default                        |
|-----------------|------------------------------------|--------------------------------|
| `PORT`          | Server port                        | `5000`                         |
| `NODE_ENV`      | Environment                        | `development`                  |
| `MONGODB_URI`   | MongoDB connection string          | `mongodb://localhost:27017/aquafeed` |
| `JWT_SECRET`    | Secret key for JWT signing         | *(required, change in prod!)*  |
| `JWT_EXPIRES_IN`| JWT token expiry                   | `7d`                           |
| `CORS_ORIGINS`  | Allowed origins (comma-separated)  | `http://localhost:5173,...`    |

### Frontend (`aquaflow-erp/.env`)

| Variable       | Description              | Default |
|----------------|--------------------------|---------|
| `VITE_API_URL` | Backend API URL (prod)   | `''`    |
| `VITE_WS_URL`  | WebSocket URL (prod)     | `''`    |

---

## 🏭 Production Deployment

### Build the frontend

```bash
cd aquaflow-erp
npm run build
```

### Run the server (serves frontend + API)

```bash
cd server
NODE_ENV=production npm start
```

In production mode, the Express server automatically serves the React build at `aquaflow-erp/dist/`.

### Deploy on Railway / Render / Fly.io

1. Set environment variables (`MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGINS`)
2. Set the root directory to `server/`
3. Build command: `cd ../aquaflow-erp && npm install && npm run build`
4. Start command: `npm start`

### MongoDB Atlas (recommended for production)

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/aquafeed?retryWrites=true&w=majority
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">Built with ❤️ for the aquaculture industry</p>
