import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const TITLES = {
  '/dashboard': 'Dashboard',
  '/analytics': 'Analytics',
  '/categories': 'Categories',
  '/products': 'Products',

  '/orders': 'Orders',
  '/coupons': 'Coupons',
  '/reviews': 'Reviews',
  '/banners': 'Banners',
  '/notifications': 'Notifications',
  '/users': 'Users',
  '/settings': 'Settings',
  '/related-to': 'Related To (Occasions)',
  '/revenue': 'Revenue',
  '/legal': 'Legal Pages',
  '/faqs': 'FAQs',
  '/contact': 'Contact Submissions',
  '/wishlist': 'Wishlist Analytics',
  '/reports': 'Reports',
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  const title = Object.entries(TITLES).find(([p]) => pathname.startsWith(p))?.[1] || 'Printicom Admin'

  return (
    <div className="admin-layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((p) => !p)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Topbar title={title} onMobileToggle={() => setMobileOpen((p) => !p)} />
        <div className="page-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
