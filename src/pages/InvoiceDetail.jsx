import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Send, Download, Mail, MessageCircle, Trash2,
  Plus, Minus, User, Package, RefreshCw, Eye, AlertTriangle, CheckCircle
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatCurrency, extractError } from '../lib/utils'

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand','Karnataka','Kerala',
  'Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Chandigarh',
]

const GST_RATES = [0, 5, 12, 18, 28]

const fetchSettings = () => api.get('/settings').then(r => r.data.data?.settings || {})

function computeLineItem(item, gstType) {
  const unitPrice   = parseFloat(item.unitPrice)  || 0
  const qty         = parseInt(item.qty)           || 1
  const discount    = parseFloat(item.discount)    || 0
  const gstRate     = parseFloat(item.gstRate)     || 0
  const taxable     = (unitPrice - discount) * qty
  let cgst = 0, sgst = 0, igst = 0
  const effectiveGstType = gstRate > 0 ? gstType : 'none'
  if (effectiveGstType === 'cgst_sgst') {
    cgst = Math.round(taxable * (gstRate / 2) / 100 * 100) / 100
    sgst = cgst
  } else if (effectiveGstType === 'igst') {
    igst = Math.round(taxable * gstRate / 100 * 100) / 100
  }
  return { ...item, taxableAmount: taxable, gstType: effectiveGstType, cgst, sgst, igst, lineTotal: taxable + cgst + sgst + igst }
}

function computeTotals(items, gstType, shippingCharge = 0, invoiceDiscount = 0) {
  const processed = items.map(it => computeLineItem(it, gstType))
  const subtotal   = processed.reduce((s, i) => s + i.taxableAmount, 0)
  const totalCgst  = processed.reduce((s, i) => s + (i.cgst || 0), 0)
  const totalSgst  = processed.reduce((s, i) => s + (i.sgst || 0), 0)
  const totalIgst  = processed.reduce((s, i) => s + (i.igst || 0), 0)
  const totalGst   = totalCgst + totalSgst + totalIgst
  const grandTotal = subtotal + totalGst + (shippingCharge || 0) - (invoiceDiscount || 0)
  return { items: processed, subtotal, totalCgst, totalSgst, totalIgst, totalGst, grandTotal: Math.round(grandTotal * 100) / 100 }
}

const emptyItem = () => ({ description: '', hsn: '', qty: 1, unitPrice: '', discount: 0, gstRate: 18 })

export default function InvoiceDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = id === 'new'

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 60000 })
  const businessState      = settings?.invoice?.businessState || ''
  const allowRevoke        = settings?.invoice?.allowRevoke
  const waEnabled          = settings?.invoice?.sendWhatsApp

  // ── Fetch existing invoice ─────────────────────────────────
  const { data: invData, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}`).then(r => r.data.data?.invoice),
    enabled: !isNew,
    staleTime: 0,
  })

  // Fetch users for autocomplete
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/admin/users?limit=100').then(r => r.data.data?.users || []),
    staleTime: 60000,
  })
  const users = usersData || []

  // ── Form State ─────────────────────────────────────────────
  const [client, setClient] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', country: 'India', gstin: ''
  })
  const [items, setItems]             = useState([emptyItem()])
  const [shippingCharge, setShipping] = useState(0)
  const [invoiceDiscount, setDiscount]= useState(0)
  const [notes, setNotes]             = useState('')
  const [terms, setTerms]             = useState('')
  const [issueDate, setIssueDate]     = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate]         = useState('')
  const [status, setStatus]           = useState('draft')
  const [userSearch, setUserSearch]   = useState('')
  const [saving, setSaving]           = useState(null)
  const [preview, setPreview]         = useState(false)

  // Populate form when editing existing invoice
  useEffect(() => {
    if (invData) {
      setClient(invData.client || {})
      setItems(invData.items?.map(it => ({
        description: it.description, hsn: it.hsn || '', qty: it.qty,
        unitPrice: it.unitPrice, discount: it.discount || 0, gstRate: it.gstRate || 0,
        product: it.product,
      })) || [emptyItem()])
      setShipping(invData.shippingCharge || 0)
      setDiscount(invData.discount || 0)
      setNotes(invData.notes || '')
      setTerms(invData.terms || '')
      setIssueDate(invData.issueDate ? new Date(invData.issueDate).toISOString().split('T')[0] : '')
      setDueDate(invData.dueDate ? new Date(invData.dueDate).toISOString().split('T')[0] : '')
      setStatus(invData.status || 'draft')
    } else if (isNew && settings?.invoice?.defaultTerms) {
      setTerms(settings.invoice.defaultTerms)
      // Set default due date
      if (settings?.invoice?.defaultDueDays) {
        const d = new Date()
        d.setDate(d.getDate() + settings.invoice.defaultDueDays)
        setDueDate(d.toISOString().split('T')[0])
      }
    }
  }, [invData, isNew, settings])

  // ── GST logic ──────────────────────────────────────────────
  const gstType = (() => {
    if (!client.state || !businessState) return 'none'
    const n = s => s.trim().toLowerCase().replace(/\s+/g, '')
    return n(client.state) === n(businessState) ? 'cgst_sgst' : 'igst'
  })()

  const totals = computeTotals(items, gstType, shippingCharge, invoiceDiscount)

  // ── Item helpers ───────────────────────────────────────────
  const updateItem = (idx, field, val) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))
  }
  const addItem    = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  // ── Fill from user ─────────────────────────────────────────
  const fillFromUser = (user) => {
    setClient(prev => ({
      ...prev,
      name:  user.name || prev.name,
      email: user.email || prev.email,
      phone: user.phone || prev.phone,
    }))
    setUserSearch('')
  }

  // ── Save ───────────────────────────────────────────────────
  const save = async (saveStatus = status) => {
    if (!client.name.trim()) return toast.error('Client name is required')
    if (!items.some(it => it.description.trim())) return toast.error('Add at least one line item')
    setSaving('save')
    try {
      const payload = {
        client, items, shippingCharge, discount: invoiceDiscount,
        notes, terms, issueDate, dueDate: dueDate || null, status: saveStatus,
      }
      if (isNew) {
        const { data } = await api.post('/invoices', payload)
        toast.success('Invoice created!')
        qc.invalidateQueries({ queryKey: ['invoices'] })
        navigate(`/invoices/${data.data.invoice._id}`)
      } else {
        await api.put(`/invoices/${id}`, payload)
        toast.success('Invoice updated!')
        qc.invalidateQueries({ queryKey: ['invoice', id] })
        qc.invalidateQueries({ queryKey: ['invoices'] })
      }
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(null) }
  }

  const sendEmail = async () => {
    setSaving('email')
    try {
      await api.post(`/invoices/${id}/send-email`)
      toast.success('Invoice emailed to client!')
      qc.invalidateQueries({ queryKey: ['invoice', id] })
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(null) }
  }

  const sendWhatsApp = async () => {
    setSaving('whatsapp')
    try {
      await api.post(`/invoices/${id}/send-whatsapp`)
      toast.success('Sent via WhatsApp!')
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(null) }
  }

  const downloadPDF = async () => {
    setSaving('pdf')
    try {
      const { data } = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
      const url  = URL.createObjectURL(data)
      const a    = document.createElement('a')
      a.href = url; a.download = `${invData?.invoiceNumber || 'invoice'}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(null) }
  }

  if (!isNew && isLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  const isReadOnly = !isNew && ['cancelled', 'revoked'].includes(invData?.status)
  const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title">{isNew ? 'New Invoice' : (invData?.invoiceNumber || 'Edit Invoice')}</h1>
            <p className="page-subtitle">{isNew ? 'Create a new invoice manually' : `Last updated ${new Date(invData?.updatedAt || Date.now()).toLocaleDateString('en-IN')}`}</p>
          </div>
        </div>
        {!isNew && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={downloadPDF} disabled={saving === 'pdf'}>
              {saving === 'pdf' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Download size={14} />}
              Download PDF
            </button>
            {invData?.client?.email && (
              <button className="btn btn-secondary btn-sm" onClick={sendEmail} disabled={saving === 'email'}>
                {saving === 'email' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Mail size={14} />}
                Send Email
              </button>
            )}
            {waEnabled && invData?.client?.phone && (
              <button className="btn btn-secondary btn-sm" onClick={sendWhatsApp} disabled={saving === 'whatsapp'}
                style={{ borderColor: '#25D366', color: '#25D366' }}>
                {saving === 'whatsapp' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <MessageCircle size={14} />}
                WhatsApp
              </button>
            )}
          </div>
        )}
      </div>

      {isReadOnly && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertTriangle size={16} color="var(--danger)" />
          <span style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>This invoice is {invData?.status}. Editing is disabled.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Client Section */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">🧑 Client Details</h2>
              {/* User Autocomplete */}
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  placeholder="Search existing users…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{ width: 220, fontSize: 12 }}
                  disabled={isReadOnly}
                />
                {userSearch && users.filter(u =>
                  u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                  u.email?.toLowerCase().includes(userSearch.toLowerCase())
                ).slice(0, 5).length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)', borderRadius: 8, width: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  }}>
                    {users.filter(u =>
                      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email?.toLowerCase().includes(userSearch.toLowerCase())
                    ).slice(0, 5).map(u => (
                      <button key={u._id} style={{
                        width: '100%', padding: '10px 14px', display: 'flex', flexDirection: 'column',
                        alignItems: 'flex-start', background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)', textAlign: 'left',
                      }}
                        onClick={() => fillFromUser(u)}
                        className="nav-item"
                      >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Client Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-input" value={client.name} onChange={e => setClient(p => ({ ...p, name: e.target.value }))} placeholder="Full name or company" disabled={isReadOnly} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" value={client.email} onChange={e => setClient(p => ({ ...p, email: e.target.value }))} placeholder="client@email.com" disabled={isReadOnly} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={client.phone} onChange={e => setClient(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" disabled={isReadOnly} />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>(optional)</span></label>
                  <input className="form-input" value={client.gstin} onChange={e => setClient(p => ({ ...p, gstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" disabled={isReadOnly} style={{ fontFamily: 'monospace' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" value={client.address} onChange={e => setClient(p => ({ ...p, address: e.target.value }))} placeholder="Street address" disabled={isReadOnly} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={client.city} onChange={e => setClient(p => ({ ...p, city: e.target.value }))} placeholder="City" disabled={isReadOnly} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <select className="form-select" value={client.state} onChange={e => setClient(p => ({ ...p, state: e.target.value }))} disabled={isReadOnly}>
                    <option value="">Select State…</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ maxWidth: 120 }}>
                  <label className="form-label">Pincode</label>
                  <input className="form-input" value={client.pincode} onChange={e => setClient(p => ({ ...p, pincode: e.target.value }))} placeholder="302001" disabled={isReadOnly} maxLength={6} />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📦 Line Items</h2>
              {/* GST Type Indicator */}
              {client.state && businessState && (
                <span style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  color: gstType === 'cgst_sgst' ? 'var(--success)' : '#3b82f6',
                  background: gstType === 'cgst_sgst' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
                }}>
                  {gstType === 'cgst_sgst' ? '✅ Intrastate → CGST + SGST' : '🔁 Interstate → IGST'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {/* Column Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px 90px 120px 32px', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                {['Description / HSN', 'Qty', 'Unit Price', 'Discount', 'GST %', 'Total', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', textAlign: i >= 5 ? 'right' : i === 1 ? 'center' : 'left' }}>{h}</div>
                ))}
              </div>

              {items.map((item, idx) => {
                const comp = computeLineItem(item, gstType)
                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px 90px 120px 32px', gap: 8, alignItems: 'center' }}>
                    <div>
                      <input
                        className="form-input" style={{ marginBottom: 4 }}
                        value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                        placeholder="Product / service description" disabled={isReadOnly}
                      />
                      <input
                        className="form-input" style={{ fontSize: 11 }}
                        value={item.hsn} onChange={e => updateItem(idx, 'hsn', e.target.value)}
                        placeholder="HSN/SAC code" disabled={isReadOnly}
                      />
                    </div>
                    <input
                      type="number" className="form-input" style={{ textAlign: 'center' }}
                      value={item.qty} min={1} onChange={e => updateItem(idx, 'qty', e.target.value)} disabled={isReadOnly}
                    />
                    <input
                      type="number" className="form-input"
                      value={item.unitPrice} min={0} placeholder="₹0.00"
                      onChange={e => updateItem(idx, 'unitPrice', e.target.value)} disabled={isReadOnly}
                    />
                    <input
                      type="number" className="form-input"
                      value={item.discount} min={0} placeholder="₹0"
                      onChange={e => updateItem(idx, 'discount', e.target.value)} disabled={isReadOnly}
                    />
                    <select className="form-select" value={item.gstRate} onChange={e => updateItem(idx, 'gstRate', e.target.value)} disabled={isReadOnly}>
                      {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                    <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontSize: 13 }}>
                      {fmt(comp.lineTotal)}
                      {comp.cgst > 0 && <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>CGST {fmt(comp.cgst)} + SGST {fmt(comp.sgst)}</div>}
                      {comp.igst > 0 && <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>IGST {fmt(comp.igst)}</div>}
                    </div>
                    {!isReadOnly && (
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }}
                        onClick={() => removeItem(idx)} disabled={items.length === 1}>
                        <Minus size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {!isReadOnly && (
              <button className="btn btn-secondary btn-sm" onClick={addItem}>
                <Plus size={13} /> Add Item
              </button>
            )}

            {/* Charges */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Shipping Charge (₹)</label>
                <input type="number" className="form-input" value={shippingCharge} min={0} onChange={e => setShipping(parseFloat(e.target.value) || 0)} disabled={isReadOnly} />
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Discount (₹)</label>
                <input type="number" className="form-input" value={invoiceDiscount} min={0} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} disabled={isReadOnly} />
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">📝 Notes & Terms</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Notes (shown on invoice)</label>
                <textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for the client..." disabled={isReadOnly} />
              </div>
              <div className="form-group">
                <label className="form-label">Terms & Conditions</label>
                <textarea className="form-textarea" rows={4} value={terms} onChange={e => setTerms(e.target.value)} placeholder="Payment terms, late fees, etc..." disabled={isReadOnly} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Invoice Meta */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">📋 Invoice Details</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value)} disabled={isReadOnly}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="payment_pending">Payment Pending</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Issue Date</label>
                <input type="date" className="form-input" value={issueDate} onChange={e => setIssueDate(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
          </div>

          {/* GST Summary */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">🧾 Amount Summary</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Subtotal', val: totals.subtotal },
                totals.totalCgst > 0 && { label: `CGST`, val: totals.totalCgst },
                totals.totalSgst > 0 && { label: `SGST`, val: totals.totalSgst },
                totals.totalIgst > 0 && { label: `IGST`, val: totals.totalIgst },
                shippingCharge > 0 && { label: 'Shipping', val: shippingCharge },
                invoiceDiscount > 0 && { label: 'Discount', val: -invoiceDiscount, danger: true },
              ].filter(Boolean).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: r.danger ? 'var(--danger)' : 'var(--text-secondary)' }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: r.danger ? 'var(--danger)' : 'var(--text-primary)' }}>{r.danger ? '-' : ''}{fmt(Math.abs(r.val))}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: 4, borderTop: '2px solid var(--border)' }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Grand Total</span>
                <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--brand-primary)' }}>{fmt(totals.grandTotal)}</span>
              </div>
              {gstType !== 'none' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', borderRadius: 8, padding: '8px 12px', marginTop: 4 }}>
                  {gstType === 'cgst_sgst'
                    ? `📍 Intrastate transaction: CGST + SGST applied (client & biz in ${businessState})`
                    : `🚚 Interstate transaction: IGST applied (${client.state} → ${businessState})`}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isReadOnly && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-primary" disabled={saving === 'save'} onClick={() => save()}>
                {saving === 'save' ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Save size={15} />}
                {isNew ? 'Create Invoice' : 'Save Changes'}
              </button>
              {isNew && (
                <button className="btn btn-secondary" disabled={saving === 'save'} onClick={() => save('sent')}>
                  <Send size={15} /> Create & Mark as Sent
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
