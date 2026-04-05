import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  Search, Star, ToggleLeft, ToggleRight, MessageSquare, Trash2,
  ChevronLeft, ChevronRight, Filter, BadgeCheck, RefreshCw,
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatDateTime, buildImageUrl, extractError } from '../lib/utils'

const LIMIT = 15

const StarRating = ({ rating, size = 13 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={size}
        fill={s <= rating ? '#f59e0b' : 'none'}
        color={s <= rating ? '#f59e0b' : 'var(--text-muted)'}
      />
    ))}
  </div>
)

const fetchAllReviews = async ({ page, status, rating, search }) => {
  const params = new URLSearchParams({ page, limit: LIMIT })
  if (status) params.set('status', status)
  if (rating) params.set('rating', rating)
  if (search) params.set('search', search)
  const { data } = await api.get(`/reviews/admin/all?${params}`)
  return data
}

const fetchAnalytics = async () => {
  try {
    const { data } = await api.get('/analytics/reviews')
    return data.data || {}
  } catch {
    return {}
  }
}

export default function Reviews() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [search, setSearch] = useState('')
  const [replyModal, setReplyModal] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const queryKey = ['admin-reviews', page, status, ratingFilter, search]

  const { data: reviewsData, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchAllReviews({ page, status, rating: ratingFilter, search }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['reviews-analytics'],
    queryFn: fetchAnalytics,
    staleTime: 60_000,
  })

  const reviews = reviewsData?.data || []
  const pagination = reviewsData?.pagination || {}
  const totalPages = pagination.totalPages || 1
  const stats = analyticsData || {}

  const ratingBreakdown = Array.isArray(stats.ratingBreakdown) ? stats.ratingBreakdown : []
  const fiveStar = ratingBreakdown.find(r => r._id === 5)?.count || 0
  const oneTwoStar = (ratingBreakdown.find(r => r._id === 1)?.count || 0) +
    (ratingBreakdown.find(r => r._id === 2)?.count || 0)

  const toggleReview = useMutation({
    mutationFn: (id) => api.patch(`/reviews/${id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] })
      qc.invalidateQueries({ queryKey: ['reviews-analytics'] })
      toast.success('Review visibility updated!')
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteReview = useMutation({
    mutationFn: (id) => api.delete(`/reviews/admin/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] })
      qc.invalidateQueries({ queryKey: ['reviews-analytics'] })
      setDeleteConfirm(null)
      toast.success('Review deleted!')
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return
    setSaving(true)
    try {
      await api.post(`/reviews/${replyModal._id}/reply`, { reply: replyText })
      toast.success('Reply posted!')
      qc.invalidateQueries({ queryKey: ['admin-reviews'] })
      setReplyModal(null)
      setReplyText('')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleStatusChange = (val) => {
    setStatus(val)
    setPage(1)
  }

  const handleRatingChange = (val) => {
    setRatingFilter(val)
    setPage(1)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Reviews & Ratings</h1>
          <p className="page-subtitle">Monitor and moderate customer reviews</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => qc.invalidateQueries({ queryKey: ['admin-reviews'] })}
            title="Refresh"
          >
            <RefreshCw size={14} style={isFetching ? { animation: 'spin 0.8s linear infinite' } : {}} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Reviews', value: stats.totalReviews ?? '—', color: 'var(--brand-primary)' },
          { label: 'Pending Approval', value: stats.pendingApproval ?? 0, color: '#f59e0b' },
          { label: '5 Star', value: fiveStar, color: 'var(--success)' },
          { label: '1-2 Star', value: oneTwoStar, color: 'var(--danger)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-bar" style={{ flex: '1 1 200px', maxWidth: 340 }}>
          <Search size={15} />
          <input
            className="form-input"
            placeholder="Search by customer or product…"
            value={search}
            onChange={handleSearchChange}
            style={{ paddingLeft: 38 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          {['', 'approved', 'hidden'].map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleStatusChange(s)}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Star size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
          {['', '5', '4', '3', '2', '1'].map((r) => (
            <button
              key={r}
              className={`btn btn-sm ${ratingFilter === r ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleRatingChange(r)}
              style={{ minWidth: r ? 34 : 40, padding: '4px 8px' }}
            >
              {r || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                    <div className="spinner" style={{ margin: 'auto' }} />
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <Star size={40} />
                      <h3>No reviews found</h3>
                      <p>Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : reviews.map((r) => (
                <tr key={r._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {r.user?.profilePhoto ? (
                        <img
                          src={buildImageUrl(r.user.profilePhoto)}
                          alt={r.user.name}
                          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--bg-hover)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: 'var(--brand-primary)',
                        }}>
                          {(r.user?.name || 'A')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {r.user?.name || 'Anonymous'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {r.product?.thumbnailImage && (
                        <img
                          src={buildImageUrl(r.product.thumbnailImage)}
                          alt={r.product.name}
                          style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                        />
                      )}
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {r.product?.name || '—'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <StarRating rating={r.rating} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                      {r.rating}/5
                    </span>
                  </td>
                  <td style={{ maxWidth: 240 }}>
                    {r.isVerifiedPurchase && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 10, color: 'var(--success)', marginBottom: 4,
                      }}>
                        <BadgeCheck size={11} /> Verified purchase
                      </div>
                    )}
                    {r.title && (
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {r.title}
                      </div>
                    )}
                    <div style={{
                      fontSize: 11, color: 'var(--text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220,
                    }}>
                      {r.body || '—'}
                    </div>
                    {r.adminReply && (
                      <div style={{ fontSize: 10, color: 'var(--brand-primary)', marginTop: 3 }}>
                        ✓ Replied
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatDateTime(r.createdAt)}
                  </td>
                  <td>
                    <span className={`badge ${r.isApproved ? 'badge-success' : 'badge-danger'}`}>
                      {r.isApproved ? 'Approved' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => { setReplyModal(r); setReplyText(r.adminReply || '') }}
                        title={r.adminReply ? 'Edit reply' : 'Reply'}
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => toggleReview.mutate(r._id)}
                        style={{ color: r.isApproved ? 'var(--warning)' : 'var(--success)' }}
                        title={r.isApproved ? 'Hide review' : 'Approve review'}
                        disabled={toggleReview.isPending}
                      >
                        {r.isApproved ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setDeleteConfirm(r)}
                        style={{ color: 'var(--danger)' }}
                        title="Delete review"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Page {pagination.page} of {totalPages} · {pagination.total} reviews
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setReplyModal(null) }}
        >
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">Reply to Review</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setReplyModal(null)}>✕</button>
            </div>

            {/* Original review context */}
            <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <StarRating rating={replyModal.rating} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {replyModal.user?.name}
                </span>
              </div>
              {replyModal.title && (
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {replyModal.title}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{replyModal.body}</div>
              {replyModal.product?.name && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Product: {replyModal.product.name}
                </div>
              )}
            </div>

            <form onSubmit={handleReply} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Your Reply</label>
                <textarea
                  className="form-textarea"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a helpful, professional reply..."
                  rows={4}
                  required
                />
              </div>
              <div className="modal-footer" style={{ margin: 0, padding: 0, border: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setReplyModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    : (replyModal.adminReply ? 'Update Reply' : 'Post Reply')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null) }}
        >
          <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>Delete Review?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: 14 }}>
              This will permanently delete the review by{' '}
              <strong>{deleteConfirm.user?.name || 'Anonymous'}</strong>.
            </p>
            <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 24 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => deleteReview.mutate(deleteConfirm._id)}
                disabled={deleteReview.isPending}
              >
                {deleteReview.isPending
                  ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  : 'Delete Review'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
