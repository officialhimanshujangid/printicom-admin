import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Phone, MessageSquare, Trash2, CheckCircle, Clock, Search, MoreHorizontal, User, MailOpen } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { extractError, formatDateTime, timeAgo } from '../lib/utils'

const fetchSubmissions = async ({ queryKey }) => {
  const [, status, category, page] = queryKey
  const params = new URLSearchParams({ page })
  if (status) params.set('status', status)
  if (category) params.set('category', category)
  const { data: res } = await api.get(`/contact/admin?${params}`)
  return { submissions: res.data || [], pagination: res.pagination || {} }
}

export default function ContactSubmissions() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [selectedSub, setSelectedSub] = useState(null)

  const { data, isLoading } = useQuery({ queryKey: ['contactSubmissions', status, category, page], queryFn: fetchSubmissions })
  const submissions = data?.submissions || []

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, adminNote }) => {
      await api.put(`/contact/admin/${id}`, { status, adminNote })
    },
    onSuccess: () => {
      toast.success('Submission updated!')
      qc.invalidateQueries({ queryKey: ['contactSubmissions'] })
      if (selectedSub) setSelectedSub(null)
    },
    onError: (err) => toast.error(extractError(err))
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await api.delete(`/contact/admin/${id}`) },
    onSuccess: () => { toast.success('Submission deleted!'); qc.invalidateQueries({ queryKey: ['contactSubmissions'] }); setSelectedSub(null) },
    onError: (err) => toast.error(extractError(err))
  })

  const STATUSES = {
    new: { label: 'New', color: 'var(--brand)', icon: <Mail size={14}/> },
    read: { label: 'Read', color: 'var(--warning)', icon: <MailOpen size={14}/> },
    replied: { label: 'Replied', color: 'var(--success)', icon: <CheckCircle size={14}/> },
    closed: { label: 'Closed', color: 'var(--text-muted)', icon: <Clock size={14}/> },
  }

  if (isLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Contact Submissions</h1>
          <p className="page-subtitle">Manage customer queries and support messages</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select className="form-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            <option value="new">New Inbox</option>
            <option value="read">Previously Read</option>
            <option value="replied">Successfully Replied</option>
            <option value="closed">Closed / Spam</option>
          </select>
          <select className="form-select" value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} style={{ minWidth: 180 }}>
            <option value="">All Categories</option>
            <option value="Bulk Order">Bulk Order</option>
            <option value="General Inquiry">General Inquiry</option>
            <option value="Design Help">Design Help</option>
            <option value="Feedback">Feedback</option>
            <option value="Partnership">Partnership</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th width="180">Sender</th>
              <th width="180">Subject</th>
              <th width="120">Category</th>
              <th width="80">Priority</th>
              <th>Status</th>
              <th>Time</th>
              <th width="100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(sub => (
              <tr key={sub._id} style={{ opacity: sub.status === 'closed' ? 0.6 : 1 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: 13 }}>{sub.name?.[0]}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sub.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{sub.subject || '(No subject)'}</td>
                <td><span className="badge badge-default" style={{ fontSize: 10 }}>{sub.category}</span></td>
                <td>
                  <span className={`badge ${sub.priority === 'High' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: 10 }}>
                    {sub.priority}
                  </span>
                </td>
                <td>
                  <span className={`badge ${sub.status === 'new' ? 'badge-primary' : sub.status === 'replied' ? 'badge-success' : 'badge-default'}`} style={{ display: 'flex', gap: 6, alignItems: 'center', width: 'fit-content' }}>
                    {STATUSES[sub.status]?.icon}
                    {STATUSES[sub.status]?.label}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{timeAgo(sub.createdAt)}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedSub(sub)}><MailOpen size={14} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteMutation.mutate(sub._id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSub && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2 className="modal-title">Contact Message Detail</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedSub(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>FROM</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedSub.name}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 13, color: 'var(--brand)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12}/> {selectedSub.email}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12}/> {selectedSub.phone || 'N/A'}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>RECEIVED</div>
                   <div style={{ fontWeight: 600 }}>{formatDateTime(selectedSub.createdAt)}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>SUBJECT</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedSub.subject || '(No subject)'}</div>
              </div>

              {selectedSub.category === 'Bulk Order' && (selectedSub.bulkProductName || selectedSub.bulkQuantityEstimate != null) && (
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>BULK ORDER DETAILS</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedSub.bulkProductName || '—'}</div>
                  {selectedSub.bulkProductSlug && (
                    <div style={{ fontSize: 12, color: 'var(--brand)', marginTop: 4 }}>
                      Slug: {selectedSub.bulkProductSlug}
                    </div>
                  )}
                  {selectedSub.bulkQuantityEstimate != null && (
                    <div style={{ fontSize: 13, marginTop: 8 }}>Estimated qty: <strong>{selectedSub.bulkQuantityEstimate}</strong></div>
                  )}
                  {selectedSub.bulkCompany && (
                    <div style={{ fontSize: 13, marginTop: 4 }}>Company: {selectedSub.bulkCompany}</div>
                  )}
                </div>
              )}

              <div style={{ background: 'var(--bg-hover)', padding: 16, borderRadius: 12, minHeight: 120 }}>
                 <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>MESSAGE CONTENT</div>
                 <div style={{ color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedSub.message}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Admin Internal Note</label>
                <textarea className="form-textarea" placeholder="Internal notes for team..." value={selectedSub.adminNote || ''} onChange={(e) => setSelectedSub({...selectedSub, adminNote: e.target.value})} />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                   <button className="btn btn-success" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: selectedSub._id, status: 'replied', adminNote: selectedSub.adminNote })}>
                      <CheckCircle size={16} /> Mark as Replied
                   </button>
                   <button className="btn" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: selectedSub._id, status: 'closed', adminNote: selectedSub.adminNote })}>
                      Close / Spam
                   </button>
                </div>
                <button className="btn btn-ghost" onClick={() => setSelectedSub(null)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
