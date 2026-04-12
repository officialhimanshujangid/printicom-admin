import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/Login'
import Dashboard from './pages/Dashboard'
import Categories from './pages/Categories'
import Products from './pages/Products'
import ProductTemplate from './pages/ProductTemplate'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Coupons from './pages/Coupons'
import Reviews from './pages/Reviews'
import Banners from './pages/Banners'
import Notifications from './pages/Notifications'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import RelatedToPage from './pages/RelatedTo'
import Revenue from './pages/Revenue'
import LegalPages from './pages/LegalPages'
import FAQs from './pages/FAQs'
import ContactSubmissions from './pages/ContactSubmissions'
import WishlistOverview from './pages/WishlistOverview'
import Tickets from './pages/Tickets'
import AuditLogs from './pages/AuditLogs'
import Stock from './pages/Stock'
import BulkOrders from './pages/BulkOrders'
import Reports from './pages/Reports'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Admin Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="categories" element={<Categories />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id/template" element={<ProductTemplate />} />
          <Route path="stock" element={<Stock />} />

          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="banners" element={<Banners />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="related-to" element={<RelatedToPage />} />
          <Route path="revenue" element={<Revenue />} />
          <Route path="legal" element={<LegalPages />} />
          <Route path="faqs" element={<FAQs />} />
          <Route path="contact" element={<ContactSubmissions />} />
          <Route path="wishlist" element={<WishlistOverview />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="bulk-orders" element={<BulkOrders />} />
          <Route path="reports" element={<Reports />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
