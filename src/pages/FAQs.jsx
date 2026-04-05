import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HelpCircle, Plus, Edit, Trash2, GripVertical, Save, Info, ShoppingBag, Truck, CreditCard, RotateCcw } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { extractError } from '../lib/utils'

const fetchFAQs = async () => {
  const { data } = await api.get('/faqs/admin')
  return data.data?.faqs || []
}

export default function FAQs() {
  const qc = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFAQ, setEditingFAQ] = useState(null)
  
  const [formData, setFormData] = useState({ question: '', answer: '', category: 'general', isPublished: true, order: 0 })

  const { data: faqs = [], isLoading } = useQuery({ queryKey: ['faqs'], queryFn: fetchFAQs })

  const upsertMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingFAQ) await api.put(`/faqs/admin/${editingFAQ._id}`, payload)
      else await api.post('/faqs/admin', payload)
    },
    onSuccess: () => {
      toast.success(editingFAQ ? 'FAQ updated!' : 'FAQ created!')
      setIsModalOpen(false)
      setEditingFAQ(null)
      qc.invalidateQueries({ queryKey: ['faqs'] })
    },
    onError: (err) => toast.error(extractError(err))
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await api.delete(`/faqs/admin/${id}`) },
    onSuccess: () => { toast.success('FAQ deleted!'); qc.invalidateQueries({ queryKey: ['faqs'] }) },
    onError: (err) => toast.error(extractError(err))
  })

  const openModal = (faq = null) => {
    if (faq) {
      setEditingFAQ(faq)
      setFormData({ ...faq })
    } else {
      setEditingFAQ(null)
      setFormData({ question: '', answer: '', category: 'general', isPublished: true, order: faqs.length })
    }
    setIsModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this FAQ?')) deleteMutation.mutate(id)
  }

  const CAT_ICONS = {
    orders: <ShoppingBag size={14} />,
    payments: <CreditCard size={14} />,
    shipping: <Truck size={14} />,
    returns: <RotateCcw size={14} />,
    general: <HelpCircle size={14} />,
  }

  if (isLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Frequently Asked Questions (FAQ)</h1>
          <p className="page-subtitle">Add/edit questions for the help center</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}><Plus size={16} /> New FAQ</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th width="320">Question</th>
              <th>Category</th>
              <th>Status</th>
              <th>Order</th>
              <th width="100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {faqs.length === 0 ? (
              <tr><td colSpan="5" align="center" style={{ padding: 40, color: 'var(--text-muted)' }}>No FAQs found. Add one to get started!</td></tr>
            ) : faqs.map(faq => (
              <tr key={faq._id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{faq.question}</td>
                <td>
                  <span className="badge badge-default" style={{ display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                    {CAT_ICONS[faq.category] || <HelpCircle size={14} />}
                    {faq.category}
                  </span>
                </td>
                <td><span className={`badge ${faq.isPublished ? 'badge-success' : 'badge-danger'}`}>{faq.isPublished ? 'Visible' : 'Draft'}</span></td>
                <td>{faq.order}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openModal(faq)}><Edit size={14} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(faq._id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2 className="modal-title">{editingFAQ ? 'Update FAQ' : 'Add New FAQ'}</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Question</label>
                <input className="form-input" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} placeholder="e.g. How to track my order?" />
              </div>
              <div className="form-group">
                <label className="form-label">Answer (Markdown/HTML supported)</label>
                <textarea className="form-textarea" value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} rows={5} placeholder="You can track your order using the link sent via email..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="general">General</option>
                    <option value="orders">Orders</option>
                    <option value="payments">Payments</option>
                    <option value="shipping">Shipping</option>
                    <option value="returns">Returns</option>
                    <option value="products">Products</option>
                    <option value="account">Account</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input type="number" className="form-input" value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label className="toggle">
                  <input type="checkbox" checked={formData.isPublished} onChange={e => setFormData({...formData, isPublished: e.target.checked})} />
                  <span className="toggle-slider" />
                </label>
                <span className="form-label" style={{ marginBottom: 0 }}>Show on public website</span>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={upsertMutation.isPending} onClick={() => upsertMutation.mutate(formData)}>
                <Save size={16} /> {upsertMutation.isPending ? 'Saving...' : 'Save FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
