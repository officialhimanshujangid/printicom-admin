import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Search, Package, Star, Eye, Heart, X, ImageIcon, DollarSign, PenTool,
  Settings2, GripVertical, Image, Type, AlertCircle, CheckCircle2
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatDate, formatCurrency, buildImageUrl, extractError, PRODUCT_TYPES } from '../lib/utils'

const fetchSettings = async () => {
  try {
    const { data } = await api.get('/settings')
    return data.data?.settings || data.data || {}
  } catch { return {} }
}

const fetchProducts = async ({ queryKey }) => {
  const [, page, search, type] = queryKey
  const params = new URLSearchParams({ page, limit: 12 })
  if (search) params.set('search', search)
  if (type && type !== 'all') params.set('productType', type)
  const { data } = await api.get(`/products?${params}`)
  return { products: data.data || [], pagination: data.pagination || {} }
}

const fetchCategories = async () => {
  const { data } = await api.get('/categories')
  return data.data?.categories || data.data || []
}

const fetchRelatedTos = async () => {
  const { data } = await api.get('/related-to?isActive=true')
  return data.data?.relatedTos || []
}

// ─── RelatedTo entry manager inside the product form ─────────
function RelatedToSection({ productRelatedTos, setProductRelatedTos, allRelatedTos, occasionImageFiles, setOccasionImageFiles }) {
  const addOccasion = (rtId) => {
    if (!rtId) return
    if (productRelatedTos.find(e => e.relatedTo === rtId)) return
    setProductRelatedTos([...productRelatedTos, { relatedTo: rtId, images: [], thumbnailImage: null, _existingImages: [] }])
  }

  const removeOccasion = (rtId) => {
    setProductRelatedTos(productRelatedTos.filter(e => e.relatedTo !== rtId))
    setOccasionImageFiles(prev => { const n = { ...prev }; delete n[rtId]; return n })
  }

  const handleOccasionImages = (rtId, files) => {
    setOccasionImageFiles(prev => ({ ...prev, [rtId]: Array.from(files) }))
  }

  const availableRts = allRelatedTos.filter(rt => !productRelatedTos.find(e => e.relatedTo === rt._id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <select
          className="form-select"
          style={{ flex: 1 }}
          defaultValue=""
          onChange={(e) => { addOccasion(e.target.value); e.target.value = '' }}
        >
          <option value="">+ Add an occasion tag...</option>
          {availableRts.map(rt => (
            <option key={rt._id} value={rt._id}>
              {rt.icon ? `${rt.icon} ` : ''}{rt.name}
            </option>
          ))}
        </select>
      </div>

      {productRelatedTos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <Heart size={20} style={{ marginBottom: 6 }} />
          <div>No occasions added. Select one above.</div>
        </div>
      )}

      {productRelatedTos.map(entry => {
        const rtData = allRelatedTos.find(r => r._id === entry.relatedTo)
        const newFiles = occasionImageFiles[entry.relatedTo] || []
        return (
          <div key={entry.relatedTo} className="card" style={{ padding: 14, border: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {rtData?.icon && <span style={{ fontSize: 20 }}>{rtData.icon}</span>}
                <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                  {rtData?.name || entry.relatedTo}
                </span>
                <span className="badge badge-default" style={{ fontSize: 10 }}>Occasion Images</span>
              </div>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeOccasion(entry.relatedTo)}>
                <X size={14} />
              </button>
            </div>

            {/* Existing images (edit mode) */}
            {entry._existingImages?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Existing images ({entry._existingImages.length})</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {entry._existingImages.map((img, idx) => (
                    <div key={idx} style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={buildImageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                {entry._existingImages?.length > 0 ? 'Replace / add new images for this occasion' : 'Upload images for this occasion'}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="form-input"
                onChange={(e) => handleOccasionImages(entry.relatedTo, e.target.files)}
              />
              {newFiles.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 4 }}>✓ {newFiles.length} new file(s) ready</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Customization Form Builder ─────────────────────────────
function generateFieldId(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 40) + '-' + Math.random().toString(36).substring(2, 6)
}

function CustomizationFormBuilder({ fields, setFields }) {
  const addField = () => {
    setFields(prev => [
      ...prev,
      {
        fieldId: 'field-' + Date.now(),
        label: '',
        type: 'image_upload',
        isRequired: true,
        placeholder: '',
        maxLength: null,
        sortOrder: prev.length,
      }
    ])
  }

  const removeField = (idx) => {
    setFields(prev => prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, sortOrder: i })))
  }

  const updateField = (idx, key, value) => {
    setFields(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      // Auto-generate fieldId from label on label change
      if (key === 'label' && value) {
        next[idx].fieldId = value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '-' + idx
      }
      return next
    })
  }

  const moveField = (idx, dir) => {
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === fields.length - 1) return
    const next = [...fields]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    setFields(next.map((f, i) => ({ ...f, sortOrder: i })))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {fields.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '24px 0',
          color: 'var(--text-muted)', fontSize: 13,
          border: '2px dashed var(--border)', borderRadius: 10
        }}>
          <Settings2 size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div>No customization fields yet.</div>
          <div style={{ fontSize: 11, marginTop: 3 }}>Click "+ Add Field" to build the form customers will fill out.</div>
        </div>
      )}

      {fields.map((field, idx) => (
        <div key={idx} style={{
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '14px 14px 10px',
          position: 'relative',
        }}>
          {/* Field header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={
              {
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: 6,
                background: field.type === 'image_upload' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)',
                color: field.type === 'image_upload' ? '#818cf8' : '#34d399',
                flexShrink: 0
              }
            }>
              {field.type === 'image_upload' ? <Image size={13} /> : <Type size={13} />}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
              Field {idx + 1}
            </span>
            {field.isRequired && (
              <span className="badge badge-danger" style={{ fontSize: 9, padding: '1px 6px' }}>Required</span>
            )}
            {!field.isRequired && (
              <span className="badge badge-default" style={{ fontSize: 9, padding: '1px 6px' }}>Optional</span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button type="button" className="btn btn-ghost btn-icon btn-sm"
                onClick={() => moveField(idx, 'up')} disabled={idx === 0}
                title="Move up" style={{ padding: '2px 4px' }}>
                ↑
              </button>
              <button type="button" className="btn btn-ghost btn-icon btn-sm"
                onClick={() => moveField(idx, 'down')} disabled={idx === fields.length - 1}
                title="Move down" style={{ padding: '2px 4px' }}>
                ↓
              </button>
              <button type="button" className="btn btn-ghost btn-icon btn-sm"
                onClick={() => removeField(idx)}
                style={{ color: 'var(--danger)', padding: '2px 4px' }}
                title="Remove field">
                <X size={13} />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Label *</label>
              <input
                className="form-input"
                style={{ fontSize: 13 }}
                value={field.label}
                onChange={e => updateField(idx, 'label', e.target.value)}
                placeholder="e.g. Cover Photo, Month 1 Image, Your Name"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Field Type *</label>
              <select
                className="form-select"
                style={{ fontSize: 13 }}
                value={field.type}
                onChange={e => updateField(idx, 'type', e.target.value)}
              >
                <option value="image_upload">📷 Image Upload</option>
                <option value="text_input">✏️ Text Input</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, marginBottom: 4 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Helper Text / Placeholder</label>
              <input
                className="form-input"
                style={{ fontSize: 12 }}
                value={field.placeholder}
                onChange={e => updateField(idx, 'placeholder', e.target.value)}
                placeholder={field.type === 'image_upload'
                  ? 'e.g. Upload a clear portrait photo (min. 800×800px)'
                  : 'e.g. Your name or a short quote (max 40 chars)'}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-end' }}>
              {field.type === 'text_input' && (
                <>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Max Length</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ fontSize: 12 }}
                    value={field.maxLength || ''}
                    onChange={e => updateField(idx, 'maxLength', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="e.g. 80"
                    min={1}
                    max={500}
                  />
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label className="toggle" style={{ transform: 'scale(0.8)' }}>
                  <input type="checkbox" checked={field.isRequired}
                    onChange={e => updateField(idx, 'isRequired', e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Required</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-ghost btn-sm"
        style={{ alignSelf: 'flex-start', borderStyle: 'dashed', fontSize: 12 }}
        onClick={addField}>
        <Plus size={13} /> Add Field
      </button>
    </div>
  )
}

export default function Products() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [typeFilter, setTypeFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [viewModal, setViewModal] = useState(null)
  const [form, setForm] = useState({
    name: '', category: '', productType: 'mug', shortDescription: '',
    description: '', basePrice: '', discountPrice: '', deliveryDays: 5,
    isFeatured: false, minOrderQuantity: 1, tags: '',
    stock: 0, lowStockThreshold: 5,
  })
  const [pricingTiers, setPricingTiers] = useState([]) // [{ minQuantity: 10, pricePerUnit: 249 }]
  const [imageFiles, setImageFiles] = useState([])
  // relatedTos in form: [{ relatedTo: id, images: [], thumbnailImage: null, _existingImages: [] }]
  const [productRelatedTos, setProductRelatedTos] = useState([])
  const [occasionImageFiles, setOccasionImageFiles] = useState({}) // { relatedToId: [File] }
  const [saving, setSaving] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkData, setBulkData] = useState({ categoryId: '', percentage: '', operation: 'increase' })
  const [bulkSaving, setBulkSaving] = useState(false)
  // Customization fields state (form-builder)
  const [isCustomizable, setIsCustomizable] = useState(false)
  const [customizationFields, setCustomizationFields] = useState([])
  // GST state per product
  const [isGstApplicable, setIsGstApplicable] = useState(false)
  const [gstPercentage, setGstPercentage] = useState('')   // '' = use global rate
  const [gstIncludedInPrice, setGstIncludedInPrice] = useState('global') // 'global', 'yes', 'no'

  const { data, isLoading } = useQuery({ queryKey: ['products', page, search, typeFilter], queryFn: fetchProducts })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: allRelatedTos = [] } = useQuery({ queryKey: ['relatedTos'], queryFn: fetchRelatedTos })
  const { data: siteSettings = {} } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const globalGstRate = siteSettings?.tax?.gstPercentage ?? 18
  const globalGstEnabled = siteSettings?.tax?.enabled ?? false

  const products = data?.products || []
  const pagination = data?.pagination || {}

  const openCreate = () => {
    setForm({ name: '', category: '', productType: 'mug', shortDescription: '', description: '', basePrice: '', discountPrice: '', deliveryDays: 5, isFeatured: false, minOrderQuantity: 1, tags: '', stock: 0, lowStockThreshold: 5 })
    setImageFiles([])
    setProductRelatedTos([])
    setOccasionImageFiles({})
    setPricingTiers([])
    setIsCustomizable(false)
    setCustomizationFields([])
    setIsGstApplicable(globalGstEnabled)
    setGstPercentage('')
    setGstIncludedInPrice('global')
    setModal('create')
  }

  const openEdit = (p) => {
    setForm({
      name: p.name, category: p.category?._id || p.category, productType: p.productType,
      shortDescription: p.shortDescription || '', description: p.description || '',
      basePrice: p.basePrice, discountPrice: p.discountPrice || '', deliveryDays: p.deliveryDays || 5,
      isFeatured: p.isFeatured || false, minOrderQuantity: p.minOrderQuantity || 1, tags: (p.tags || []).join(', '),
      stock: p.stock || 0, lowStockThreshold: p.lowStockThreshold || 5,
    })
    setImageFiles([])
    setPricingTiers(p.pricingTiers || [])
    // Map existing relatedTos into the form
    const existingRts = (p.relatedTos || []).map(entry => ({
      relatedTo: entry.relatedTo?._id || entry.relatedTo,
      images: entry.images || [],
      thumbnailImage: entry.thumbnailImage || null,
      _existingImages: entry.images || [],
    }))
    setProductRelatedTos(existingRts)
    setOccasionImageFiles({})
    // Load customization
    setIsCustomizable(p.isCustomizable || false)
    setCustomizationFields((p.customizationOptions || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
    // Load GST
    setIsGstApplicable(p.isGstApplicable || false)
    setGstPercentage(p.gstPercentage != null ? String(p.gstPercentage) : '')
    setGstIncludedInPrice(p.gstIncludedInPrice || 'global')
    setModal(p)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    // Validate customization fields if enabled
    if (isCustomizable) {
      const invalid = customizationFields.filter(f => !f.label.trim())
      if (invalid.length > 0) {
        toast.error('All customization fields must have a label')
        return
      }
    }
    setSaving(true)
    try {
      const fd = new FormData()
      // Base fields
      Object.entries(form).forEach(([k, v]) => {
        if (k !== 'tags') fd.append(k, v)
      })
      fd.append('pricingTiers', JSON.stringify(pricingTiers))
      if (form.tags) form.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => fd.append('tags[]', t))
      // Customization
      fd.append('isCustomizable', isCustomizable)
      fd.append('customizationOptions', JSON.stringify(
        isCustomizable ? customizationFields.map((f, i) => ({ ...f, sortOrder: i })) : []
      ))
      // GST
      fd.append('isGstApplicable', isGstApplicable)
      fd.append('gstPercentage', gstPercentage !== '' ? gstPercentage : '')
      fd.append('gstIncludedInPrice', gstIncludedInPrice)
      // Base product images
      imageFiles.forEach((f) => fd.append('images', f))
      // RelatedTos JSON (ids + any existing image references)
      fd.append('relatedTos', JSON.stringify(productRelatedTos.map(e => ({
        relatedTo: e.relatedTo,
        images: e._existingImages || [],
        thumbnailImage: e.thumbnailImage || null,
      }))))
      // Per-occasion new image files
      Object.entries(occasionImageFiles).forEach(([rtId, files]) => {
        files.forEach(f => fd.append(`relatedToImages_${rtId}`, f))
      })

      if (modal === 'create') {
        await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Product created!')
      } else {
        await api.put(`/products/${modal._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Product updated!')
      }
      qc.invalidateQueries({ queryKey: ['products'] })
      setModal(null)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = useMutation({
    mutationFn: (id) => api.patch(`/products/${id}/toggle-status`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Status updated!') },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteProduct = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted!') },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleBulkUpdate = async (e) => {
    e.preventDefault()
    if (!bulkData.categoryId || !bulkData.percentage) {
      return toast.error('Category and percentage are required')
    }
    setBulkSaving(true)
    try {
      const { data } = await api.post('/products/bulk-pricing', bulkData)
      toast.success(data.message || 'Bulk pricing updated successfully!')
      setBulkModalOpen(false)
      setBulkData({ categoryId: '', percentage: '', operation: 'increase' })
      qc.invalidateQueries({ queryKey: ['products'] })
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your printing products catalog</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setBulkModalOpen(true)}>
            <DollarSign size={16} /> Bulk Pricing
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-bar">
          <Search size={16} />
          <input className="form-input" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="form-select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} style={{ width: 160 }}>
          <option value="all">All Types</option>
          {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        <span className="badge badge-default">{pagination.total || 0} products</span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Stock</th>
                <th>Category</th>
                <th>Occasions</th>
                <th>Price</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><Package size={40} /><h3>No products found</h3></div></td></tr>
              ) : products.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        {buildImageUrl(p.thumbnailImage || p.images?.[0]) ? (
                          <img src={buildImageUrl(p.thumbnailImage || p.images?.[0])} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Package size={22} color="var(--text-muted)" />
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{p.name}</span>
                        {p.isFeatured && <span className="badge badge-brand" style={{ fontSize: 9, alignSelf: 'flex-start', padding: '1px 6px' }}>FEATURED</span>}
                      </div>
                    </div>
                  </td>
                  {/* Customizable badge in product list */}
                  <td>
                    <span className="badge badge-default">{p.productType?.replace('_', ' ')}</span>
                    {p.isCustomizable && <span className="badge badge-brand" style={{ fontSize: 9, padding: '1px 6px', display: 'block', marginTop: 3 }}>✏️ Custom</span>}
                  </td>
                  <td>
                    {(p.stock ?? 0) <= 0 ? (
                      <span className="badge badge-danger" title="Out of stock">{p.stock ?? 0}</span>
                    ) : (p.stock ?? 0) <= (p.lowStockThreshold || 5) ? (
                      <span className="badge badge-warning" title="Low stock">{p.stock}</span>
                    ) : (
                      <span className="badge badge-success">{p.stock}</span>
                    )}
                  </td>
                  <td>{p.category?.name ? <Link to="/categories" className="entity-link" onClick={(e) => e.stopPropagation()} style={{ fontSize: 12 }}>{p.category.name}</Link> : '—'}</td>
                  <td>
                    {p.relatedTos?.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 140 }}>
                        {p.relatedTos.slice(0, 3).map(rt => (
                          <span key={rt._id} className="badge badge-brand" style={{ fontSize: 9, padding: '2px 6px' }}>
                            {rt.relatedTo?.icon || '🏷️'} {rt.relatedTo?.name || '—'}
                          </span>
                        ))}
                        {p.relatedTos.length > 3 && <span className="badge badge-default" style={{ fontSize: 9 }}>+{p.relatedTos.length - 3}</span>}
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 13 }}>{formatCurrency(p.discountPrice || p.basePrice)}</div>
                    {p.discountPrice && <div style={{ textDecoration: 'line-through', fontSize: 11, color: 'var(--text-muted)' }}>{formatCurrency(p.basePrice)}</div>}
                  </td>
                  <td>
                    <Link to="/reviews" className="entity-link" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                      <Star size={12} color="#f59e0b" fill="#f59e0b" />
                      <span style={{ fontSize: 12 }}>{p.rating?.average?.toFixed(1) || '0.0'} ({p.rating?.count || 0})</span>
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewModal(p)} title="View Details">
                        <Eye size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)} title="Edit Details">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/products/${p._id}/template`)} title="Design Template (Fabric.js)">
                        <PenTool size={14} color="var(--brand)" />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => toggleStatus.mutate(p._id)}
                        style={{ color: p.isActive ? 'var(--warning)' : 'var(--success)' }}
                      >
                        {p.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProduct.mutate(p._id) }}
                        style={{ color: 'var(--danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} products)
          </span>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map(n => (
              <button key={n} className={`pagination-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className="pagination-btn" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">{modal === 'create' ? 'Add Product' : 'Edit Product'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Custom Photo Mug" />
                </div>
                <div className="form-group">
                  <label className="form-label">Product Type *</label>
                  <select className="form-select" value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })} required>
                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Select category...</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Days</label>
                  <input type="number" className="form-input" value={form.deliveryDays} onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })} min={1} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Short Description</label>
                <input className="form-input" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} placeholder="Brief product description..." />
              </div>
              <div className="form-group">
                <label className="form-label">Full Description</label>
                <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Detailed description..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Base Price (₹) *</label>
                  <input type="number" className="form-input" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required min={0} step={0.01} placeholder="299" />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Price (₹)</label>
                  <input type="number" className="form-input" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} min={0} step={0.01} placeholder="249" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Min Order Qty</label>
                  <input type="number" className="form-input" value={form.minOrderQuantity} onChange={(e) => setForm({ ...form, minOrderQuantity: e.target.value })} min={1} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma separated)</label>
                  <input className="form-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="gift, custom, photo" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Current Stock</label>
                  <input type="number" className="form-input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} min={0} />
                </div>
                <div className="form-group">
                  <label className="form-label">Low Stock Alert Threshold</label>
                  <input type="number" className="form-input" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} min={1} />
                </div>
              </div>

              {/* pricing tiers manager */}
              <div style={{ border: '1px dashed var(--border)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Dynamic Pricing Tiers</div>
                {pricingTiers.map((tier, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Min Qty</label>
                      <input type="number" className="form-input input-sm" value={tier.minQuantity} onChange={(e) => {
                        const newTiers = [...pricingTiers]; 
                        newTiers[idx].minQuantity = parseInt(e.target.value);
                        setPricingTiers(newTiers);
                      }} min={2} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Price Per Unit</label>
                      <input type="number" className="form-input input-sm" value={tier.pricePerUnit} onChange={(e) => {
                        const newTiers = [...pricingTiers];
                        newTiers[idx].pricePerUnit = parseFloat(e.target.value);
                        setPricingTiers(newTiers);
                      }} min={0} />
                    </div>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setPricingTiers(pricingTiers.filter((_, i) => i !== idx))}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPricingTiers([...pricingTiers, { minQuantity: 2, pricePerUnit: 0 }])}>
                  + Add Price Tier
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Base Product Images (up to 10)</label>
                <input type="file" accept="image/*" multiple className="form-input" onChange={(e) => setImageFiles(Array.from(e.target.files))} />
                {imageFiles.length > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{imageFiles.length} file(s) selected</div>}
              </div>

              {/* ── Customizable Toggle + Form Builder ── */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <label className="toggle">
                    <input type="checkbox" checked={isCustomizable} onChange={e => setIsCustomizable(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>This product is customisable</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Customers will fill a form before adding to cart</span>
                </div>

                {isCustomizable && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(16,185,129,0.03) 100%)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 12,
                    padding: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <Settings2 size={15} color="var(--brand)" />
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>Customization Form Builder</span>
                      <span className="badge badge-brand" style={{ fontSize: 10 }}>{customizationFields.length} field{customizationFields.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, background: 'rgba(99,102,241,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                      💡 Add fields below. Each field becomes an input the customer fills before adding to cart.
                      Use <strong>Image Upload</strong> for photos and <strong>Text Input</strong> for names/messages.
                    </div>
                    <CustomizationFormBuilder fields={customizationFields} setFields={setCustomizationFields} />
                  </div>
                )}
              </div>

              {/* ── RelatedTo Section ── */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Heart size={16} color="var(--brand)" />
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Occasion Tags & Images</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Each occasion can have its own images</span>
                </div>
                <RelatedToSection
                  productRelatedTos={productRelatedTos}
                  setProductRelatedTos={setProductRelatedTos}
                  allRelatedTos={allRelatedTos}
                  occasionImageFiles={occasionImageFiles}
                  setOccasionImageFiles={setOccasionImageFiles}
                />
              </div>

              {/* ── GST Section ── */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <label className="toggle">
                    <input type="checkbox" checked={isGstApplicable} onChange={e => setIsGstApplicable(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>GST applicable on this product</span>
                    {!globalGstEnabled && (
                      <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 2 }}>⚠️ GST is disabled globally in Settings → Tax. Enable it there first.</div>
                    )}
                  </div>
                </div>
                {isGstApplicable && (
                  <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <label className="form-label" style={{ marginBottom: 4 }}>GST Rate Override (%)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={gstPercentage}
                        onChange={e => setGstPercentage(e.target.value)}
                        min={0} max={100} step={0.5}
                        placeholder={`${globalGstRate} (global rate)`}
                      />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Leave blank to use global GST rate ({globalGstRate}%). Enter a value to override for this product only.
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <label className="form-label" style={{ marginBottom: 4 }}>Is GST Included in Price?</label>
                        <select className="form-input" value={gstIncludedInPrice} onChange={e => setGstIncludedInPrice(e.target.value)}>
                          <option value="global">Use Global Setting ({siteSettings?.tax?.includedInPrice ? 'Included' : 'Added on checkut'})</option>
                          <option value="yes">Yes, Included in price</option>
                          <option value="no">No, Add on checkout</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 180, fontSize: 12, color: 'var(--text-muted)', paddingTop: 20 }}>
                      {(() => {
                        const effectiveRate = parseFloat(gstPercentage || globalGstRate)
                        const sellingPrice = parseFloat(form.discountPrice || form.basePrice || 0)
                        const basePrice = parseFloat(form.basePrice || 0)
                        const hasDiscount = form.discountPrice && parseFloat(form.discountPrice) < parseFloat(form.basePrice)
                        if (!sellingPrice) return <span>Enter a price to see GST preview</span>

                        const includedInPrice = gstIncludedInPrice === 'global' ? siteSettings?.tax?.includedInPrice : (gstIncludedInPrice === 'yes')
                        let baseUnit, gstAmt, total
                        if (includedInPrice) {
                          baseUnit = sellingPrice / (1 + effectiveRate / 100)
                          gstAmt = sellingPrice - baseUnit
                          total = sellingPrice
                        } else {
                          baseUnit = sellingPrice
                          gstAmt = sellingPrice * effectiveRate / 100
                          total = sellingPrice + gstAmt
                        }

                        return (
                          <>
                            <div>Rate: <strong style={{ color: 'var(--primary)' }}>{effectiveRate}% {gstPercentage !== '' ? '(product override)' : '(global)'}</strong></div>
                            <div style={{ marginTop: 6, lineHeight: 1.8 }}>
                              {hasDiscount && (
                                <div style={{ color: 'var(--warning)', marginBottom: 4 }}>
                                  ⚡ GST on discounted price (<strong>₹{sellingPrice.toFixed(2)}</strong>), not base (₹{basePrice.toFixed(2)})
                                </div>
                              )}
                              Selling price: <strong>₹{sellingPrice.toFixed(2)}</strong><br/>
                              Base (ex-GST): <strong>₹{baseUnit.toFixed(2)}</strong><br/>
                              GST ({effectiveRate}%): <strong>₹{gstAmt.toFixed(2)}</strong><br/>
                              {includedInPrice
                                ? <span style={{ color: 'var(--success)' }}>✓ GST included → Customer pays ₹{total.toFixed(2)}</span>
                                : <span>Total (customer pays): <strong>₹{total.toFixed(2)}</strong></span>
                              }
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label className="toggle">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                  <span className="toggle-slider" />
                </label>
                <span className="form-label" style={{ marginBottom: 0 }}>Mark as Featured Product</span>

              </div>
              <div className="modal-footer" style={{ margin: 0, padding: 0, border: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : modal === 'create' ? 'Create Product' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewModal(null) }}>
          <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">Product Details</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewModal(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ width: 120, height: 120, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', flexShrink: 0 }}>
                  {buildImageUrl(viewModal.thumbnailImage || viewModal.images?.[0]) ? (
                    <img src={buildImageUrl(viewModal.thumbnailImage || viewModal.images?.[0])} alt={viewModal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Package size={40} color="var(--text-muted)" />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{viewModal.name}</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="badge badge-default">{viewModal.productType?.replace('_', ' ')}</span>
                    <span className={`badge ${viewModal.isActive ? 'badge-success' : 'badge-danger'}`}>{viewModal.isActive ? 'Active' : 'Inactive'}</span>
                    {viewModal.isFeatured && <span className="badge badge-brand">Featured</span>}
                    <Link to="/reviews" className="entity-link" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                      <Star size={14} color="#f59e0b" fill="#f59e0b" />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{viewModal.rating?.average?.toFixed(1) || '0.0'}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({viewModal.rating?.count || 0} reviews)</span>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="two-col">
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>Pricing &amp; Stock</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Base Price</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(viewModal.basePrice)}</span>
                    </div>
                    {viewModal.discountPrice && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Discount Price</span>
                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(viewModal.discountPrice)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Min Order Qty</span>
                      <span style={{ fontWeight: 600 }}>{viewModal.minOrderQuantity || 1}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Stock</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {(viewModal.stock ?? 0) <= 0 ? (
                          <span className="badge badge-danger">Out of Stock</span>
                        ) : (viewModal.stock ?? 0) <= (viewModal.lowStockThreshold || 5) ? (
                          <span className="badge badge-warning">{viewModal.stock} (Low)</span>
                        ) : (
                          <span className="badge badge-success">{viewModal.stock} units</span>
                        )}
                        <Link to="/stock" className="entity-link" style={{ fontSize: 11 }}>Manage ↗</Link>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 2 }}>Category</span>
                      {viewModal.category?.name ? <Link to="/categories" className="entity-link" style={{ fontWeight: 600, fontSize: 13.5 }}>{viewModal.category.name}</Link> : <span style={{ fontWeight: 600, fontSize: 13.5 }}>—</span>}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 2 }}>Tags</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {viewModal.tags?.length > 0 ? viewModal.tags.map(t => <span key={t} className="badge badge-default" style={{ fontSize: 10 }}>{t}</span>) : '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Delivery Est.</span>
                      <span style={{ fontWeight: 600 }}>{viewModal.deliveryDays ? `${viewModal.deliveryDays} Days` : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>


              {/* Customization Fields */}
              {viewModal.isCustomizable && (
                <div className="card" style={{ padding: 20, border: '1px solid rgba(99,102,241,0.25)', background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(16,185,129,0.02) 100%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Settings2 size={15} color="var(--brand)" />
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Customization Form
                    </h4>
                    <span className="badge badge-brand" style={{ fontSize: 10 }}>
                      {viewModal.customizationOptions?.length || 0} field{(viewModal.customizationOptions?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: 10 }}>Customisable</span>
                  </div>
                  {viewModal.customizationOptions?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[...viewModal.customizationOptions]
                        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                        .map((field, idx) => (
                          <div key={idx} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8,
                            border: '1px solid var(--border-light)',
                          }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: 6, flexShrink: 0, marginTop: 1,
                              background: field.type === 'image_upload' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)',
                              color: field.type === 'image_upload' ? '#818cf8' : '#34d399',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {field.type === 'image_upload' ? <Image size={12} /> : <Type size={12} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{field.label}</span>
                                {field.isRequired
                                  ? <span className="badge badge-danger" style={{ fontSize: 9 }}>Required</span>
                                  : <span className="badge badge-default" style={{ fontSize: 9 }}>Optional</span>}
                                <span className="badge badge-default" style={{ fontSize: 9 }}>
                                  {field.type === 'image_upload' ? '📷 Image' : '✏️ Text'}
                                </span>
                                {field.maxLength && <span className="badge badge-default" style={{ fontSize: 9 }}>Max {field.maxLength} chars</span>}
                              </div>
                              {field.placeholder && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>
                                  {field.placeholder}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginTop: 4 }}>#{idx + 1}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                      No customization fields defined.
                    </div>
                  )}
                </div>
              )}

              {/* Occasion Tags with images */}
              {viewModal.relatedTos?.length > 0 && (
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                    <Heart size={14} style={{ marginRight: 6, color: 'var(--brand)' }} />
                    Occasion Tags ({viewModal.relatedTos.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {viewModal.relatedTos.map((entry) => (
                      <div key={entry._id} style={{ borderLeft: '3px solid var(--brand)', paddingLeft: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          {entry.relatedTo?.icon && <span style={{ fontSize: 18 }}>{entry.relatedTo.icon}</span>}
                          <span style={{ fontWeight: 700, fontSize: 13.5 }}>{entry.relatedTo?.name || '—'}</span>
                          <span className="badge badge-default" style={{ fontSize: 10 }}>{entry.images?.length || 0} images</span>
                        </div>
                        {entry.images?.length > 0 && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {entry.images.map((img, idx) => (
                              <div key={idx} style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                                <img src={buildImageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))}
                          </div>
                        )}
                        {(!entry.images || entry.images.length === 0) && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ImageIcon size={14} /> Uses base product images
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewModal.images?.length > 0 && (
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>Product Gallery ({viewModal.images.length})</h4>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {viewModal.images.map((img, idx) => (
                      <div key={idx} style={{ width: 100, height: 100, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                        <img src={buildImageUrl(img)} alt={`${viewModal.name} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewModal.description && (
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>Description</h4>
                  <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
                    {viewModal.shortDescription && <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{viewModal.shortDescription}</div>}
                    {viewModal.description}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setViewModal(null); openEdit(viewModal) }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Pricing Modal */}
      {bulkModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setBulkModalOpen(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Bulk Price Update</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setBulkModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleBulkUpdate} style={{ padding: 20 }}>
              <div style={{ marginBottom: 15 }}>
                <label className="form-label">Category *</label>
                <select className="form-select" value={bulkData.categoryId} onChange={e => setBulkData({...bulkData, categoryId: e.target.value})} required>
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                 <div style={{ flex: 1 }}>
                    <label className="form-label">Operation</label>
                    <select className="form-select" value={bulkData.operation} onChange={e => setBulkData({...bulkData, operation: e.target.value})}>
                       <option value="increase">Increase (+)</option>
                       <option value="decrease">Decrease (-)</option>
                    </select>
                 </div>
                 <div style={{ flex: 1 }}>
                    <label className="form-label">Percentage (%) *</label>
                    <input type="number" className="form-input" value={bulkData.percentage} onChange={e => setBulkData({...bulkData, percentage: e.target.value})} min={1} required placeholder="10" />
                 </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                 <button type="button" className="btn btn-ghost" onClick={() => setBulkModalOpen(false)}>Cancel</button>
                 <button type="submit" className="btn btn-primary" disabled={bulkSaving}>
                   {bulkSaving ? 'Updating...' : 'Update Prices'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
