import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings as SettingsIcon, Save, AlertTriangle, Globe, CreditCard, Truck, Tag, BarChart, Palette, FileBarChart2, Receipt, Eye, EyeOff } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { extractError } from '../lib/utils'

const fetchSettings = async () => {
  const { data } = await api.get('/settings')
  return data.data?.settings || data.data || {}
}

export default function Settings() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(null)

  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })

  // ─── General
  const [general, setGeneral] = useState({ siteName: '', tagline: '', contactEmail: '', contactPhone: '', address: '' })
  // ─── Payment
  const [payment, setPayment] = useState({ razorpay: { enabled: true }, cod: { enabled: true, label: 'Cash on Delivery', extraCharge: 0 } })
  // ─── Shipping
  const [shipping, setShipping] = useState({ freeShippingThreshold: 0, standardShippingCharge: 0, expressShippingCharge: 0 })
  const [shiprocket, setShiprocket] = useState({ enabled: false, email: '', password: '' })
  // ─── Tax  (field names match the DB schema exactly)
  const [tax, setTax] = useState({ enabled: false, gstPercentage: 18, gstNumber: '', includedInPrice: false })
  // ─── SEO
  const [seo, setSeo] = useState({
    metaTitle: '', metaDescription: '', metaKeywords: '',
    ogTitle: '', ogDescription: '', ogImage: '',
    twitterCard: 'summary_large_image', robots: 'index, follow', canonicalUrl: ''
  })
  // ─── Social
  const [social, setSocial] = useState({ instagram: '', facebook: '', twitter: '', youtube: '', whatsapp: '', pinterest: '' })
  // ─── Theme Colors
  const [theme, setTheme] = useState({
    primary: '#FF6B35', primaryLight: '#FF8C5A', primaryDark: '#E05520',
    accent: '#FFB347', accentLight: '#FFC875',
    bgBase: '#09090F', bgSurface: '#111118', bgElevated: '#18181F',
    textPrimary: '#F2F2F7', textSecondary: 'rgba(242,242,247,0.7)',
    textMuted: 'rgba(242,242,247,0.4)', borderColor: 'rgba(255,255,255,0.08)',
    borderFocus: 'rgba(255,107,53,0.5)',
  })
  // ─── Maintenance
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' })
  // ─── Reports Visibility
  const [reportToggles, setReportToggles] = useState({
    ordersReport: true, gstReport: true, productsReport: true,
    customersReport: true, stockReport: true, couponsReport: true, invoicesReport: true,
  })
  // ─── Invoice Settings
  const [invoiceSettings, setInvoiceSettings] = useState({
    enabled: false,
    invoicePrefix: 'INV',
    businessState: '',
    defaultDueDays: 15,
    defaultTerms: 'Payment is due within 15 days of invoice date.',
    cancellationPolicy: '',
    allowCancellation: true,
    allowRevoke: true,
    emailOnCreate: false,
    sendWhatsApp: false,
    whatsAppApiKey: '',
    whatsAppPhoneNumberId: '',
    autoDeductStock: false,
  })
  const [showWaKey, setShowWaKey] = useState(false)

  useEffect(() => {
    if (!settings) return
    setGeneral({
      siteName: settings.siteName || '',
      tagline: settings.tagline || '',
      contactEmail: settings.supportEmail || '',
      contactPhone: settings.supportPhone || '',
      address: settings.address || ''
    })
    if (settings.paymentMethods) {
      const p = { ...settings.paymentMethods }
      if (settings.shipping) {
        if (!p.cod) p.cod = {}
        p.cod.extraCharge = settings.shipping.codExtraCharge || 0
        p.cod.maxOrderAmount = settings.shipping.codMaxOrderAmount || 5000
      }
      setPayment(p)
    }
    if (settings.shipping) setShipping({ ...settings.shipping })
    if (settings.shiprocket) setShiprocket({ ...settings.shiprocket })
    if (settings.tax) setTax({ ...settings.tax })
    if (settings.seo) setSeo({ ...settings.seo })
    if (settings.socialLinks) setSocial({ ...settings.socialLinks })
    if (settings.maintenanceMode) setMaintenance({ ...settings.maintenanceMode })
    if (settings.theme) setTheme({ ...settings.theme })
    if (settings.reports) setReportToggles({ ...settings.reports })
    if (settings.invoice) setInvoiceSettings(prev => ({ ...prev, ...settings.invoice, whatsAppApiKey: '' }))
  }, [settings])

  const save = async (section, payload, endpoint) => {
    setSaving(section)
    try {
      await api.put(endpoint, payload)
      toast.success('Settings saved!')
      qc.invalidateQueries({ queryKey: ['settings'] })
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(null)
    }
  }

  const toggleMaintenance = async () => {
    setSaving('maintenance')
    try {
      await api.patch('/settings/maintenance', { enabled: !maintenance.enabled, message: maintenance.message })
      setMaintenance(m => ({ ...m, enabled: !m.enabled }))
      toast.success(`Maintenance mode ${!maintenance.enabled ? 'enabled' : 'disabled'}!`)
      qc.invalidateQueries({ queryKey: ['settings'] })
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(null)
    }
  }

  const TABS = [
    { id: 'general', icon: <Globe size={15} />, label: 'General' },
    { id: 'payment', icon: <CreditCard size={15} />, label: 'Payments' },
    { id: 'shipping', icon: <Truck size={15} />, label: 'Shipping' },
    { id: 'tax', icon: <Tag size={15} />, label: 'Tax & GST' },
    { id: 'seo', icon: <BarChart size={15} />, label: 'SEO' },
    { id: 'social', icon: <Globe size={15} />, label: 'Social Links' },
    { id: 'theme', icon: <Palette size={15} />, label: 'Client Theme' },
    { id: 'reports', icon: <FileBarChart2 size={15} />, label: 'Reports' },
    { id: 'invoice', icon: <Receipt size={15} />, label: 'Invoice Settings' },
    { id: 'maintenance', icon: <AlertTriangle size={15} />, label: 'Maintenance' },
  ]

  if (isLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Site Settings</h1>
          <p className="page-subtitle">Configure your storefront and platform settings</p>
        </div>
      </div>

      <div className="page-body-wrapper">
        {/* Sidebar Nav */}
        <div className="page-sidebar card" style={{ padding: 8 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ borderRadius: 8, marginBottom: 2, borderLeft: 'none', width: '100%' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="page-content">
          {/* General */}
          {activeTab === 'general' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">General Settings</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Site Name</label>
                    <input className="form-input" value={general.siteName || ''} onChange={(e) => setGeneral({ ...general, siteName: e.target.value })} placeholder="Printicom" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tagline</label>
                    <input className="form-input" value={general.tagline || ''} onChange={(e) => setGeneral({ ...general, tagline: e.target.value })} placeholder="Your Custom Printing Partner" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Email</label>
                    <input type="email" className="form-input" value={general.contactEmail || ''} onChange={(e) => setGeneral({ ...general, contactEmail: e.target.value })} placeholder="hello@printicom.in" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input className="form-input" value={general.contactPhone || ''} onChange={(e) => setGeneral({ ...general, contactPhone: e.target.value })} placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea className="form-textarea" value={general.address || ''} onChange={(e) => setGeneral({ ...general, address: e.target.value })} rows={2} placeholder="Business address..." />
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'general'} onClick={() => {
                  const payload = {
                    siteName: general.siteName,
                    tagline: general.tagline,
                    supportEmail: general.contactEmail,
                    supportPhone: general.contactPhone,
                    address: general.address
                  }
                  save('general', payload, '/settings/general')
                }}>
                  <Save size={15} /> {saving === 'general' ? 'Saving...' : 'Save General Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Payment */}
          {activeTab === 'payment' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Payment Methods</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Razorpay */}
                <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>💳 Razorpay</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Online payment gateway</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={payment.razorpay?.enabled || false} onChange={(e) => setPayment({ ...payment, razorpay: { ...payment.razorpay, enabled: e.target.checked } })} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  {payment.razorpay?.enabled && (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Razorpay Key ID</label>
                        <input className="form-input" value={payment.razorpay?.keyId || ''} onChange={(e) => setPayment({ ...payment, razorpay: { ...payment.razorpay, keyId: e.target.value } })} placeholder="rzp_live_..." />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Key Secret</label>
                        <input type="password" className="form-input" value={payment.razorpay?.keySecret || ''} onChange={(e) => setPayment({ ...payment, razorpay: { ...payment.razorpay, keySecret: e.target.value } })} placeholder="••••••••" />
                      </div>
                    </div>
                  )}
                </div>

                {/* COD */}
                <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>💵 Cash on Delivery</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pay when package arrives</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={payment.cod?.enabled || false} onChange={(e) => setPayment({ ...payment, cod: { ...payment.cod, enabled: e.target.checked } })} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  {payment.cod?.enabled && (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">COD Extra Charge (₹)</label>
                        <input type="number" className="form-input" value={payment.cod?.extraCharge || 0} onChange={(e) => setPayment({ ...payment, cod: { ...payment.cod, extraCharge: parseFloat(e.target.value) || 0 } })} min={0} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Max Order Amount (₹)</label>
                        <input type="number" className="form-input" value={payment.cod?.maxOrderAmount || 0} onChange={(e) => setPayment({ ...payment, cod: { ...payment.cod, maxOrderAmount: parseFloat(e.target.value) || 0 } })} min={0} />
                      </div>
                    </div>
                  )}
                </div>

                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'payment'} onClick={() => save('payment', { paymentMethods: payment }, '/settings/payment-methods')}>
                  <Save size={15} /> {saving === 'payment' ? 'Saving...' : 'Save Payment Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Shipping */}
          {activeTab === 'shipping' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Shipping Configuration</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Free Shipping Threshold (₹)</label>
                    <input type="number" className="form-input" value={shipping.freeShippingThreshold || 0} onChange={(e) => setShipping({ ...shipping, freeShippingThreshold: parseFloat(e.target.value) || 0 })} min={0} placeholder="500" />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Orders above this get free shipping (0 = disabled)</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Standard Shipping Charge (₹)</label>
                    <input type="number" className="form-input" value={shipping.standardShippingCharge !== undefined ? shipping.standardShippingCharge : 0} onChange={(e) => setShipping({ ...shipping, standardShippingCharge: parseFloat(e.target.value) || 0 })} min={0} placeholder="49" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Express Delivery Charge (₹)</label>
                    <input type="number" className="form-input" value={shipping.expressShippingCharge !== undefined ? shipping.expressShippingCharge : 0} onChange={(e) => setShipping({ ...shipping, expressShippingCharge: parseFloat(e.target.value) || 0 })} min={0} placeholder="149" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Enable Express Shipping</label>
                    <label className="toggle" style={{ marginTop: 10 }}>
                      <input type="checkbox" checked={shipping.expressShippingEnabled || false} onChange={(e) => setShipping({ ...shipping, expressShippingEnabled: e.target.checked })} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: 24, padding: 20, background: 'var(--bg-hover)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        🚀 Shiprocket Integration
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Enable automated AWB generation and order tracking via Courier APIs.
                      </p>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={shiprocket.enabled || false} onChange={(e) => setShiprocket({ ...shiprocket, enabled: e.target.checked })} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  {shiprocket.enabled && (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Shiprocket API Email</label>
                        <input className="form-input" type="email" value={shiprocket.email || ''} onChange={(e) => setShiprocket({ ...shiprocket, email: e.target.value })} placeholder="merchant@example.com" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Shiprocket Password</label>
                        <input className="form-input" type="password" value={shiprocket.password || ''} onChange={(e) => setShiprocket({ ...shiprocket, password: e.target.value })} placeholder="••••••••" />
                      </div>
                    </div>
                  )}
                </div>

                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'shipping'} onClick={() => save('shipping', { shipping, shiprocket }, '/settings/shipping')}>
                  <Save size={15} /> {saving === 'shipping' ? 'Saving...' : 'Save Shipping Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Tax */}
          {activeTab === 'tax' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Tax & GST Settings</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label className="toggle">
                    <input type="checkbox" checked={tax.enabled || false} onChange={(e) => setTax({ ...tax, enabled: e.target.checked })} />
                    <span className="toggle-slider" />
                  </label>
                  <span className="form-label" style={{ marginBottom: 0 }}>Enable GST</span>
                </div>
                {tax.enabled && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">GST Rate (%)</label>
                        <input type="number" className="form-input" value={tax.gstPercentage || 18} onChange={(e) => setTax({ ...tax, gstPercentage: parseFloat(e.target.value) })} min={0} max={100} step={0.5} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">GST Number (GSTIN)</label>
                        <input className="form-input" value={tax.gstNumber || ''} onChange={(e) => setTax({ ...tax, gstNumber: e.target.value })} placeholder="22AAAAA0000A1Z5" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label className="toggle">
                        <input type="checkbox" checked={tax.includedInPrice || false} onChange={(e) => setTax({ ...tax, includedInPrice: e.target.checked })} />
                        <span className="toggle-slider" />
                      </label>
                      <div>
                        <span className="form-label" style={{ marginBottom: 0 }}>GST included in product price</span>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>If unchecked, GST will be added on checkout</div>
                      </div>
                    </div>
                  </>
                )}
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'tax'} onClick={() => save('tax', { tax }, '/settings/tax')}>
                  <Save size={15} /> {saving === 'tax' ? 'Saving...' : 'Save Tax Settings'}
                </button>
              </div>
            </div>
          )}

          {/* SEO */}
          {activeTab === 'seo' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">SEO Settings</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Control how your site appears in search results and when shared on social media.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '12px 16px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>🔍 Basic Meta Tags</div>
                  <div className="form-group">
                    <label className="form-label">Meta Title <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(50–60 chars ideal)</span></label>
                    <input className="form-input" value={seo.metaTitle || ''} onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })} placeholder="Printicom - Custom Printing Online" />
                    <div style={{ fontSize: 11, color: `${(seo.metaTitle?.length || 0) > 60 ? 'var(--danger)' : 'var(--text-muted)'}`, marginTop: 4 }}>
                      {seo.metaTitle?.length || 0}/60 characters
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Meta Description <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(150–160 chars ideal)</span></label>
                    <textarea className="form-textarea" value={seo.metaDescription || ''} onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })} rows={3} placeholder="Order custom printed mugs, calendars, photo prints and more..." />
                    <div style={{ fontSize: 11, color: `${(seo.metaDescription?.length || 0) > 160 ? 'var(--danger)' : 'var(--text-muted)'}`, marginTop: 4 }}>
                      {seo.metaDescription?.length || 0}/160 characters
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Meta Keywords <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(comma separated)</span></label>
                    <input className="form-input" value={seo.metaKeywords || ''} onChange={(e) => setSeo({ ...seo, metaKeywords: e.target.value })} placeholder="custom printing, photo mug, personalized gifts" />
                  </div>
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '12px 16px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>📱 Open Graph (Facebook / WhatsApp Sharing)</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">OG Title</label>
                      <input className="form-input" value={seo.ogTitle || ''} onChange={(e) => setSeo({ ...seo, ogTitle: e.target.value })} placeholder="Same as Meta Title if left blank" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">OG Image URL</label>
                      <input className="form-input" value={seo.ogImage || ''} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} placeholder="https://your-site.com/og-image.jpg (1200x630)" />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">OG Description</label>
                    <textarea className="form-textarea" value={seo.ogDescription || ''} onChange={(e) => setSeo({ ...seo, ogDescription: e.target.value })} rows={2} placeholder="Shown when shared on Facebook / WhatsApp" />
                  </div>
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '12px 16px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>🐦 Twitter / X Card</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Twitter Card Type</label>
                      <select className="form-select" value={seo.twitterCard || 'summary_large_image'} onChange={(e) => setSeo({ ...seo, twitterCard: e.target.value })}>
                        <option value="summary_large_image">Summary Large Image (Recommended)</option>
                        <option value="summary">Summary (Small thumbnail)</option>
                        <option value="app">App</option>
                        <option value="player">Player</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Canonical URL</label>
                      <input className="form-input" value={seo.canonicalUrl || ''} onChange={(e) => setSeo({ ...seo, canonicalUrl: e.target.value })} placeholder="https://printicom.in" />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Helps avoid duplicate content penalties</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '12px 16px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>🤖 Crawling & Indexing</div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Robots Directive</label>
                    <select className="form-select" value={seo.robots || 'index, follow'} onChange={(e) => setSeo({ ...seo, robots: e.target.value })}>
                      <option value="index, follow">index, follow (Recommended — full indexing)</option>
                      <option value="noindex, follow">noindex, follow (Don't index this page)</option>
                      <option value="index, nofollow">index, nofollow (Index but don't follow links)</option>
                      <option value="noindex, nofollow">noindex, nofollow (Block completely)</option>
                    </select>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Controls what search engines can crawl and index globally</div>
                  </div>
                </div>

                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'seo'} onClick={() => save('seo', { seo }, '/settings/seo')}>
                  <Save size={15} /> {saving === 'seo' ? 'Saving...' : 'Save SEO Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Social Links */}
          {activeTab === 'social' && (
            <div className="card">
              <div className="card-header"><h2 className="card-title">Social Media Connections</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Instagram URL</label>
                    <input className="form-input" value={social.instagram || ''} onChange={e => setSocial({ ...social, instagram: e.target.value })} placeholder="https://instagram.com/..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Facebook URL</label>
                    <input className="form-input" value={social.facebook || ''} onChange={e => setSocial({ ...social, facebook: e.target.value })} placeholder="https://facebook.com/..." />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">WhatsApp Number</label>
                    <input className="form-input" value={social.whatsapp || ''} onChange={e => setSocial({ ...social, whatsapp: e.target.value })} placeholder="+919876543210" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">YouTube Channel</label>
                    <input className="form-input" value={social.youtube || ''} onChange={e => setSocial({ ...social, youtube: e.target.value })} placeholder="https://youtube.com/c/..." />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'social'} onClick={() => save('social', { socialLinks: social }, '/settings/social-links')}>
                  <Save size={15} /> {saving === 'social' ? 'Saving...' : 'Save Social Links'}
                </button>
              </div>
            </div>
          )}



          {/* Client Theme Colors */}
          {activeTab === 'theme' && (() => {
            const ColorRow = ({ label, hint, field }) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>
                  {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ position: 'relative', cursor: 'pointer' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, border: '2px solid var(--border)',
                      background: theme[field], cursor: 'pointer',
                    }} />
                    <input
                      type="color"
                      value={theme[field]?.startsWith('#') ? theme[field] : '#FF6B35'}
                      onChange={(e) => setTheme({ ...theme, [field]: e.target.value })}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                  </label>
                  <input
                    className="form-input"
                    value={theme[field] || ''}
                    onChange={(e) => setTheme({ ...theme, [field]: e.target.value })}
                    style={{ width: 192, fontFamily: 'monospace', fontSize: 13 }}
                    placeholder="#FF6B35 or rgba(...)"
                  />
                </div>
              </div>
            )
            return (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="card-header">
                  <h2 className="card-title">🎨 Client Panel Theme Colors</h2>
                </div>

                <div className='' style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: theme.bgBase, padding: '0 0 1px' }}>
                  <div style={{ height: 8, background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryDark}, ${theme.accent})` }} />
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: theme.primary }}>Printicom</div>
                    <div style={{ flex: 1, fontSize: 12, color: theme.textSecondary }}>Live preview of your brand colors</div>
                    <div style={{ padding: '6px 16px', borderRadius: 20, background: theme.primary, color: '#fff', fontSize: 12, fontWeight: 600 }}>Button</div>
                    <div style={{ padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${theme.primary}`, color: theme.primary, fontSize: 12, fontWeight: 600 }}>Outline</div>
                  </div>
                  <div style={{ padding: '8px 16px', background: theme.bgSurface, display: 'flex', gap: 20 }}>
                    <span style={{ fontSize: 12, color: theme.textPrimary }}>Primary text</span>
                    <span style={{ fontSize: 12, color: theme.textSecondary }}>Secondary</span>
                    <span style={{ fontSize: 12, color: theme.textMuted }}>Muted</span>
                    <span style={{ fontSize: 12, color: theme.accent }}>Accent</span>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                  ⚡ When you save, all connected client browsers will automatically receive the new colors on their next API call — no manual refresh needed.
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '4px 16px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '14px 0 4px' }}>🎯 Brand / Primary Colors</div>
                  <ColorRow field="primary" label="Primary Color" hint="Buttons, links, active states" />
                  <ColorRow field="primaryLight" label="Primary Light" hint="Hover states, gradients" />
                  <ColorRow field="primaryDark" label="Primary Dark" hint="Button gradient end, pressed" />
                  <ColorRow field="accent" label="Accent Color" hint="Stars, highlights, tags" />
                  <ColorRow field="accentLight" label="Accent Light" hint="Lighter accent variant" />
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '4px 16px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '14px 0 4px' }}>🌑 Background Colors</div>
                  <ColorRow field="bgBase" label="Background Base" hint="Page background (darkest)" />
                  <ColorRow field="bgSurface" label="Surface Background" hint="Header, footer, cards" />
                  <ColorRow field="bgElevated" label="Elevated Background" hint="Inputs, sidebars, modals" />
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '4px 16px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '14px 0 4px' }}>✏️ Text Colors</div>
                  <ColorRow field="textPrimary" label="Primary Text" hint="Main headings and body text" />
                  <ColorRow field="textSecondary" label="Secondary Text" hint="Paragraphs, descriptions" />
                  <ColorRow field="textMuted" label="Muted Text" hint="Placeholders, metadata, hints" />
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '4px 16px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '14px 0 4px' }}>🔲 Border Colors</div>
                  <ColorRow field="borderColor" label="Default Border" hint="Cards, inputs, separators" />
                  <ColorRow field="borderFocus" label="Focus Border" hint="Input focus ring color" />
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" onClick={() => setTheme({
                    primary: '#FF6B35', primaryLight: '#FF8C5A', primaryDark: '#E05520',
                    accent: '#FFB347', accentLight: '#FFC875',
                    bgBase: '#09090F', bgSurface: '#111118', bgElevated: '#18181F',
                    textPrimary: '#F2F2F7', textSecondary: 'rgba(242,242,247,0.7)',
                    textMuted: 'rgba(242,242,247,0.4)', borderColor: 'rgba(255,255,255,0.08)',
                    borderFocus: 'rgba(255,107,53,0.5)',
                  })}>Reset to Defaults</button>
                  <button className="btn btn-primary" disabled={saving === 'theme'} onClick={() => save('theme', { theme }, '/settings/theme')}>
                    <Save size={15} /> {saving === 'theme' ? 'Saving...' : 'Save & Push to Client'}
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Maintenance */}
          {activeTab === 'maintenance' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Maintenance Mode</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{
                  background: maintenance.enabled ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                  border: `1px solid ${maintenance.enabled ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                  borderRadius: 12, padding: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: maintenance.enabled ? 'var(--danger)' : 'var(--success)' }}>
                        {maintenance.enabled ? '⚠️ Maintenance Mode is ON' : '✅ Site is Live'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {maintenance.enabled ? 'All client requests are blocked' : 'Your storefront is accessible to customers'}
                      </div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={maintenance.enabled} onChange={toggleMaintenance} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Maintenance Message</label>
                  <textarea className="form-textarea" value={maintenance.message || ''} onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })} rows={3} placeholder="We're updating our site. Back soon!" />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>This message will be shown to visitors during maintenance</div>
                </div>
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: 'var(--warning)' }}>
                  <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Admin routes (/api/admin) remain accessible during maintenance
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Reports Visibility</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Control which reports are visible in the Reports section. Disabled reports will still collect data but won't be accessible to admins.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { key: 'ordersReport',    label: 'Order Report',        desc: 'Orders, revenue, payment breakdown by date range' },
                  { key: 'gstReport',       label: 'GST / Tax Report',    desc: 'GST collected per product, monthly trend, GSTIN summary' },
                  { key: 'productsReport',  label: 'Product Performance', desc: 'Top products by revenue, units sold, zero-sales alerts' },
                  { key: 'customersReport', label: 'Customer Report',     desc: 'Top buyers, new vs returning, registration trends' },
                  { key: 'stockReport',     label: 'Stock Report',        desc: 'Inventory levels, low stock alerts, category breakdown' },
                  { key: 'couponsReport',   label: 'Coupon Report',       desc: 'Coupon usage, discounts given, active/expired status' },
                  { key: 'invoicesReport',  label: 'Invoice Report',      desc: 'Invoice summaries, GST breakdown, status tracking' },
                ].map(r => (
                  <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.desc}</div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={reportToggles[r.key] !== false}
                        onChange={e => setReportToggles(prev => ({ ...prev, [r.key]: e.target.checked }))}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 20 }} disabled={saving === 'reports'}
                  onClick={() => save('reports', { reports: reportToggles }, '/settings/reports-visibility')}>
                  <Save size={15} /> {saving === 'reports' ? 'Saving...' : 'Save Report Settings'}
                </button>
              </div>
            </div>
          )}

          {/* ── Invoice Settings ─────────────────────────────── */}
          {activeTab === 'invoice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Master Toggle */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 className="card-title">🧾 Invoicing Module</h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Enable to show Invoices in the sidebar and start creating invoices for clients.
                    </p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={invoiceSettings.enabled} onChange={e => setInvoiceSettings(p => ({ ...p, enabled: e.target.checked }))} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                {!invoiceSettings.enabled && (
                  <div style={{ marginTop: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--warning)' }}>
                    ⚡ Invoicing is currently <strong>disabled</strong>. Toggle on to enable it. The Invoices menu item will appear in the sidebar.
                  </div>
                )}
              </div>

              {invoiceSettings.enabled && (<>
                {/* Invoice Series */}
                <div className="card">
                  <div className="card-header"><h2 className="card-title">📋 Invoice Series</h2></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Invoice Prefix</label>
                        <input className="form-input" value={invoiceSettings.invoicePrefix} onChange={e => setInvoiceSettings(p => ({ ...p, invoicePrefix: e.target.value }))} placeholder="INV" style={{ fontFamily: 'monospace' }} />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Series resets yearly. Example: <strong>INV-2025-0001</strong></div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Default Due Days</label>
                        <input type="number" className="form-input" value={invoiceSettings.defaultDueDays} min={0} onChange={e => setInvoiceSettings(p => ({ ...p, defaultDueDays: parseInt(e.target.value) || 0 }))} />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Days after issue date before payment is due</div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Business State (for GST logic)</label>
                      <select className="form-select" value={invoiceSettings.businessState} onChange={e => setInvoiceSettings(p => ({ ...p, businessState: e.target.value }))}>
                        <option value="">Select your state…</option>
                        {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Chandigarh'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>If client state = this → CGST+SGST. Otherwise → IGST.</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Default Terms & Conditions</label>
                      <textarea className="form-textarea" rows={3} value={invoiceSettings.defaultTerms} onChange={e => setInvoiceSettings(p => ({ ...p, defaultTerms: e.target.value }))} placeholder="Payment terms, late fees, etc..." />
                    </div>
                  </div>
                </div>

                {/* Cancellation & Revocation */}
                <div className="card">
                  <div className="card-header"><h2 className="card-title">⛔ Cancellation & Revocation</h2></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Allow Invoice Cancellation</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Admin can cancel invoices with a reason</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={invoiceSettings.allowCancellation} onChange={e => setInvoiceSettings(p => ({ ...p, allowCancellation: e.target.checked }))} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Allow Invoice Revocation</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cancelled invoices can be revoked and restored to Draft</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={invoiceSettings.allowRevoke} onChange={e => setInvoiceSettings(p => ({ ...p, allowRevoke: e.target.checked }))} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cancellation Policy (shown in docs)</label>
                      <textarea className="form-textarea" rows={2} value={invoiceSettings.cancellationPolicy} onChange={e => setInvoiceSettings(p => ({ ...p, cancellationPolicy: e.target.value }))} placeholder="Describe your cancellation policy..." />
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div className="card">
                  <div className="card-header"><h2 className="card-title">📤 Invoice Delivery</h2></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Auto-email */}
                    <div style={{ padding: 16, background: 'var(--bg-hover)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>✉ Auto-send email when invoice is created</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uses your SMTP settings to email client immediately</div>
                        </div>
                        <label className="toggle">
                          <input type="checkbox" checked={invoiceSettings.emailOnCreate} onChange={e => setInvoiceSettings(p => ({ ...p, emailOnCreate: e.target.checked }))} />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div style={{ padding: 16, background: 'var(--bg-hover)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>💬 Enable WhatsApp Delivery</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send invoices via WhatsApp (Meta Cloud API)</div>
                        </div>
                        <label className="toggle">
                          <input type="checkbox" checked={invoiceSettings.sendWhatsApp} onChange={e => setInvoiceSettings(p => ({ ...p, sendWhatsApp: e.target.checked }))} />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                      {invoiceSettings.sendWhatsApp && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#25D366' }}>
                            📌 Using <strong>Meta Cloud API (WhatsApp Business)</strong>. Get your credentials from <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" style={{ color: '#25D366' }}>Meta Developer Console</a>.
                          </div>
                          <div className="form-group">
                            <label className="form-label">Phone Number ID</label>
                            <input className="form-input" value={invoiceSettings.whatsAppPhoneNumberId} onChange={e => setInvoiceSettings(p => ({ ...p, whatsAppPhoneNumberId: e.target.value }))} placeholder="123456789012345" style={{ fontFamily: 'monospace' }} />
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Found in Meta Business → WhatsApp → Phone Numbers</div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">API Key (Bearer Token)</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input
                                type={showWaKey ? 'text' : 'password'}
                                className="form-input"
                                value={invoiceSettings.whatsAppApiKey}
                                onChange={e => setInvoiceSettings(p => ({ ...p, whatsAppApiKey: e.target.value }))}
                                placeholder="EAAxxxxxxxxxx..."
                                style={{ fontFamily: 'monospace', flex: 1 }}
                              />
                              <button className="btn btn-ghost btn-icon" onClick={() => setShowWaKey(p => !p)}>
                                {showWaKey ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Permanent API access token from Meta</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inventory */}
                <div className="card">
                  <div className="card-header"><h2 className="card-title">📦 Inventory Integration</h2></div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Auto-deduct stock on invoice creation</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>When invoice items are linked to products, reduce stock automatically</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={invoiceSettings.autoDeductStock} onChange={e => setInvoiceSettings(p => ({ ...p, autoDeductStock: e.target.checked }))} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </>)}

              <button
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
                disabled={saving === 'invoice'}
                onClick={() => save('invoice', { invoice: invoiceSettings }, '/settings/invoice')}
              >
                <Save size={15} /> {saving === 'invoice' ? 'Saving...' : 'Save Invoice Settings'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

