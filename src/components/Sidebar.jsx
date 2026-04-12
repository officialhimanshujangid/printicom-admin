import { useState } from 'react'
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Package, Grid3X3, ShoppingCart, Users,
  Ticket, Star, Bell, Image, Settings, BarChart3,
  LogOut, ChevronLeft, ChevronRight, Heart, TrendingUp,
  FileText, HelpCircle, Mail, MessageCircle, Activity, Boxes,
  FileBarChart2, ChevronDown, ChevronUp, Receipt, BarChart2
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import api from '../lib/api'
import toast from 'react-hot-toast'
import PrinticomLogo from './PrinticomLogo'

// All possible report sub-items
const ALL_REPORTS = [
  { key: 'ordersReport',    to: '/reports?r=orders',    label: 'Order Report',        icon: <ShoppingCart size={15} /> },
  { key: 'gstReport',       to: '/reports?r=gst',       label: 'GST / Tax Report',    icon: <Receipt size={15} /> },
  { key: 'productsReport',  to: '/reports?r=products',  label: 'Product Performance', icon: <Package size={15} /> },
  { key: 'customersReport', to: '/reports?r=customers', label: 'Customer Report',     icon: <Users size={15} /> },
  { key: 'stockReport',     to: '/reports?r=stock',     label: 'Stock Report',        icon: <Boxes size={15} /> },
  { key: 'couponsReport',   to: '/reports?r=coupons',   label: 'Coupon Report',       icon: <Ticket size={15} /> },
]

const NAV = [
  {
    section: 'Main',
    items: [
      { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { to: '/analytics',  icon: <BarChart3 size={18} />,       label: 'Analytics' },
      { to: '/revenue',    icon: <TrendingUp size={18} />,       label: 'Revenue' },
      { to: '/wishlist',   icon: <Heart size={18} />,            label: 'Wishlist Stats' },
    ],
  },
  {
    section: 'Catalog',
    items: [
      { to: '/categories', icon: <Grid3X3 size={18} />,   label: 'Categories' },
      { to: '/products',   icon: <Package size={18} />,   label: 'Products' },
      { to: '/stock',      icon: <Boxes size={18} />,     label: 'Stock' },
      { to: '/related-to', icon: <Heart size={18} />,     label: 'Related To' },
    ],
  },
  {
    section: 'Commerce',
    items: [
      { to: '/orders',  icon: <ShoppingCart size={18} />, label: 'Orders' },
      { to: '/coupons', icon: <Ticket size={18} />,       label: 'Coupons' },
      { to: '/reviews', icon: <Star size={18} />,         label: 'Reviews' },
    ],
    // invoices injected dynamically below
  },
  {
    items: [
      { to: '/banners',       icon: <Image size={18} />,          label: 'Banners' },
      { to: '/notifications', icon: <Bell size={18} />,           label: 'Notifications' },
    ],
  },
  {
    section: 'Site Pages',
    items: [
      { to: '/legal',       icon: <FileText size={18} />,       label: 'Legal Pages' },
      { to: '/faqs',        icon: <HelpCircle size={18} />,     label: 'FAQs' },
      { to: '/bulk-orders', icon: <Boxes size={18} />,          label: 'Bulk Orders' },
      { to: '/tickets',     icon: <MessageCircle size={18} />,  label: 'Support Tickets' },
      { to: '/contact',     icon: <Mail size={18} />,           label: 'Contact Inbox' },
    ],
  },
  {
    section: 'Admin',
    items: [
      { to: '/users',      icon: <Users size={18} />,    label: 'Users' },
      { to: '/audit-logs', icon: <Activity size={18} />, label: 'Audit Logs' },
      { to: '/settings',   icon: <Settings size={18} />, label: 'Settings' },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen, onClose }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [reportsOpen, setReportsOpen] = useState(pathname.startsWith('/reports'))

  // Fetch settings to know which reports are visible
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data?.settings || {}),
    staleTime: 60 * 1000,
  })

  const reportVisibility = settings?.reports || {}
  const visibleReports = ALL_REPORTS.filter(r => reportVisibility[r.key] !== false)
  const invoicingEnabled = settings?.invoice?.enabled === true

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
    onClose?.()
  }

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) onClose?.()
  }

  const isReportActive = pathname.startsWith('/reports')

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        {/* Brand */}
        <NavLink to="/dashboard" className="sidebar-brand" style={{ gap: 0, padding: '14px 16px' }} onClick={handleLinkClick}>
          {collapsed
            ? <PrinticomLogo size={34} showText={false} />
            : <PrinticomLogo size={38} showText={true} />}
        </NavLink>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV.map((section, idx) => (
            <div key={section.section || `sec_${idx}`} className="nav-section">
              {!collapsed && <div className="nav-section-label">{section.section || 'Marketing & Content'}</div>}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={handleLinkClick}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}

              {/* Invoicing — shown only if enabled in settings */}
              {section.section === 'Commerce' && invoicingEnabled && (
                <NavLink
                  to="/invoices"
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={handleLinkClick}
                >
                  <span className="nav-icon"><Receipt size={18} /></span>
                  <span className="nav-label">Invoices</span>
                </NavLink>
              )}

              {/* Insert Reports section after 'Main' */}
              {section.section === 'Main' && visibleReports.length > 0 && (
                <div className="nav-section" style={{ marginTop: 2 }}>
                  {/* Reports parent toggle */}
                  <button
                    className={`nav-item${isReportActive ? ' active' : ''}`}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', justifyContent: 'space-between' }}
                    onClick={() => {
                      if (collapsed) {
                        navigate('/reports')
                        handleLinkClick()
                      } else {
                        setReportsOpen(p => !p)
                        if (!reportsOpen) navigate(visibleReports[0]?.to || '/reports')
                      }
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="nav-icon"><FileBarChart2 size={18} /></span>
                      <span className="nav-label">Reports</span>
                    </span>
                    {!collapsed && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {reportsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </span>
                    )}
                  </button>

                  {/* Report children */}
                  {!collapsed && reportsOpen && (
                    <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)', marginLeft: 18, marginTop: 2 }}>
                      {visibleReports.map(r => {
                        const activeParam = new URLSearchParams(search).get('r')
                        const myParam = new URLSearchParams(r.to.split('?')[1]).get('r')
                        const isActive = pathname === '/reports' && activeParam === myParam
                        return (
                          <Link
                            key={r.key}
                            to={r.to}
                            className={`nav-item${isActive ? ' active' : ''}`}
                            style={{ paddingLeft: 10, marginBottom: 1, fontSize: 13 }}
                            onClick={handleLinkClick}
                          >
                            <span className="nav-icon" style={{ width: 18 }}>{r.icon}</span>
                            <span className="nav-label">{r.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', marginBottom: 8 }}>
              <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: 12 }}>
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Administrator</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: collapsed ? 'center' : 'flex-start' }} onClick={handleLogout}>
              <LogOut size={15} />
              {!collapsed && <span>Logout</span>}
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
