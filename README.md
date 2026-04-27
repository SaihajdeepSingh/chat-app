# ChatRoom — Real-Time Chat App

A simple full-stack real-time chat application built with the MERN stack + Socket.io.
All users share a single global chat room.

---

## Syllabus Concepts Covered

| Concept | Where Used |
|---------|-----------|
| Express.js server & routing | `backend/server.js`, `routes/` |
| Middleware | `middleware/auth.js` (JWT verification) |
| MongoDB + Mongoose | `models/User.js`, `models/Message.js` |
| Bcrypt password hashing | `routes/auth.js` — register |
| JWT authentication | `routes/auth.js` — login + `middleware/auth.js` |
| Socket.io (real-time) | `server.js` — emit/on events |
| Environment variables | `.env` files — never committed to git |

---

## Project Structure

```
chat-app/
├── backend/                   ← Node.js + Express server
│   ├── config/
│   │   └── db.js              ← MongoDB connection
│   ├── middleware/
│   │   └── auth.js            ← JWT verify middleware
│   ├── models/
│   │   ├── User.js            ← Mongoose user schema
│   │   └── Message.js         ← Mongoose message schema
│   ├── routes/
│   │   ├── auth.js            ← POST /api/auth/register & /login
│   │   └── messages.js        ← GET /api/messages (last 50)
│   ├── server.js              ← Entry point: Express + Socket.io
│   ├── package.json
│   └── .env.example           ← Copy to .env
│
└── frontend/                  ← React + Vite client
    ├── src/
    │   ├── pages/
    │   │   ├── AuthPage.jsx   ← Login / Register UI
    │   │   └── ChatPage.jsx   ← Chat window UI
    │   ├── App.jsx            ← Auth state + routing
    │   ├── main.jsx           ← React entry point
    │   └── index.css          ← Global styles & design tokens
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── .env.example           ← Copy to .env
```

---

## How to Run Locally

### Step 1 — MongoDB Atlas (Database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a **free** account.
2. Create a free **M0** cluster.
3. Under **Database Access** → Add a database user (username + password).
4. Under **Network Access** → Allow access from anywhere: `0.0.0.0/0`.
5. Click **Connect** → **Drivers** → copy the connection string.

It looks like:
```
mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority
```

---

### Step 2 — Backend Setup

```bash
cd chat-app/backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=<paste your Atlas connection string>
JWT_SECRET=any_long_random_string_here_min_32_chars
CLIENT_URL=http://localhost:5173
```

```bash
# Run the backend (development — auto-restarts on changes)
npm run dev

# OR for production-style run
npm start
```

Backend runs on: `http://localhost:5000`

Test it: open `http://localhost:5000/health` → should return `{ "status": "ok" }`

---

### Step 3 — Frontend Setup

```bash
cd chat-app/frontend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

The default `.env` is already correct for local dev:
```
VITE_API_URL=http://localhost:5000
```

```bash
# Start the frontend dev server
npm run dev
```

Frontend runs on: `http://localhost:5173`

Open that URL — you should see the login page!

---

## API Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login + get JWT |
| GET | `/api/messages` | JWT | Last 50 messages |
| GET | `/health` | No | Health check |

---

## Socket.io Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `user-online` | Client → Server | `{ userId, name }` | User joined |
| `send-message` | Client → Server | `{ content, token }` | Send a message |
| `online-users` | Server → All clients | `[{ userId, name }]` | Updated online list |
| `new-message` | Server → All clients | `{ _id, content, senderName, sender, createdAt }` | Broadcast message |

---

## Deployment

### Deploy Order: Database → Backend → Frontend

---

### 1. MongoDB Atlas (already done above)
Make sure **Network Access** allows `0.0.0.0/0` for Render to connect.

---

### 2. Deploy Backend → Render

1. Push your code to a **GitHub repository**.
2. Go to [render.com](https://render.com) → **New** → **Web Service**.
3. Connect your GitHub repo.
4. Configure:

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `node server.js` |

5. Under **Environment Variables**, add:
```
MONGO_URI      = mongodb+srv://...  (your Atlas URI)
JWT_SECRET     = your_secret_here
CLIENT_URL     = https://your-app.vercel.app
```
> You can set `CLIENT_URL` after deploying the frontend and then update it.

6. Click **Deploy** — Render will give you a URL like `https://chat-app-xxxx.onrender.com`

**Note:** Free Render services spin down after 15 minutes of inactivity. First request after that takes ~30 seconds. This is normal on the free tier.

---

### 3. Deploy Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**.
2. Import your GitHub repo.
3. Configure:

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. Under **Environment Variables**, add:
```
VITE_API_URL = https://chat-app-xxxx.onrender.com
```
(use the Render URL from Step 2)

5. Click **Deploy** — Vercel gives you a URL like `https://chat-app.vercel.app`.

6. **Update Render** → go back to your Render service → Environment → set:
```
CLIENT_URL = https://chat-app.vercel.app
```
Then **redeploy** the backend so CORS is updated.

---

## Common Issues

| Problem | Fix |
|---------|-----|
| CORS error | Make sure `CLIENT_URL` in Render matches the exact Vercel URL |
| MongoDB timeout | Check Atlas Network Access allows `0.0.0.0/0` |
| Socket.io won't connect | Confirm `VITE_API_URL` in Vercel points to your Render URL (HTTPS) |
| Render is slow first load | Normal — free tier spins down. Wait 30 seconds. |

---

## Tech Stack

- **Frontend**: React 18, Vite, socket.io-client
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB + Mongoose
- **Auth**: JWT (jsonwebtoken) + Bcrypt
- **Deployment**: Render (backend) + Vercel (frontend) + MongoDB Atlas
