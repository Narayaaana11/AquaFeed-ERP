# AquaFeed ERP — Frontend

React + TypeScript + Vite frontend for the AquaFeed ERP system.

## Tech Stack

- **React 18** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS** + **shadcn/ui** (components)
- **TanStack Query** (data fetching)
- **React Router v6** (routing)
- **Recharts** (charts)
- **Socket.IO Client** (real-time updates)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start dev server (requires backend running on port 5000)
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (leave empty in dev, set for production) |
| `VITE_WS_URL` | WebSocket URL (leave empty in dev, set for production) |

## Build

```bash
npm run build   # Production build → dist/
npm run preview # Preview production build locally
```

## Deployment

Deployed on **Vercel**. Set these env vars in the Vercel dashboard:
- `VITE_API_URL` = `https://aquafeed-erp.onrender.com`
- `VITE_WS_URL` = `https://aquafeed-erp.onrender.com`
