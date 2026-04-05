import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Search, Users as UsersIcon, Eye, ToggleLeft, ToggleRight,
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatDateTime, timeAgo, extractError, getInitials } from '../lib/utils'

const fetchUsers = async ({ queryKey }) => {
  const [, page, search, role, isActive] = queryKey
  const params = new URLSearchParams({ page, limit: 15 })
  if (search) params.set('search', search)
  if (role && role !== 'all') params.set('role', role)
  if (isActive && isActive !== 'all') params.set('isActive', isActive)
  const { data } = await api.get(`/admin/users?${params}`)
  return { users: data.data || [], pagination: data.pagination || {} }
}

export default function Users() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')

  const { data, isLoading } = useQuery({ queryKey: ['users', page, search, roleFilter, activeFilter], queryFn: fetchUsers })
  const users = data?.users || []
  const pagination = data?.pagination || {}

  const toggleStatus = useMutation({
    mutationFn: (id) => api.patch(`/admin/users/${id}/toggle-status`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User status updated!') },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage all registered users — view orders & wishlists</p>
        </div>
        <span className="badge badge-brand">{pagination.total || 0} total users</span>
      </div>

      <div className="filters-bar">
        <div className="search-bar">
          <Search size={16} />
          <input className="form-input" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="form-select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }} style={{ width: 140 }}>
          <option value="all">All Roles</option>
          <option value="client">Client</option>
          <option value="admin">Admin</option>
        </select>
        <select className="form-select" value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }} style={{ width: 140 }}>
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><UsersIcon size={40} /><h3>No users found</h3></div></td></tr>
              ) : users.map((user) => (
                <tr key={user._id} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {getInitials(user.name)}
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td style={{ fontSize: 12 }}>{user.phone || '—'}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-brand' : 'badge-default'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.isEmailVerified ? 'badge-success' : 'badge-warning'}`}>
                      {user.isEmailVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(user.createdAt)}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.lastLogin ? timeAgo(user.lastLogin) : '—'}</td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => navigate(`/users/${user._id}`)}
                        title="View Full Profile"
                        style={{ color: 'var(--brand)' }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => {
                          if (confirm(`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}?`))
                            toggleStatus.mutate(user._id)
                        }}
                        style={{ color: user.isActive ? 'var(--danger)' : 'var(--success)' }}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
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
          <span className="pagination-info">Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)</span>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            <button className="pagination-btn" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

    </div>
  )
}
