# Printicom Admin Panel

A comprehensive React admin dashboard for the Printicom custom printing platform.

## 🛠️ Tech Stack

- **React 18** + Vite
- **React Router v6** — Client-side routing with protected routes
- **TanStack Query v5** — Data fetching, caching & invalidation
- **Zustand** — Auth state management with localStorage persistence
- **Axios** — HTTP client with JWT interceptors
- **Recharts** — Analytics charts
- **React Hot Toast** — Premium notifications
- **Lucide React** — Icons

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build
```

## 🔐 Environment Variables

Create a `.env` file:
```
VITE_API_URL=http://localhost:5000/api
```

## 📋 Default Admin Credentials

```
Email:    admin@printicom.in
Password: Admin@123456
```

## 📦 Features

| Module | Features |
|--------|----------|
| **Dashboard** | Stats cards, revenue chart, orders chart, recent orders & users |
| **Analytics** | Monthly revenue, orders by status, top products, cart analytics, rating distribution |
| **Categories** | CRUD, image upload, sort order, status toggle |
| **Products** | CRUD, multi-image upload, variants, featured toggle, pagination |
| **Orders** | Status management, tracking info, order timeline, detail view |
| **Coupons** | CRUD, percentage/flat discount, date scheduling, usage tracking |
| **Reviews** | Visibility toggle, admin reply, star rating display |
| **Banners** | 8 placement types, scheduling, CTR analytics, color pickers |
| **Notifications** | Broadcast to all users, type-based messaging |
| **Users** | Search, filter by role/status, detail view, activate/deactivate |
| **Settings** | General, Payments (Razorpay+COD), Shipping, Tax/GST, SEO, Maintenance mode |

## 🏗️ File Structure

```
src/
├── components/
│   ├── AdminLayout.jsx    # Layout wrapper (sidebar + topbar)
│   ├── Sidebar.jsx        # Collapsible navigation sidebar
│   ├── Topbar.jsx         # Top header bar
│   └── ProtectedRoute.jsx # Auth guard
├── lib/
│   ├── api.js             # Axios instance with JWT interceptors
│   └── utils.js           # Formatters, helpers, constants
├── pages/
│   ├── Login.jsx          # Login page
│   ├── Dashboard.jsx      # Main dashboard
│   ├── Analytics.jsx      # Analytics & reports
│   ├── Categories.jsx     # Category management
│   ├── Products.jsx       # Product catalog
│   ├── Orders.jsx         # Order management
│   ├── Coupons.jsx        # Coupon management
│   ├── Reviews.jsx        # Review moderation
│   ├── Banners.jsx        # Banner/ad management
│   ├── Notifications.jsx  # Broadcast notifications
│   ├── Users.jsx          # User management
│   └── Settings.jsx       # Site settings
├── store/
│   └── authStore.js       # Zustand auth store
├── App.jsx                # Router & route definitions
├── main.jsx               # Entry point
└── index.css              # Global design system CSS
```
