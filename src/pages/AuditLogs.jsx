import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Search } from 'lucide-react'
import api from '../lib/api'
import { timeAgo } from '../lib/utils'

const fetchAuditLogs = async () => {
  const { data } = await api.get('/audit-logs')
  return data.data || []
}

export default function AuditLogs() {
  const [search, setSearch] = useState('')

  const { data: logs = [], isLoading } = useQuery({ 
    queryKey: ['auditLogs'], 
    queryFn: fetchAuditLogs 
  })

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.entityType.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Activity Logs</h1>
          <p className="page-subtitle">Security and accountability trail</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-bar">
          <Search size={16} />
          <input className="form-input" placeholder="Search actions, users or entities..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>User</th>
              <th>Details</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log._id}>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                <td><span className="badge badge-default">{log.action}</span></td>
                <td>
                   <div style={{ fontWeight: 600 }}>{log.user?.name || 'System'}</div>
                   <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.user?.email}</div>
                </td>
                <td>
                   <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{log.details || log.entityType}</div>
                   <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.entityType} ID: {log.entityId}</div>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {log.ipAddress && log.ipAddress !== '::1' ? log.ipAddress.replace('::ffff:', '') : 'Localhost'}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>No logs found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
