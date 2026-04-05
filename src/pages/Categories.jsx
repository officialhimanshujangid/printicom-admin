import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, Image, Eye } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatDate, buildImageUrl, extractError } from '../lib/utils'

const fetchCategories = async () => {
  const { data } = await api.get('/categories')
  return data.data?.categories || data.data || []
}

export default function Categories() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | { ...category }
  const [viewModal, setViewModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', sortOrder: 0 })
  const [imageFile, setImageFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data: categories = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })

  const filtered = categories.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setForm({ name: '', description: '', sortOrder: 0 })
    setImageFile(null)
    setModal('create')
  }

  const openEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description || '', sortOrder: cat.sortOrder || 0 })
    setImageFile(null)
    setModal(cat)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('description', form.description)
      fd.append('sortOrder', form.sortOrder)
      if (imageFile) fd.append('image', imageFile)

      if (modal === 'create') {
        await api.post('/categories', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Category created!')
      } else {
        await api.put(`/categories/${modal._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Category updated!')
      }
      qc.invalidateQueries({ queryKey: ['categories'] })
      setModal(null)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = useMutation({
    mutationFn: (id) => api.patch(`/categories/${id}/toggle-status`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Status updated!') },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteCategory = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category deleted!') },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Manage product categories for your store</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Search */}
      <div className="filters-bar">
        <div className="search-bar">
          <Search size={16} />
          <input className="form-input" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="badge badge-default">{filtered.length} categories</span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Sort Order</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><Image size={40} /><h3>No categories found</h3></div></td></tr>
              ) : filtered.map((cat) => (
                <tr key={cat._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        {buildImageUrl(cat.image) ? (
                          <img src={buildImageUrl(cat.image)} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Image size={20} color="var(--text-muted)" />
                        )}
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13.5 }}>{cat.name}</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description || '—'}</td>
                  <td>{cat.sortOrder ?? 0}</td>
                  <td>
                    <span className={`badge ${cat.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDate(cat.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewModal(cat)} title="View Details">
                        <Eye size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(cat)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => toggleStatus.mutate(cat._id)}
                        title={cat.isActive ? 'Deactivate' : 'Activate'}
                        style={{ color: cat.isActive ? 'var(--warning)' : 'var(--success)' }}
                      >
                        {cat.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCategory.mutate(cat._id) }}
                        title="Delete"
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

      {/* Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">{modal === 'create' ? 'Add Category' : 'Edit Category'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Mugs & Drinkware" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description..." rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Sort Order</label>
                <input type="number" className="form-input" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Category Image</label>
                <input type="file" accept="image/*" className="form-input" onChange={(e) => setImageFile(e.target.files[0])} />
                {imageFile && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Selected: {imageFile.name}</div>}
              </div>
              <div className="modal-footer" style={{ margin: 0, padding: 0, border: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : modal === 'create' ? 'Create' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewModal(null) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Category Details</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewModal(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                  {buildImageUrl(viewModal.image) ? (
                    <img src={buildImageUrl(viewModal.image)} alt={viewModal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Image size={32} color="var(--text-muted)" />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{viewModal.name}</h3>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${viewModal.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {viewModal.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Description</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>{viewModal.description || 'No description provided.'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Created On</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>{formatDate(viewModal.createdAt)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Sort Order</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>{viewModal.sortOrder ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
