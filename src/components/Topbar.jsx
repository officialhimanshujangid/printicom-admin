import { useState } from 'react'
import { Bell, Search, Menu, RefreshCw } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { getInitials } from '../lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export default function Topbar({ title, onMobileToggle }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries()
    toast.success('Data refreshed!')
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn btn-ghost btn-icon" onClick={onMobileToggle}>
          <Menu size={20} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">
        <button
          className="btn btn-ghost btn-icon"
          onClick={handleRefresh}
          title="Refresh all data"
        >
          <RefreshCw size={18} />
        </button>

        <div style={{ position: 'relative' }}>
          <button className="btn btn-ghost btn-icon">
            <Bell size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12, borderLeft: '1px solid var(--border-light)' }}>
          <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: 13 }}>
            {getInitials(user?.name)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}
