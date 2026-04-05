import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Image, BarChart2 } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatDate, buildImageUrl, extractError, BANNER_PLACEMENTS } from '../lib/utils'

const fetchBanners = async () => {
  const { data } = await api.get('/banners')
  return data.data?.banners || data.data || []
}

const defaultForm = {
  title: '', subtitle: '', description: '', altText: '', placement: 'hero_slider',
  ctaText: '', ctaLink: '', ctaTarget: '_self', backgroundColor: '', textColor: '',
  badgeText: '', startDate: '', endDate: '', sortOrder: 0,
}

export default function Banners() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [imageFile, setImageFile] = useState(null)
  const [mobileImageFile, setMobileImageFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterPlacement, setFilterPlacement] = useState('')

  const { data: banners = [], isLoading } = useQuery({ queryKey: ['banners'], queryFn: fetchBanners })

  const filtered = banners.filter((b) =>
    !filterPlacement || b.placement === filterPlacement
  )

  const openCreate = () => {
    setForm({ ...defaultForm })
    setImageFile(null)
    setMobileImageFile(null)
    setModal('create')
  }

  const openEdit = (b) => {
    setForm({
      title: b.title, subtitle: b.subtitle || '', description: b.description || '',
      altText: b.altText || '', placement: b.placement,
      ctaText: b.ctaText || '', ctaLink: b.ctaLink || '', ctaTarget: b.ctaTarget || '_self',
      backgroundColor: b.backgroundColor || '', textColor: b.textColor || '',
      badgeText: b.badgeText || '', startDate: b.startDate?.split('T')[0] || '',
      endDate: b.endDate?.split('T')[0] || '', sortOrder: b.sortOrder || 0,
    })
    setImageFile(null)
    setMobileImageFile(null)
    setModal(b)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (modal === 'create' && !imageFile) { toast.error('Please select a banner image'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v) })
      if (imageFile) fd.append('imageUrl', imageFile)
      if (mobileImageFile) fd.append('mobileImageUrl', mobileImageFile)

      if (modal === 'create') {
        await api.post('/banners', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Banner created!')
      } else {
        await api.put(`/banners/${modal._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Banner updated!')
      }
      qc.invalidateQueries({ queryKey: ['banners'] })
      setModal(null)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = useMutation({
    mutationFn: (id) => api.patch(`/banners/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['banners'] }); toast.success('Status updated!') },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteBanner = useMutation({
    mutationFn: (id) => api.delete(`/banners/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['banners'] }); toast.success('Banner deleted!') },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Banners & Advertisements</h1>
          <p className="page-subtitle">Control promotional content across your storefront</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Banner
        </button>
      </div>

      <div className="filters-bar">
        <select className="form-select" value={filterPlacement} onChange={(e) => setFilterPlacement(e.target.value)} style={{ width: 200 }}>
          <option value="">All Placements</option>
          {BANNER_PLACEMENTS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
        </select>
        <span className="badge badge-default">{filtered.length} banners</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Preview</th>
                <th>Title</th>
                <th>Placement</th>
                <th>Schedule</th>
                <th>Analytics</th>
                <th>Sort</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><Image size={40} /><h3>No banners found</h3></div></td></tr>
              ) : filtered.map((b) => (
                <tr key={b._id}>
                  <td>
                    {buildImageUrl(b.imageUrl) ? (
                      <img src={buildImageUrl(b.imageUrl)} alt={b.title} style={{ width: 80, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-light)' }} />
                    ) : (
                      <div style={{ width: 80, height: 44, background: b.backgroundColor || 'var(--bg-hover)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image size={18} color="var(--text-muted)" />
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{b.title}</div>
                    {b.badgeText && <span style={{ fontSize: 9, background: 'var(--warning)', color: '#000', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{b.badgeText}</span>}
                    {b.ctaText && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>CTA: {b.ctaText}</div>}
                  </td>
                  <td><span className="badge badge-brand">{b.placement?.replace(/_/g, ' ')}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {b.startDate ? formatDate(b.startDate) : 'Immediate'}
                    <br />{b.endDate ? `→ ${formatDate(b.endDate)}` : 'No expiry'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{b.impressions || 0}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>views</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)' }}>{b.clicks || 0}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>clicks</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>{b.ctr || '0'}%</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>CTR</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{b.sortOrder}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span className={`badge ${b.isActive ? 'badge-success' : 'badge-danger'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
                      {b.isLive !== undefined && <span className={`badge ${b.isLive ? 'badge-success' : 'badge-default'}`} style={{ fontSize: 9 }}>{b.isLive ? 'LIVE' : 'Scheduled'}</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)}><Pencil size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleStatus.mutate(b._id)} style={{ color: b.isActive ? 'var(--warning)' : 'var(--success)' }}>
                        {b.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { if (confirm('Delete this banner?')) deleteBanner.mutate(b._id) }} style={{ color: 'var(--danger)' }}>
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

      {/* Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">{modal === 'create' ? 'Create Banner' : 'Edit Banner'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Summer Sale - Up to 50% Off" />
                </div>
                <div className="form-group">
                  <label className="form-label">Placement *</label>
                  <select className="form-select" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}>
                    {BANNER_PLACEMENTS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Subtitle</label>
                <input className="form-input" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Limited time offer" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CTA Text</label>
                  <input className="form-input" value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} placeholder="Shop Now" />
                </div>
                <div className="form-group">
                  <label className="form-label">CTA Link</label>
                  <input className="form-input" value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} placeholder="/products" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Badge Text</label>
                  <input className="form-input" value={form.badgeText} onChange={(e) => setForm({ ...form, badgeText: e.target.value })} placeholder="NEW, HOT, LIMITED" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input type="number" className="form-input" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Background Color</label>
                  <input type="color" className="form-input" value={form.backgroundColor || '#000000'} onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })} style={{ height: 42, cursor: 'pointer' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Text Color</label>
                  <input type="color" className="form-input" value={form.textColor || '#ffffff'} onChange={(e) => setForm({ ...form, textColor: e.target.value })} style={{ height: 42, cursor: 'pointer' }} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" className="form-input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Banner Image * (Desktop)</label>
                <input type="file" accept="image/*" className="form-input" onChange={(e) => setImageFile(e.target.files[0])} />
                {modal !== 'create' && !imageFile && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Leave empty to keep existing image</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Image (optional)</label>
                <input type="file" accept="image/*" className="form-input" onChange={(e) => setMobileImageFile(e.target.files[0])} />
              </div>
              <div className="modal-footer" style={{ margin: 0, padding: 0, border: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : modal === 'create' ? 'Create Banner' : 'Update Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
