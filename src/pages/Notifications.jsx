import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Bell, Megaphone, Search } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatDateTime, extractError } from '../lib/utils'

const fetchNotifications = async () => {
  const { data } = await api.get('/notifications/admin/all')
  return data.data?.notifications || data.data || []
}

export default function Notifications() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', type: 'info' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const { data: notifications = [], isLoading } = useQuery({ queryKey: ['admin-notifications'], queryFn: fetchNotifications })

  const filtered = notifications.filter((n) =>
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.message?.toLowerCase().includes(search.toLowerCase())
  )

  const handleBroadcast = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/notifications/broadcast', form)
      toast.success('Broadcast sent to all users!')
      qc.invalidateQueries({ queryKey: ['admin-notifications'] })
      setModal(false)
      setForm({ title: '', message: '', type: 'info' })
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const deleteNotif = useMutation({
    mutationFn: (id) => api.delete(`/notifications/admin/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-notifications'] }); toast.success('Notification deleted!') },
    onError: (err) => toast.error(extractError(err)),
  })

  const TYPE_COLORS = {
    info: 'badge-info',
    success: 'badge-success',
    warning: 'badge-warning',
    order_update: 'badge-brand',
    promotion: 'badge-warning',
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Broadcast messages to all users</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Megaphone size={16} /> Broadcast Notification
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-bar">
          <Search size={16} />
          <input className="form-input" placeholder="Search notifications..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="badge badge-default">{filtered.length} notifications</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Type</th>
                <th>Sent To</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Bell size={40} />
                      <h3>No notifications yet</h3>
                      <p>Broadcast notifications will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((n) => (
                <tr key={n._id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{n.title}</td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)' }}>{n.message}</td>
                  <td><span className={`badge ${TYPE_COLORS[n.type] || 'badge-default'}`}>{n.type}</span></td>
                  <td style={{ fontSize: 12 }}>
                    {n.user ? <span className="badge badge-default">Single user</span> : <span className="badge badge-brand">All users</span>}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(n.createdAt)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => { if (confirm('Delete this notification?')) deleteNotif.mutate(n._id) }}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Modal */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">📢 Broadcast Notification</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
              This will send a notification to <strong style={{ color: 'var(--brand-primary)' }}>ALL active users</strong>. Use wisely!
            </div>
            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Notification Title *</label>
                <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="🎉 New Collection Launched!" />
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-textarea" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required placeholder="Check out our amazing new products..." rows={4} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="promotion">Promotion</option>
                  <option value="order_update">Order Update</option>
                </select>
              </div>
              <div className="modal-footer" style={{ margin: 0, padding: 0, border: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Megaphone size={15} />
                  {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Send Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
