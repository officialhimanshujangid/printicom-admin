import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search,
  Heart, Eye, Image as ImageIcon,
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatDate, buildImageUrl, extractError } from '../lib/utils'

const fetchRelatedTos = async ({ queryKey }) => {
  const [, search] = queryKey
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const { data } = await api.get(`/related-to?${params}`)
  return data.data?.relatedTos || []
}

export default function RelatedTo() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)   // null | 'create' | { ...relatedTo }
  const [viewModal, setViewModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', icon: '', sortOrder: 0 })
  const [imageFile, setImageFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data: relatedTos = [], isLoading } = useQuery({
    queryKey: ['relatedTos', search],
    queryFn: fetchRelatedTos,
  })

  const openCreate = () => {
    setForm({ name: '', description: '', icon: '', sortOrder: 0 })
    setImageFile(null)
    setModal('create')
  }

  const openEdit = (rt) => {
    setForm({ name: rt.name, description: rt.description || '', icon: rt.icon || '', sortOrder: rt.sortOrder || 0 })
    setImageFile(null)
    setModal(rt)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('description', form.description)
      fd.append('icon', form.icon)
      fd.append('sortOrder', form.sortOrder)
      if (imageFile) fd.append('coverImage', imageFile)

      if (modal === 'create') {
        await api.post('/related-to', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Occasion created!')
      } else {
        await api.put(`/related-to/${modal._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Occasion updated!')
      }
      qc.invalidateQueries({ queryKey: ['relatedTos'] })
      setModal(null)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = useMutation({
    mutationFn: (id) => api.patch(`/related-to/${id}/toggle-status`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['relatedTos'] }); toast.success('Status updated!') },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteRt = useMutation({
    mutationFn: (id) => api.delete(`/related-to/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['relatedTos'] }); toast.success('Occasion deleted!') },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Related To <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>(Occasions / Themes)</span></h1>
          <p className="page-subtitle">Manage occasion tags — Father's Gift, Mother's Gift, Love, Birthday, etc.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Occasion
        </button>
      </div>

      {/* Search */}
      <div className="filters-bar">
        <div className="search-bar">
          <Search size={16} />
          <input
            className="form-input"
            placeholder="Search occasions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="badge badge-default">{relatedTos.length} occasions</span>
      </div>

      {/* Grid Cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
      ) : relatedTos.length === 0 ? (
        <div className="empty-state card" style={{ padding: 60, textAlign: 'center' }}>
          <Heart size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <h3>No occasions yet</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Create your first occasion tag like "Father's Gift" or "Birthday"</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {relatedTos.map((rt) => (
            <div key={rt._id} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
              {/* Cover Image */}
              <div style={{ height: 120, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {buildImageUrl(rt.coverImage) ? (
                  <img src={buildImageUrl(rt.coverImage)} alt={rt.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                    {rt.icon ? <span style={{ fontSize: 40 }}>{rt.icon}</span> : <Heart size={36} />}
                  </div>
                )}
                {/* Status badge */}
                <span
                  className={`badge ${rt.isActive ? 'badge-success' : 'badge-danger'}`}
                  style={{ position: 'absolute', top: 10, right: 10, fontSize: 10 }}
                >
                  {rt.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={{ padding: '12px 16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {rt.icon && <span style={{ fontSize: 20 }}>{rt.icon}</span>}
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{rt.name}</span>
                </div>
                {rt.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {rt.description}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(rt.createdAt)}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewModal(rt)} title="View">
                      <Eye size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(rt)} title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => toggleStatus.mutate(rt._id)}
                      style={{ color: rt.isActive ? 'var(--warning)' : 'var(--success)' }}
                    >
                      {rt.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => { if (confirm(`Delete "${rt.name}"? This will remove it from all products.`)) deleteRt.mutate(rt._id) }}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">{modal === 'create' ? '✨ Add Occasion' : `Edit "${modal.name}"`}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Occasion Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Father's Gift, Birthday, Valentine"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description for this occasion..."
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Icon / Emoji</label>
                  <input
                    className="form-input"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="🎁 👨 ❤️"
                    style={{ fontSize: 20 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Cover Image</label>
                <input type="file" accept="image/*" className="form-input" onChange={(e) => setImageFile(e.target.files[0])} />
                {imageFile && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Selected: {imageFile.name}</div>}
              </div>
              <div className="modal-footer" style={{ margin: 0, padding: 0, border: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : modal === 'create' ? 'Create Occasion' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewModal(null) }}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">Occasion Details</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewModal(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Cover */}
              <div style={{ height: 160, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {buildImageUrl(viewModal.coverImage) ? (
                  <img src={buildImageUrl(viewModal.coverImage)} alt={viewModal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {viewModal.icon ? <div style={{ fontSize: 56 }}>{viewModal.icon}</div> : <ImageIcon size={40} />}
                  </div>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {viewModal.icon && <span style={{ marginRight: 8 }}>{viewModal.icon}</span>}
                  {viewModal.name}
                </h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={`badge ${viewModal.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {viewModal.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="badge badge-default">Sort: {viewModal.sortOrder}</span>
                </div>
              </div>
              {viewModal.description && (
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{viewModal.description}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Slug</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{viewModal.slug}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Created</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{formatDate(viewModal.createdAt)}</span>
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setViewModal(null); openEdit(viewModal) }}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
