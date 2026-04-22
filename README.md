# 🚗 Drive Academy — Attendance (Next.js)

Full-stack attendance management system built with **Next.js 14 App Router + MongoDB**.  
Single repo, zero separate backend server — all API routes live inside Next.js.

---

## Stack

| Layer     | Technology                                  |
|-----------|---------------------------------------------|
| Framework | Next.js 14 (App Router)                     |
| Database  | MongoDB + Mongoose                          |
| Auth      | JWT (jsonwebtoken) + bcryptjs               |
| PWA       | next-pwa (Workbox service worker)           |
| Styling   | Tailwind CSS + CSS variables                |

---

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/drive-academy
JWT_SECRET=change-this-to-a-long-random-secret
```

### 3. Run development
```bash
npm run dev
```
Open http://localhost:3000

### 4. Production build
```bash
npm run build
npm start
```

---

## Default Admin Credentials
```
username: admin
password: Admin@1234
```
> ⚠️ Change this immediately via Admin Panel → Change Password.

Auto-seeded on first request if no students/admin exist.

---

## Project Structure

```
src/
├── app/
│   ├── layout.js               # Root layout + PWA metadata
│   ├── page.js                 # Public attendance page
│   ├── login/page.js           # Admin login
│   ├── admin/page.js           # Admin panel (protected)
│   └── api/
│       ├── auth/
│       │   ├── login/          # POST — login, returns JWT
│       │   ├── me/             # GET  — verify token
│       │   └── change-password/# POST — change admin password
│       ├── students/
│       │   ├── route.js        # GET (public list) / POST (add)
│       │   └── [id]/route.js   # PUT / DELETE
│       ├── attendance/
│       │   ├── route.js        # GET attendance for date
│       │   ├── mark/           # POST — mark one student
│       │   ├── mark-all/       # POST — bulk mark
│       │   └── history/[id]/   # GET — student history
│       └── settings/
│           ├── route.js        # GET settings
│           └── off-days/       # PUT — update off days
├── components/
│   ├── Providers.jsx           # AuthProvider + layout wrapper
│   ├── Navbar.jsx              # Top navigation
│   └── PWA.jsx                 # InstallPrompt, OfflineBanner, UpdateToast
├── hooks/
│   └── useAuth.jsx             # Auth context (login/logout/authFetch)
├── lib/
│   ├── db.js                   # Mongoose singleton (HMR-safe)
│   ├── auth.js                 # JWT helpers + requireAdmin()
│   └── seed.js                 # Auto-seed students + admin
├── models/
│   ├── Student.js
│   ├── Attendance.js
│   ├── Settings.js
│   └── User.js
└── utils/
    └── rotation.js             # Daily list rotation logic
```

---

## PWA Features

- **Installable** — "Add to Home Screen" prompt on Android/iOS/Desktop
- **Offline** — Student list and attendance cached (NetworkFirst, 5s timeout)
- **Fonts cached** — Google Fonts served from cache after first load
- **Auto-update toast** — Notifies when a new version is deployed
- **Offline banner** — Red bar when device goes offline
- Service worker is **disabled in development** (`NODE_ENV=development`) and active in production build only

## Rotation Logic

- List **reverses** every working day — last student becomes first
- **Off days** (default: Friday + Saturday) skip rotation
- Rotation is persisted in MongoDB — survives server restarts
- Configurable from Admin Panel

## Deployment (Vercel)

```bash
# Push to GitHub, then in Vercel dashboard:
# 1. Import repo
# 2. Set environment variables:
#    MONGODB_URI=<your Atlas URI>
#    JWT_SECRET=<random 32+ char string>
# 3. Deploy — no extra config needed
```
