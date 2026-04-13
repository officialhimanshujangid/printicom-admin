import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Send, Download, Mail, MessageCircle, Plus, Minus,
  User, Package, RefreshCw, AlertTriangle, CheckCircle, Camera, Search,
  X, Barcode, ChevronDown, DollarSign, RotateCcw, XCircle, UserPlus,
  Info, ShoppingCart
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
const fetchClients  = (s) => api.get(`/invoices/clients?search=${encodeURIComponent(s||'')}`)
  .then(r => r.data.data?.clients || [])
const fetchProducts = (s) => api.get(`/invoices/products?search=${encodeURIComponent(s||'')}`)
  .then(r => r.data.data?.products || [])

function computeLineItem(item, gstType) {
  const unitPrice = parseFloat(item.unitPrice) || 0
  const qty       = parseInt(item.qty) || 1
  const discount  = parseFloat(item.discount) || 0
  const gstRate   = parseFloat(item.gstRate) || 0
  const taxable   = (unitPrice - discount) * qty
  let cgst = 0, sgst = 0, igst = 0
  const effGst = gstRate > 0 ? gstType : 'none'
  if (effGst === 'cgst_sgst') { cgst = Math.round(taxable * (gstRate/2)/100*100)/100; sgst = cgst }
  else if (effGst === 'igst') { igst = Math.round(taxable * gstRate/100*100)/100 }
  return { ...item, taxableAmount: taxable, gstType: effGst, cgst, sgst, igst, lineTotal: taxable + cgst + sgst + igst }
}

function computeTotals(items, gstType, shipping = 0, invDiscount = 0) {
  const processed = items.map(it => computeLineItem(it, gstType))
  const subtotal   = processed.reduce((s, i) => s + i.taxableAmount, 0)
  const totalCgst  = processed.reduce((s, i) => s + (i.cgst || 0), 0)
  const totalSgst  = processed.reduce((s, i) => s + (i.sgst || 0), 0)
  const totalIgst  = processed.reduce((s, i) => s + (i.igst || 0), 0)
  const totalGst   = totalCgst + totalSgst + totalIgst
  const grandTotal = subtotal + totalGst + (shipping || 0) - (invDiscount || 0)
  return { items: processed, subtotal, totalCgst, totalSgst, totalIgst, totalGst, grandTotal: Math.round(grandTotal*100)/100 }
}

const emptyItem = () => ({ description: '', hsn: '', qty: 1, unitPrice: '', discount: 0, gstRate: 18, product: null, unit: 'pcs' })

// ─── Barcode Scanner Modal ────────────────────────────────────
function BarcodeScannerModal({ onScan, onClose }) {
  const videoRef   = useRef(null)
  const streamRef  = useRef(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    let codeReader
    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        codeReader = new BrowserMultiFormatReader()
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        if (!devices.length) { setError('No camera found on this device'); return }
        // Prefer back camera
        const deviceId = devices.find(d => /back|rear|environment/i.test(d.label))?.deviceId || devices[0].deviceId
        setScanning(true)
        await codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (result) {
            onScan(result.getText())
            onClose()
          }
        })
        streamRef.current = codeReader
      } catch (err) {
        setError('Camera access denied or not available: ' + err.message)
        setScanning(false)
      }
    }
    start()
    return () => {
      if (streamRef.current?.reset) streamRef.current.reset()
    }
  }, [onScan, onClose])

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Barcode size={18} /> Barcode Scanner
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: '16px 0' }}>
          {error ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--danger)' }}>
              <Camera size={48} style={{ opacity: 0.4, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
              <p>{error}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                You can also type the barcode/HSN manually in the item row.
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', minHeight: 280 }}>
              <video ref={videoRef} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
              {/* Scanner crosshair */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: 200, height: 120, border: '2px solid #FF6B35', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
              </div>
              {scanning && <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 12 }}>Point camera at barcode</div>}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Product Picker Dropdown ──────────────────────────────────
function ProductPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(async () => {
      const list = await fetchProducts(search).catch(() => [])
      setProducts(list)
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={18} /> Select Product
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: '12px 24px 0' }}>
          <div className="search-bar">
            <Search size={15} />
            <input ref={inputRef} className="form-input" placeholder="Search by name, HSN, barcode…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '12px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
          ) : products.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}><Package size={32} /><p>No products found</p></div>
          ) : products.map(p => (
            <button key={p._id} onClick={() => onSelect(p)} style={{
              width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12,
              background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
              borderBottom: '1px solid var(--border)', transition: 'background 0.15s',
            }}
            className="nav-item"
            >
              {p.thumbnailImage && <img src={p.thumbnailImage} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                  {p.hsnCode && <span>HSN: {p.hsnCode}</span>}
                  {p.barcode && <span>Barcode: {p.barcode}</span>}
                  <span style={{ color: p.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    Stock: {p.stock ?? 0}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: 14 }}>
                  {formatCurrency(p.discountPrice || p.basePrice)}
                </div>
                {p.isGstApplicable && p.gstPercentage && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{p.gstPercentage}% GST</div>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Client Picker Dropdown ───────────────────────────────────
function ClientPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(async () => {
      const list = await fetchClients(search).catch(() => [])
      setClients(list)
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} /> Select Client
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: '12px 24px 0' }}>
          <div className="search-bar">
            <Search size={15} />
            <input ref={inputRef} className="form-input" placeholder="Search clients by name, email, phone…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '12px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
          ) : clients.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <User size={32} />
              <p>No clients found</p>
              <p style={{ fontSize: 12 }}>Fill in client details manually below to create a new client</p>
            </div>
          ) : clients.map(c => (
            <button key={c._id} onClick={() => onSelect(c)} style={{
              width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
              borderBottom: '1px solid var(--border)',
            }} className="nav-item">
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-gradient, linear-gradient(135deg,#FF6B35,#F7C59F))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>
                {c.name?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email} {c.phone && `· ${c.phone}`}</div>
              </div>
              {!c.isEmailVerified && (
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 700 }}>Unverified</span>
              )}
            </button>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel — Enter Manually</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function InvoiceDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = id === 'new'

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 60000 })
  const businessState = settings?.invoice?.businessState || ''
  const allowRevoke   = settings?.invoice?.allowRevoke
  const waEnabled     = settings?.invoice?.sendWhatsApp

  const { data: invData, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}`).then(r => r.data.data?.invoice),
    enabled: !isNew,
    staleTime: 0,
  })

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
  const [saving, setSaving]           = useState(null)

  // Modal states
  const [showClientPicker, setShowClientPicker]   = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(null) // holds item index
  const [showBarcode, setShowBarcode]             = useState(null) // holds item index
  const [cancelModal, setCancelModal]             = useState(false)
  const [revokeModal, setRevokeModal]             = useState(false)
  const [cancelReason, setCancelReason]           = useState('')
  const [revokeReason, setRevokeReason]           = useState('')
  const [linkedUserId, setLinkedUserId]           = useState(null)

  // Populate form when editing
  useEffect(() => {
    if (invData) {
      setClient(invData.client || {})
      setItems(invData.items?.map(it => ({
        description: it.description, hsn: it.hsn || '', qty: it.qty,
        unitPrice: it.unitPrice, discount: it.discount || 0, gstRate: it.gstRate || 0,
        product: it.product, unit: it.unit || 'pcs',
      })) || [emptyItem()])
      setShipping(invData.shippingCharge || 0)
      setDiscount(invData.discount || 0)
      setNotes(invData.notes || '')
      setTerms(invData.terms || '')
      setIssueDate(invData.issueDate ? new Date(invData.issueDate).toISOString().split('T')[0] : '')
      setDueDate(invData.dueDate ? new Date(invData.dueDate).toISOString().split('T')[0] : '')
      setStatus(invData.status || 'draft')
      setLinkedUserId(invData.linkedUser)
    } else if (isNew && settings) {
      if (settings?.invoice?.defaultTerms) setTerms(settings.invoice.defaultTerms)
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
  const updateItem = (idx, field, val) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))
  const addItem    = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  // ── Select Product ─────────────────────────────────────────
  const selectProduct = (idx, product) => {
    setItems(prev => prev.map((it, i) => i !== idx ? it : {
      ...it,
      description: product.name,
      hsn:         product.hsnCode || it.hsn,
      unitPrice:   product.discountPrice != null ? product.discountPrice : product.basePrice,
      gstRate:     product.isGstApplicable ? (product.gstPercentage != null ? product.gstPercentage : 18) : 0,
      product:     product._id,
      unit:        product.unit || 'pcs',
      _stockRef:   product.stock,
    }))
    setShowProductPicker(null)
  }

  // ── Barcode Scan (global — adds new item or fills last empty) ──
  const handleBarcodeScan = useCallback(async (code) => {
    const products = await fetchProducts(code).catch(() => [])
    const match = products.find(p => p.barcode === code)
    if (match) {
      // Find last empty item to fill, otherwise append
      const emptyIdx = items.findIndex(it => !it.description.trim())
      if (emptyIdx >= 0) {
        selectProduct(emptyIdx, match)
      } else {
        setItems(prev => [
          ...prev,
          {
            description: match.name,
            hsn:         match.hsnCode || '',
            qty:         1,
            unitPrice:   match.discountPrice != null ? match.discountPrice : match.basePrice,
            discount:    0,
            gstRate:     match.isGstApplicable ? (match.gstPercentage != null ? match.gstPercentage : 18) : 0,
            product:     match._id,
            unit:        match.unit || 'pcs',
            _stockRef:   match.stock,
          }
        ])
      }
      toast.success(`✅ Added: ${match.name}`)
    } else {
      toast.error(`No product found for barcode: ${code}`)
    }
    setShowBarcode(null)
  }, [showBarcode, items, selectProduct])

  // ── Fill from client ───────────────────────────────────────
  const fillFromClient = (c) => {
    setClient({
      name:    c.name || '',
      email:   c.email || '',
      phone:   c.phone || '',
      address: c.address?.street || '',
      city:    c.address?.city || '',
      state:   c.address?.state || '',
      pincode: c.address?.pincode || '',
      country: c.address?.country || 'India',
      gstin:   '',
    })
    setLinkedUserId(c._id)
    setShowClientPicker(false)
  }

  // ── Save ──────────────────────────────────────────────────
  const save = async (saveStatus = status) => {
    if (!client.name.trim()) return toast.error('Client name is required')
    if (!items.some(it => it.description.trim())) return toast.error('Add at least one line item')
    setSaving('save')
    try {
      const payload = {
        client, items, shippingCharge, discount: invoiceDiscount,
        notes, terms, issueDate, dueDate: dueDate || null, status: saveStatus,
        linkedUser: linkedUserId || undefined,
      }
      if (isNew) {
        const { data } = await api.post('/invoices', payload)
        const newId = data.data.invoice._id
        toast.success('Invoice created! 🎉')
        // Auto-send email if status is 'sent' and client has email
        if (saveStatus === 'sent' && client.email) {
          try {
            await api.post(`/invoices/${newId}/send-email`)
            toast.success('Invoice emailed to client!')
          } catch (emailErr) {
            toast.error('Invoice created but email failed: ' + extractError(emailErr))
          }
        }
        qc.invalidateQueries({ queryKey: ['invoices'] })
        navigate(`/invoices/${newId}`)
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
      const token = localStorage.getItem('ptc_admin_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Since the backend now accepts ?_token for GET requests, we can directly 
      // trigger the browser's native download mechanisms, totally bypassing 
      // JavaScript Blob quirks.
      window.open(`${apiUrl}/invoices/${id}/pdf?_token=${token}`, '_blank');
      
    } catch (err) { 
      toast.error(extractError(err)); 
    } finally { 
      // We set saving back instantly because window.open is fire-and-forget.
      setSaving(null);
    }
  }

  const doMarkPaid = async () => {
    setSaving('paid')
    try {
      await api.post(`/invoices/${id}/mark-paid`)
      toast.success('Invoice marked as Paid! 🎉')
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(null) }
  }

  const doCancel = async () => {
    setSaving('cancel')
    try {
      await api.post(`/invoices/${id}/cancel`, { reason: cancelReason })
      toast.success('Invoice cancelled')
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setCancelModal(false); setCancelReason('')
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(null) }
  }

  const doRevoke = async () => {
    if (!revokeReason.trim()) return toast.error('Revocation reason is required')
    setSaving('revoke')
    try {
      await api.post(`/invoices/${id}/revoke`, { reason: revokeReason })
      toast.success('Invoice permanently revoked')
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setRevokeModal(false); setRevokeReason('')
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(null) }
  }

  if (!isNew && isLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  // Order-linked invoices are fully managed by the order workflow — never manually editable
  const isOrderInvoice = !isNew && invData?.type === 'order' && !!invData?.linkedOrder
  const isReadOnly = !isNew && (['cancelled', 'revoked', 'refunded'].includes(invData?.status) || isOrderInvoice)
  const fmt = n => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

  const statusColor = {
    draft: 'var(--text-muted)', sent: '#3b82f6', payment_pending: '#f59e0b',
    paid: 'var(--success)', cancelled: 'var(--danger)', refunded: '#8b5cf6', revoked: '#f59e0b'
  }
  const currentStatus = invData?.status || 'draft'

  return (
    <div>
      {/* Modals */}
      {showClientPicker && <ClientPicker onSelect={fillFromClient} onClose={() => setShowClientPicker(false)} />}
      {showProductPicker !== null && (
        <ProductPicker onSelect={p => selectProduct(showProductPicker, p)} onClose={() => setShowProductPicker(null)} />
      )}
      {showBarcode && (
        <BarcodeScannerModal onScan={handleBarcodeScan} onClose={() => setShowBarcode(null)} />
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCancelModal(false) }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={18} /> Cancel Invoice
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setCancelModal(false)}><X size={16} /></button>
            </div>
            <div style={{ padding: '4px 0 16px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
                Cancel <strong style={{ color: 'var(--text-primary)' }}>{invData?.invoiceNumber}</strong>?
                Stock will be restored automatically. This can only be undone if revoke is enabled.
              </p>
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--danger)' }}>
                ⚠️ Cancellation voiding: Stock for all product-linked items will be <strong>restored</strong>.
              </div>
              <div className="form-group">
                <label className="form-label">Reason for Cancellation (optional)</label>
                <textarea className="form-textarea" rows={3} value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)} placeholder="E.g., Client requested cancellation, duplicate invoice…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCancelModal(false)}>Back</button>
              <button className="btn btn-danger" disabled={saving === 'cancel'} onClick={doCancel}>
                {saving === 'cancel' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <XCircle size={14} />}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokeModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setRevokeModal(false) }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={18} /> Revoke Invoice
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setRevokeModal(false)}><X size={16} /></button>
            </div>
            <div style={{ padding: '4px 0 16px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
                Permanently revoke <strong style={{ color: 'var(--text-primary)' }}>{invData?.invoiceNumber}</strong>?
                This marks the invoice as <strong style={{ color: '#f59e0b' }}>REVOKED</strong> — it cannot be edited or sent again.
              </p>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#d97706' }}>
                ⚠️ Unlike cancellation, revocation is a <strong>permanent void</strong>. Use only for fraudulent or legally disputed invoices.
              </div>
              <div className="form-group">
                <label className="form-label">Reason for Revocation <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea className="form-textarea" rows={3} value={revokeReason}
                  onChange={e => setRevokeReason(e.target.value)} placeholder="Why is this invoice being permanently revoked?" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRevokeModal(false)}>Back</button>
              <button className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                disabled={saving === 'revoke'} onClick={doRevoke}>
                {saving === 'revoke' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <RotateCcw size={14} />}
                Revoke Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title">
              {isNew ? 'New Invoice' : (invData?.invoiceNumber || 'Edit Invoice')}
            </h1>
            <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isNew ? 'Create a new manual invoice' : `Last updated ${new Date(invData?.updatedAt || Date.now()).toLocaleDateString('en-IN')}`}
              {!isNew && (
                <span style={{
                  padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: statusColor[currentStatus]
                }}>{currentStatus.replace('_', ' ')}</span>
              )}
            </p>
          </div>
        </div>
        {!isNew && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={downloadPDF} disabled={saving === 'pdf'}>
              {saving === 'pdf' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Download size={14} />}
              PDF
            </button>
            {invData?.client?.email && (
              <button className="btn btn-secondary btn-sm" onClick={sendEmail} disabled={saving === 'email'}>
                {saving === 'email' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Mail size={14} />}
                Email
              </button>
            )}
            {waEnabled && invData?.client?.phone && (
              <button className="btn btn-secondary btn-sm" onClick={sendWhatsApp} disabled={saving === 'whatsapp'}
                style={{ borderColor: '#25D366', color: '#25D366' }}>
                {saving === 'whatsapp' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <MessageCircle size={14} />}
                WhatsApp
              </button>
            )}
            {!['cancelled', 'revoked', 'paid'].includes(currentStatus) && (
              <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}
                onClick={doMarkPaid} disabled={saving === 'paid'}>
                {saving === 'paid' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <DollarSign size={14} />}
                Mark Paid
              </button>
            )}
            {!['cancelled', 'revoked'].includes(currentStatus) && (
              <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}
                onClick={() => setCancelModal(true)}>
                <XCircle size={14} /> Cancel
              </button>
            )}
            {currentStatus === 'cancelled' && allowRevoke && (
              <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                onClick={() => setRevokeModal(true)}>
                <RotateCcw size={14} /> Revoke
              </button>
            )}
          </div>
        )}
      </div>

      {/* Order-linked invoice lock banner */}
      {isOrderInvoice && (
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Info size={16} color="#3b82f6" />
          <div>
            <span style={{ color: '#3b82f6', fontSize: 13, fontWeight: 600 }}>Order-Linked Invoice</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>
              This invoice is auto-managed by its linked order. To cancel, refund or update it — go to the
            </span>
            <a href={`/orders/${invData?.linkedOrder?._id || invData?.linkedOrder}`} style={{ color: '#3b82f6', fontSize: 12, marginLeft: 4, fontWeight: 600 }}>Order Details →</a>
          </div>
        </div>
      )}

      {/* Terminal status banner (cancelled / revoked / refunded) */}
      {!isOrderInvoice && ['cancelled', 'revoked', 'refunded'].includes(invData?.status) && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertTriangle size={16} color="var(--danger)" />
          <div>
            <span style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
              This invoice is {invData?.status?.toUpperCase()}.
            </span>
            {invData?.cancelReason && (
              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>Reason: {invData.cancelReason}</span>
            )}
            {invData?.revokeReason && (
              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>Reason: {invData.revokeReason}</span>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Client Section */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title"><User size={16} style={{ display: 'inline', marginRight: 6 }} />Client Details</h2>
              {!isReadOnly && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowClientPicker(true)}>
                    <Search size={13} /> Select Existing
                  </button>
                  {linkedUserId && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={11} /> Linked to Account
                    </span>
                  )}
                </div>
              )}
            </div>
            {!linkedUserId && !isReadOnly && (
              <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={13} />
                Filling details manually will auto-create a new client account when invoice is saved.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Client Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-input" value={client.name}
                    onChange={e => setClient(p => ({ ...p, name: e.target.value }))}
                    placeholder="Full name or company" disabled={isReadOnly} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" value={client.email}
                    onChange={e => setClient(p => ({ ...p, email: e.target.value }))}
                    placeholder="client@example.com" disabled={isReadOnly} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={client.phone}
                    onChange={e => setClient(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 98765 43210" disabled={isReadOnly} />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>(optional)</span></label>
                  <input className="form-input" value={client.gstin}
                    onChange={e => setClient(p => ({ ...p, gstin: e.target.value }))}
                    placeholder="22AAAAA0000A1Z5" disabled={isReadOnly} style={{ fontFamily: 'monospace' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" value={client.address}
                  onChange={e => setClient(p => ({ ...p, address: e.target.value }))}
                  placeholder="Street address" disabled={isReadOnly} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={client.city}
                    onChange={e => setClient(p => ({ ...p, city: e.target.value }))}
                    placeholder="City" disabled={isReadOnly} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <select className="form-select" value={client.state}
                    onChange={e => setClient(p => ({ ...p, state: e.target.value }))} disabled={isReadOnly}>
                    <option value="">Select State…</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ maxWidth: 120 }}>
                  <label className="form-label">Pincode</label>
                  <input className="form-input" value={client.pincode}
                    onChange={e => setClient(p => ({ ...p, pincode: e.target.value }))}
                    placeholder="302001" disabled={isReadOnly} maxLength={6} />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <h2 className="card-title"><Package size={16} style={{ display: 'inline', marginRight: 6 }} />Line Items</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {client.state && businessState && (
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    color: gstType === 'cgst_sgst' ? 'var(--success)' : '#3b82f6',
                    background: gstType === 'cgst_sgst' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
                  }}>
                    {gstType === 'cgst_sgst' ? '✅ CGST + SGST' : '🔁 IGST'}
                  </span>
                )}
                {!isReadOnly && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowBarcode(true)}
                    style={{ color: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', fontSize: 12 }}>
                    <Camera size={13} /> Scan Barcode
                  </button>
                )}
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 80px 90px 32px', gap: 6, padding: '6px 8px', borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
              {['Product', 'Qty', 'Unit Price (₹)', 'Disc (₹)', 'GST %', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', textAlign: i >= 4 ? 'center' : 'left' }}>{h}</div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {items.map((item, idx) => {
                const comp = computeLineItem(item, gstType)
                const stockWarn = item._stockRef !== undefined && parseInt(item.qty) > item._stockRef
                return (
                  <div key={idx} style={{
                    border: '1px solid var(--border)', borderRadius: 10,
                    background: 'var(--bg-elevated)', overflow: 'hidden'
                  }}>
                    {/* Top: product name + HSN meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                      {item.product ? (
                        <Package size={13} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                      ) : (
                        <Info size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      )}
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description || <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>New item — fill description below</span>}
                      </span>
                      {item.hsn && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace', flexShrink: 0 }}>HSN: {item.hsn}</span>
                      )}
                      {item._stockRef !== undefined && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: item._stockRef > 0 ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }}>
                          Stock: {item._stockRef}
                        </span>
                      )}
                    </div>

                    {/* Inputs row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 80px 90px 32px', gap: 6, padding: '8px 10px', alignItems: 'center' }}>
                      {/* Description + pick */}
                      <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input
                            className="form-input" style={{ flex: 1, fontSize: 12 }}
                            value={item.description}
                            onChange={e => updateItem(idx, 'description', e.target.value)}
                            placeholder="Description…" disabled={isReadOnly}
                          />
                          {!isReadOnly && (
                            <button className="btn btn-ghost btn-icon btn-sm" title="Pick product from catalog"
                              onClick={() => setShowProductPicker(idx)} style={{ flexShrink: 0 }}>
                              <ShoppingCart size={13} />
                            </button>
                          )}
                        </div>
                        <input
                          className="form-input" style={{ fontSize: 11 }}
                          value={item.hsn}
                          onChange={e => updateItem(idx, 'hsn', e.target.value)}
                          placeholder="HSN / SAC code" disabled={isReadOnly}
                        />
                        {stockWarn && (
                          <div style={{ fontSize: 10, color: '#f59e0b' }}>⚠️ Exceeds stock ({item._stockRef})</div>
                        )}
                      </div>
                      {/* Qty */}
                      <input type="number" className="form-input" style={{ textAlign: 'center', fontSize: 13 }}
                        value={item.qty} min={1}
                        onChange={e => updateItem(idx, 'qty', e.target.value)} disabled={isReadOnly} />
                      {/* Unit Price */}
                      <input type="number" className="form-input" style={{ fontSize: 13 }}
                        value={item.unitPrice} min={0} placeholder="0.00"
                        onChange={e => updateItem(idx, 'unitPrice', e.target.value)} disabled={isReadOnly} />
                      {/* Discount */}
                      <input type="number" className="form-input" style={{ fontSize: 13 }}
                        value={item.discount} min={0} placeholder="0"
                        onChange={e => updateItem(idx, 'discount', e.target.value)} disabled={isReadOnly} />
                      {/* GST Rate */}
                      <select className="form-select" value={item.gstRate} style={{ fontSize: 12 }}
                        onChange={e => updateItem(idx, 'gstRate', e.target.value)} disabled={isReadOnly}>
                        {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                      {/* Remove */}
                      {!isReadOnly ? (
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }}
                          onClick={() => removeItem(idx)} disabled={items.length === 1}>
                          <Minus size={13} />
                        </button>
                      ) : <div />}
                    </div>

                    {/* Line total footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '6px 10px', borderTop: '1px solid var(--border)', background: 'var(--bg-hover)', fontSize: 12 }}>
                      {comp.cgst > 0 && (
                        <span style={{ color: 'var(--text-muted)' }}>CGST {fmt(comp.cgst)} + SGST {fmt(comp.sgst)}</span>
                      )}
                      {comp.igst > 0 && (
                        <span style={{ color: 'var(--text-muted)' }}>IGST {fmt(comp.igst)}</span>
                      )}
                      <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: 14 }}>{fmt(comp.lineTotal)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {!isReadOnly && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={addItem}>
                  <Plus size={13} /> Add Item
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowProductPicker(items.length - 1)}
                  style={{ color: 'var(--brand-primary)' }}>
                  <ShoppingCart size={13} /> Pick from Catalog
                </button>
              </div>
            )}

            {/* Charges */}
            <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div className="form-group">
                <label className="form-label">Shipping (₹)</label>
                <input type="number" className="form-input" value={shippingCharge} min={0}
                  onChange={e => setShipping(parseFloat(e.target.value) || 0)} disabled={isReadOnly} />
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Discount (₹)</label>
                <input type="number" className="form-input" value={invoiceDiscount} min={0}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)} disabled={isReadOnly} />
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">📝 Notes & Terms</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Notes (shown on invoice)</label>
                <textarea className="form-textarea" rows={3} value={notes}
                  onChange={e => setNotes(e.target.value)} placeholder="Any notes for the client…" disabled={isReadOnly} />
              </div>
              <div className="form-group">
                <label className="form-label">Terms & Conditions</label>
                <textarea className="form-textarea" rows={4} value={terms}
                  onChange={e => setTerms(e.target.value)} placeholder="Payment terms, late fees, etc…" disabled={isReadOnly} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Invoice Meta */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">📋 Invoice Details</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={status}
                  onChange={e => setStatus(e.target.value)} disabled={isReadOnly}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="payment_pending">Payment Pending</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Issue Date</label>
                <input type="date" className="form-input" value={issueDate}
                  onChange={e => setIssueDate(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={dueDate}
                  onChange={e => setDueDate(e.target.value)} disabled={isReadOnly} />
              </div>
              {!isNew && invData?.emailSentAt && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={11} /> Emailed: {new Date(invData.emailSentAt).toLocaleString('en-IN')}
                </div>
              )}
              {!isNew && invData?.paidAt && (
                <div style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={11} /> Paid: {new Date(invData.paidAt).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </div>

          {/* GST Summary */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">🧾 Amount Summary</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Subtotal (Taxable)', val: totals.subtotal },
                totals.totalCgst > 0 && { label: `CGST`, val: totals.totalCgst, gst: true },
                totals.totalSgst > 0 && { label: `SGST`, val: totals.totalSgst, gst: true },
                totals.totalIgst > 0 && { label: `IGST`, val: totals.totalIgst, gst: true },
                shippingCharge > 0 && { label: 'Shipping', val: shippingCharge },
                invoiceDiscount > 0 && { label: 'Discount', val: -invoiceDiscount, danger: true },
              ].filter(Boolean).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: r.danger ? 'var(--danger)' : r.gst ? '#3b82f6' : 'var(--text-secondary)' }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: r.danger ? 'var(--danger)' : r.gst ? '#3b82f6' : 'var(--text-primary)' }}>
                    {r.danger ? '-' : ''}{fmt(Math.abs(r.val))}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px', marginTop: 4, borderTop: '2px solid var(--border)' }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Grand Total</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--brand-primary)' }}>{fmt(totals.grandTotal)}</span>
              </div>
              {gstType !== 'none' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>
                  {gstType === 'cgst_sgst'
                    ? `📍 Intrastate: CGST + SGST applied (${businessState})`
                    : `🚚 Interstate: IGST applied (${client.state} → ${businessState})`}
                </div>
              )}
            </div>
          </div>

          {/* Save Actions */}
          {!isReadOnly && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-primary" disabled={saving === 'save'} onClick={() => save()}>
                {saving === 'save' ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Save size={15} />}
                {isNew ? 'Create Invoice' : 'Save Changes'}
              </button>
              {isNew && (
                <button className="btn btn-secondary" disabled={saving === 'save'} onClick={() => save('sent')}>
                  <Send size={15} /> Create &amp; Send
                </button>
              )}
              {isNew && (
                <button className="btn btn-ghost" disabled={saving === 'save'} onClick={() => save('paid')}
                  style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
                  <CheckCircle size={15} /> Create &amp; Mark Paid
                </button>
              )}
            </div>
          )}

          {/* Lifecycle Actions for existing manual invoices only */}
          {!isNew && !isOrderInvoice && invData && !['cancelled', 'revoked', 'refunded'].includes(invData.status) && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                Quick Actions
              </div>
              {invData.status !== 'paid' && (
                <button className="btn btn-ghost btn-sm" disabled={saving === 'paid'}
                  onClick={doMarkPaid}
                  style={{ color: 'var(--success)', borderColor: 'var(--success)', justifyContent: 'flex-start' }}>
                  {saving === 'paid' ? <div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : <CheckCircle size={14} />}
                  Mark as Paid
                </button>
              )}
              <button className="btn btn-ghost btn-sm"
                onClick={() => setCancelModal(true)}
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)', justifyContent: 'flex-start' }}>
                <XCircle size={14} /> Cancel Invoice
              </button>
            </div>
          )}

          {/* Order-linked: show link to order instead of action buttons */}
          {!isNew && isOrderInvoice && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Managed by Order
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Status changes (paid, cancelled, refunded) are controlled by the linked order.
              </p>
              <a href={`/orders/${invData?.linkedOrder?._id || invData?.linkedOrder}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6', fontWeight: 600, fontSize: 13 }}>
                <RefreshCw size={13} /> View Linked Order
              </a>
            </div>
          )}

          {/* Revoke for cancelled manual invoices only */}
          {!isNew && !isOrderInvoice && invData?.status === 'cancelled' && allowRevoke && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                Revocation
              </div>
              <button className="btn btn-ghost btn-sm"
                onClick={() => setRevokeModal(true)}
                style={{ color: '#f59e0b', borderColor: '#f59e0b', justifyContent: 'flex-start' }}>
                <RotateCcw size={14} /> Revoke Permanently
              </button>
            </div>
          )}

          {/* Audit info */}
          {!isNew && invData && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px', fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>Created: {new Date(invData.createdAt).toLocaleString('en-IN')}</div>
              {invData.cancelledAt && <div style={{ color: 'var(--danger)' }}>Cancelled: {new Date(invData.cancelledAt).toLocaleString('en-IN')}</div>}
              {invData.revokedAt && <div style={{ color: '#f59e0b' }}>Revoked: {new Date(invData.revokedAt).toLocaleString('en-IN')}</div>}
              {invData.financialYear && <div>Financial Year: {invData.financialYear}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}