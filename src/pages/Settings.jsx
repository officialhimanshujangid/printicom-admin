import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings as SettingsIcon, Save, AlertTriangle, Globe, CreditCard, Truck, Tag, BarChart } from 'lucide-react'
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
  const [shipping, setShipping] = useState({ freeShippingThreshold: 0, baseShippingCharge: 0, expressCharge: 0, defaultDeliveryDays: 5 })
  // ─── Tax
  const [tax, setTax] = useState({ gstEnabled: false, gstRate: 18, includedInPrice: false })
  // ─── SEO
  const [seo, setSeo] = useState({ metaTitle: '', metaDescription: '', metaKeywords: '' })
  // ─── Social
  const [social, setSocial] = useState({ instagram: '', facebook: '', twitter: '', youtube: '', whatsapp: '', pinterest: '' })
  // ─── Homepage
  const [homepage, setHomepage] = useState({
    showOfferStrip: true, offerStripText: '', offerStripBgColor: '#FF6B35', offerStripTextColor: '#FFFFFF',
    features: []
  })
  // ─── Maintenance
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' })

  useEffect(() => {
    if (!settings) return
    if (settings.general) setGeneral(settings.general)
    if (settings.payment) setPayment(settings.payment)
    if (settings.shipping) setShipping(settings.shipping)
    if (settings.tax) setTax(settings.tax)
    if (settings.seo) setSeo(settings.seo)
    if (settings.socialLinks) setSocial(settings.socialLinks)
    if (settings.homepage) setHomepage(settings.homepage)
    if (settings.maintenanceMode) setMaintenance(settings.maintenanceMode)
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
    { id: 'homepage', icon: <Globe size={15} />, label: 'Homepage / Theme' },
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
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'general'} onClick={() => save('general', { general }, '/settings/general')}>
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
                    <div className="form-group">
                      <label className="form-label">COD Extra Charge (₹)</label>
                      <input type="number" className="form-input" value={payment.cod?.extraCharge || 0} onChange={(e) => setPayment({ ...payment, cod: { ...payment.cod, extraCharge: parseFloat(e.target.value) } })} min={0} />
                    </div>
                  )}
                </div>

                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'payment'} onClick={() => save('payment', payment, '/settings/payment-methods')}>
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
                    <input type="number" className="form-input" value={shipping.freeShippingThreshold || 0} onChange={(e) => setShipping({ ...shipping, freeShippingThreshold: parseFloat(e.target.value) })} min={0} placeholder="500" />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Orders above this get free shipping (0 = disabled)</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Base Shipping Charge (₹)</label>
                    <input type="number" className="form-input" value={shipping.baseShippingCharge || 0} onChange={(e) => setShipping({ ...shipping, baseShippingCharge: parseFloat(e.target.value) })} min={0} placeholder="49" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Express Delivery Charge (₹)</label>
                    <input type="number" className="form-input" value={shipping.expressCharge || 0} onChange={(e) => setShipping({ ...shipping, expressCharge: parseFloat(e.target.value) })} min={0} placeholder="149" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Delivery Days</label>
                    <input type="number" className="form-input" value={shipping.defaultDeliveryDays || 5} onChange={(e) => setShipping({ ...shipping, defaultDeliveryDays: parseInt(e.target.value) })} min={1} />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'shipping'} onClick={() => save('shipping', shipping, '/settings/shipping')}>
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
                    <input type="checkbox" checked={tax.gstEnabled || false} onChange={(e) => setTax({ ...tax, gstEnabled: e.target.checked })} />
                    <span className="toggle-slider" />
                  </label>
                  <span className="form-label" style={{ marginBottom: 0 }}>Enable GST</span>
                </div>
                {tax.gstEnabled && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">GST Rate (%)</label>
                        <input type="number" className="form-input" value={tax.gstRate || 18} onChange={(e) => setTax({ ...tax, gstRate: parseFloat(e.target.value) })} min={0} max={100} step={0.5} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">GST Number (GSTIN)</label>
                        <input className="form-input" value={tax.gstin || ''} onChange={(e) => setTax({ ...tax, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" />
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
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'tax'} onClick={() => save('tax', tax, '/settings/tax')}>
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
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Meta Title</label>
                  <input className="form-input" value={seo.metaTitle || ''} onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })} placeholder="Printicom - Custom Printing Online" />
                  <div style={{ fontSize: 11, color: `${(seo.metaTitle?.length || 0) > 60 ? 'var(--danger)' : 'var(--text-muted)'}` }}>
                    {seo.metaTitle?.length || 0}/60 characters
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Meta Description</label>
                  <textarea className="form-textarea" value={seo.metaDescription || ''} onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })} rows={3} placeholder="Order custom printed mugs, calendars, photo prints and more..." />
                  <div style={{ fontSize: 11, color: `${(seo.metaDescription?.length || 0) > 160 ? 'var(--danger)' : 'var(--text-muted)'}` }}>
                    {seo.metaDescription?.length || 0}/160 characters
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Meta Keywords (comma separated)</label>
                  <input className="form-input" value={seo.metaKeywords || ''} onChange={(e) => setSeo({ ...seo, metaKeywords: e.target.value })} placeholder="custom printing, photo mug, personalized gifts" />
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

          {/* Homepage */}
          {activeTab === 'homepage' && (
            <div className="card">
              <div className="card-header"><h2 className="card-title">Homepage Theme & Offer Strip</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: 'var(--bg-hover)', padding: 16, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>Offer Strip / Announcement Bar</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Top bar for latest offers/news</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={homepage.showOfferStrip} onChange={e => setHomepage({ ...homepage, showOfferStrip: e.target.checked })} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  {homepage.showOfferStrip && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Offer Text</label>
                        <input className="form-input" value={homepage.offerStripText || ''} onChange={e => setHomepage({ ...homepage, offerStripText: e.target.value })} placeholder="Free Shipping on all orders! Use code WELCOME." />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Background Color</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input type="color" value={homepage.offerStripBgColor || '#FF6B35'} onChange={e => setHomepage({ ...homepage, offerStripBgColor: e.target.value })} style={{ width: 40, height: 40, padding: 0, border: 'none' }} />
                            <input className="form-input" value={homepage.offerStripBgColor || ''} onChange={e => setHomepage({ ...homepage, offerStripBgColor: e.target.value })} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Text Color</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input type="color" value={homepage.offerStripTextColor || '#FFFFFF'} onChange={e => setHomepage({ ...homepage, offerStripTextColor: e.target.value })} style={{ width: 40, height: 40, padding: 0, border: 'none' }} />
                            <input className="form-input" value={homepage.offerStripTextColor || ''} onChange={e => setHomepage({ ...homepage, offerStripTextColor: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: 16, borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 16 }}>Highlight Features Strip</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                    {(homepage.features || []).map((f, i) => (
                      <div key={i} style={{ padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                          <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Feature {i + 1} Icon</label>
                          <input className="form-input" value={f.icon || ''} onChange={e => {
                            const n = [...homepage.features]; n[i].icon = e.target.value; setHomepage({ ...homepage, features: n })
                          }} placeholder="🚚" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                          <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Title</label>
                          <input className="form-input" value={f.title || ''} onChange={e => {
                            const n = [...homepage.features]; n[i].title = e.target.value; setHomepage({ ...homepage, features: n })
                          }} placeholder="Fast Delivery" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Description</label>
                          <input className="form-input" value={f.desc || ''} onChange={e => {
                            const n = [...homepage.features]; n[i].desc = e.target.value; setHomepage({ ...homepage, features: n })
                          }} placeholder="2-5 days across India" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving === 'homepage'} onClick={() => save('homepage', { homepage }, '/settings/homepage')}>
                  <Save size={15} /> {saving === 'homepage' ? 'Saving...' : 'Save Theme Settings'}
                </button>
              </div>
            </div>
          )}

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
        </div>
      </div>
    </div>
  )
}
