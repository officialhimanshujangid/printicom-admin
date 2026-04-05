import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Grid3X3, ShoppingCart, Users,
  Ticket, Star, Bell, Image, Settings, BarChart3,
  LogOut, ChevronLeft, ChevronRight, MessageSquare, Heart, TrendingUp,
  FileText, HelpCircle, Mail, MessageCircle, Activity, PenTool, Boxes
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import PrinticomLogo from './PrinticomLogo'

const NAV = [
  {
    section: 'Main',
    items: [
      { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { to: '/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
      { to: '/revenue', icon: <TrendingUp size={18} />, label: 'Revenue' },
      { to: '/wishlist', icon: <Heart size={18} />, label: 'Wishlist Stats' },
    ],
  },
  {
    section: 'Catalog',
    items: [
      { to: '/categories', icon: <Grid3X3 size={18} />, label: 'Categories' },
      { to: '/products', icon: <Package size={18} />, label: 'Products' },
      { to: '/stock', icon: <Boxes size={18} />, label: 'Stock' },
      { to: '/related-to', icon: <Heart size={18} />, label: 'Related To' },
    ],
  },
  {
    section: 'Commerce',
    items: [
      { to: '/orders', icon: <ShoppingCart size={18} />, label: 'Orders' },
      { to: '/coupons', icon: <Ticket size={18} />, label: 'Coupons' },
      { to: '/reviews', icon: <Star size={18} />, label: 'Reviews' },
    ],
  },
  {
    items: [
      { to: '/banners', icon: <Image size={18} />, label: 'Banners' },
      { to: '/notifications', icon: <Bell size={18} />, label: 'Notifications' },
    ],
  },
  {
    section: 'Site Pages',
    items: [
      { to: '/legal', icon: <FileText size={18} />, label: 'Legal Pages' },
      { to: '/faqs', icon: <HelpCircle size={18} />, label: 'FAQs' },
      { to: '/bulk-orders', icon: <Boxes size={18} />, label: 'Bulk Orders' },
      { to: '/tickets', icon: <MessageCircle size={18} />, label: 'Support Tickets' },
      { to: '/contact', icon: <Mail size={18} />, label: 'Contact Inbox' },
    ],
  },
  {
    section: 'Admin',
    items: [
      { to: '/users', icon: <Users size={18} />, label: 'Users' },
      { to: '/audit-logs', icon: <Activity size={18} />, label: 'Audit Logs' },
      { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Brand */}
      <NavLink to="/dashboard" className="sidebar-brand" style={{ gap: 0, padding: '14px 16px' }}>
        {collapsed
          ? <PrinticomLogo size={34} showText={false} />
          : <PrinticomLogo size={38} showText={true} />}
      </NavLink>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV.map((section, idx) => (
          <div key={section.section || `sec_${idx}`} className="nav-section">
            <div className="nav-section-label">{section.section || 'Marketing & Content'}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* User info */}
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
  )
}
