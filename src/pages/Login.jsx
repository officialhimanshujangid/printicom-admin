import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import { extractError } from '../lib/utils'
import PrinticomLogo from '../components/PrinticomLogo'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      const user = data.data?.user || data.user
      const token = data.data?.accessToken || data.data?.token || data.accessToken || data.token

      if (user?.role !== 'admin') {
        toast.error('Access denied. Admin accounts only.')
        setLoading(false)
        return
      }

      login(user, token)
      toast.success(`Welcome back, ${user.name}!`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: '20px',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px 36px',
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideUp 0.3s ease',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <PrinticomLogo size={72} showText={false} />
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, marginBottom: 4,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>
            Printicom
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Admin Panel — Secure Access</p>
        </div>

        {/* Security badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 8, padding: '8px 14px', marginBottom: 24,
        }}>
          <Shield size={14} color="var(--brand-primary)" />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Secured with JWT authentication
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@printicom.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: 4 }}>
            {loading ? (
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            ) : (
              <>
                <LogIn size={17} />
                Sign In to Admin
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          Only admin accounts can access this panel
        </p>
      </div>
    </div>
  )
}
