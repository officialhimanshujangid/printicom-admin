import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Save, Info, Shield, Scale, Truck, RotateCcw } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { extractError } from '../lib/utils'

const fetchPages = async () => {
  const { data } = await api.get('/legal/admin/list')
  return data.data?.pages || []
}

export default function LegalPages() {
  const qc = useQueryClient()
  const [selectedSlug, setSelectedSlug] = useState('privacy-policy')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [isPublished, setIsPublished] = useState(true)

  const { data: pages = [], isLoading } = useQuery({ 
    queryKey: ['legalPages'], 
    queryFn: fetchPages 
  })

  const { data: pageDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['legalPage', selectedSlug],
    queryFn: async () => {
      const { data } = await api.get(`/legal/admin/${selectedSlug}`)
      const p = data.data?.page
      setTitle(p?.title || '')
      setContent(p?.content || '')
      setIsPublished(p?.isPublished !== false)
      return p
    },
    enabled: !!selectedSlug
  })

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      await api.put(`/legal/admin/${selectedSlug}`, payload)
    },
    onSuccess: () => {
      toast.success('Legal page updated!')
      qc.invalidateQueries({ queryKey: ['legalPages'] })
      qc.invalidateQueries({ queryKey: ['legalPage', selectedSlug] })
    },
    onError: (err) => toast.error(extractError(err))
  })

  const handleSave = () => {
    updateMutation.mutate({ title, content, isPublished })
  }

  const PAGE_ICONS = {
    'privacy-policy': <Shield size={18} />,
    'terms-and-conditions': <Scale size={18} />,
    'refund-policy': <RotateCcw size={18} />,
    'shipping-policy': <Truck size={18} />,
    'about-us': <Info size={18} />,
  }

  if (isLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Legal & Content Pages</h1>
          <p className="page-subtitle">Manage Privacy Policy, Terms, and other static content</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <div className="card" style={{ width: 280, flexShrink: 0, padding: 12 }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, paddingLeft: 8 }}>Available Pages</h3>
          {pages.map(page => (
            <button
              key={page.slug}
              className={`nav-item ${selectedSlug === page.slug ? 'active' : ''}`}
              onClick={() => setSelectedSlug(page.slug)}
              style={{ width: '100%', borderLeft: 'none', borderRadius: 8, marginBottom: 4 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {PAGE_ICONS[page.slug] || <FileText size={18} />}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>{page.title}</div>
                  <div style={{ fontSize: 10, color: page.isPublished ? 'var(--success)' : 'var(--danger)' }}>
                    {page.isPublished ? '● Published' : '○ Draft'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Editor Area */}
        <div className="card" style={{ flex: 1, minHeight: 600, display: 'flex', flexDirection: 'column' }}>
          {isDetailLoading ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Page Title</label>
                  <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
                  <label className="toggle">
                    <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                  <span className="form-label" style={{ marginBottom: 0 }}>Visible to clients</span>
                </div>
              </div>

              <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">Page Content (HTML/Rich Text)</label>
                <textarea 
                  className="form-textarea" 
                  style={{ flex: 1, minHeight: 450, fontFamily: 'monospace', fontSize: 13 }}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="<h1>Your Title</h1><p>Start writing content...</p>"
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  💡 Tip: You can use HTML tags like &lt;h1&gt;, &lt;p&gt;, &lt;b&gt;, &lt;ul&gt; for formatting.
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  disabled={updateMutation.isPending}
                  onClick={handleSave}
                >
                  <Save size={16} /> {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
