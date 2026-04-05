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
        <button className="btn btn-ghost btn-icon mobile-menu-btn" onClick={onMobileToggle}>
          <Menu size={20} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">
        <button
          className="btn btn-ghost btn-icon responsive-hide"
          onClick={handleRefresh}
          title="Refresh all data"
        >
          <RefreshCw size={18} />
        </button>

        <div className="responsive-hide" style={{ position: 'relative' }}>
          <button className="btn btn-ghost btn-icon">
            <Bell size={20} />
          </button>
        </div>

        <div className="topbar-user">
          <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: 13 }}>
            {getInitials(user?.name)}
          </div>
          <div className="user-details responsive-hide">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}
