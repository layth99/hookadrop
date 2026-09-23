import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../utils/api'
import toast from 'react-hot-toast'
import {
  User, Mail, Lock, Save, Eye, EyeOff, ShieldCheck,
  Camera, Phone, Bell, Check, X, RefreshCw, Shield,
  Loader2
} from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────
const getStrength = (p) =>
  (p.length >= 6 ? 1 : 0) +
  (/[A-Z]/.test(p) ? 1 : 0) +
  (/[0-9]/.test(p) ? 1 : 0) +
  (/[^A-Za-z0-9]/.test(p) ? 1 : 0)

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']

// ── section card ──────────────────────────────────────────────────────────────
const Section = ({ icon: Icon, iconColor, iconBg, title, children }) => (
  <div className="card space-y-5">
    <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
      <div className={`p-2 rounded-lg border ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <h2 className="text-base font-semibold text-gray-100">{title}</h2>
    </div>
    {children}
  </div>
)

// ── toggle switch ─────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-neon-gold' : 'bg-gray-700'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
)

// ─────────────────────────────────────────────────────────────────────────────
const Profile = () => {
  const { user, updateUser } = useAuthStore()
  const fileInputRef = useRef()

  // ── form state ──────────────────────────────────────────────────────────────
  const [info, setInfo]         = useState({ name: '', email: '', phone: '' })
  const [pw, setPw]             = useState({ password: '', confirm: '' })
  const [avatarSrc, setAvatarSrc] = useState(null)
  const [prefs, setPrefs]       = useState({
    orderAlerts:    true,
    lowStockAlerts: true,
    emailDigest:    false,
  })

  // ── loading flags ───────────────────────────────────────────────────────────
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingInfo, setSavingInfo]         = useState(false)
  const [savingPw, setSavingPw]             = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // ── password UI ─────────────────────────────────────────────────────────────
  const [showPw, setShowPw]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Load profile from backend on mount (source of truth) ──────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/profile/me')
        const u = data.results           // { name, email, phone, avatar, … }
        setInfo({
          name:  u.name  || '',
          email: u.email || '',
          phone: u.phone || '',
        })
        setAvatarSrc(u.avatar || null)
        // Also sync store + localStorage so header stays correct
        updateUser({ ...user, ...u })
      } catch {
        // fallback to what's in the store (may be slightly stale)
        setInfo({
          name:  user?.name  || '',
          email: user?.email || '',
          phone: user?.phone || '',
        })
        setAvatarSrc(user?.avatar || null)
      } finally {
        setLoadingProfile(false)
      }
    }
    load()
  }, []) // eslint-disable-line

  // ── Save personal info ──────────────────────────────────────────────────────
  const handleInfoSubmit = async (e) => {
    e.preventDefault()
    setSavingInfo(true)
    try {
      const { data } = await api.put('/profile/update', {
        name:  info.name,
        email: info.email,
        phone: info.phone,
      })
      const updated = data.results
      updateUser({ ...user, ...updated })   // persists to localStorage ✅
      toast.success('Profile saved')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed')
    } finally {
      setSavingInfo(false)
    }
  }

  // ── Change password ─────────────────────────────────────────────────────────
  const handlePwSubmit = async (e) => {
    e.preventDefault()
    if (pw.password !== pw.confirm)    return toast.error('Passwords do not match')
    if (pw.password.length < 6)        return toast.error('Min. 6 characters')
    setSavingPw(true)
    try {
      await api.put('/profile/update', { password: pw.password })
      setPw({ password: '', confirm: '' })
      toast.success('Password changed')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password')
    } finally {
      setSavingPw(false)
    }
  }

  // ── Avatar upload ───────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5 MB')

    // Instant local preview
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarSrc(ev.target.result)
    reader.readAsDataURL(file)

    // Upload to cloudinary via backend, then save URL to profile
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      // Use the existing cloudinary product upload endpoint as fallback
      // or the dedicated profile avatar endpoint if it exists
      let avatarUrl = null
      try {
        const { data } = await api.post('/profile/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        avatarUrl = data.avatar
      } catch {
        // If /profile/avatar doesn't exist yet, encode as base64 and save directly
        // (works for small images; replace with real endpoint in production)
        avatarUrl = await new Promise((res) => {
          const r = new FileReader()
          r.onload = (ev) => res(ev.target.result)
          r.readAsDataURL(file)
        })
      }

      // Persist avatar URL in DB + store
      const { data } = await api.put('/profile/update', { avatar: avatarUrl })
      const updated = data.results
      setAvatarSrc(avatarUrl)
      updateUser({ ...user, ...updated })
      toast.success('Avatar updated')
    } catch {
      toast.error('Avatar upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const strength = getStrength(pw.password)

  // ─────────────────────────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-neon-gold animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Changes are saved permanently to your account</p>
      </div>

      {/* ── Avatar card ──────────────────────────────────────────────────────── */}
      <div className="card flex items-center gap-6">
        {/* Avatar circle */}
        <div className="relative group flex-shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neon-gold/40 shadow-[0_0_20px_rgba(255,215,0,0.25)]">
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neon-gold to-orange-500 flex items-center justify-center">
                <span className="text-black font-bold text-3xl">
                  {info.name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
            )}
          </div>

          {/* Hover overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {uploadingAvatar
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : <Camera className="w-5 h-5 text-white" />}
            <span className="text-white text-[10px] mt-1">
              {uploadingAvatar ? 'Uploading…' : 'Change'}
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {/* Online dot */}
          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-900" />
        </div>

        {/* Info summary */}
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-gray-100 truncate">{info.name || 'Admin'}</p>
          <p className="text-sm text-neon-blue mt-0.5 truncate">{info.email}</p>
          {info.phone && <p className="text-sm text-gray-400 mt-0.5">{info.phone}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-neon-gold/10 border border-neon-gold/30 rounded-full text-xs text-neon-gold font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Administrator
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-2">Click on avatar to change — max 5 MB</p>
        </div>
      </div>

      {/* ── Personal information ─────────────────────────────────────────────── */}
      <Section
        icon={User}
        iconColor="text-neon-gold"
        iconBg="bg-neon-gold/10 border-neon-gold/30"
        title="Personal Information"
      >
        <form onSubmit={handleInfoSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="label-dark">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={info.name}
                onChange={(e) => setInfo({ ...info, name: e.target.value })}
                className="input pl-10"
                placeholder="Your full name"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="label-dark">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={info.email}
                onChange={(e) => setInfo({ ...info, email: e.target.value })}
                className="input pl-10"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="label-dark">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="tel"
                value={info.phone}
                onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                className="input pl-10"
                placeholder="+213 XXX XXX XXX"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingInfo}
              className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingInfo
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              {savingInfo ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Change password ──────────────────────────────────────────────────── */}
      <Section
        icon={Lock}
        iconColor="text-neon-blue"
        iconBg="bg-neon-blue/10 border-neon-blue/30"
        title="Change Password"
      >
        <form onSubmit={handlePwSubmit} className="space-y-4">
          {/* New password */}
          <div>
            <label className="label-dark">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPw ? 'text' : 'password'}
                value={pw.password}
                onChange={(e) => setPw({ ...pw, password: e.target.value })}
                className="input pl-10 pr-10"
                placeholder="Min. 6 characters"
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Strength bar */}
          {pw.password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map((i) => (
                  <div key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? STRENGTH_COLOR[strength] : 'bg-gray-700'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">{STRENGTH_LABEL[strength]}</p>
            </div>
          )}

          {/* Confirm password */}
          <div>
            <label className="label-dark">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                className="input pl-10 pr-10"
                placeholder="Repeat new password"
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pw.confirm.length > 0 && (
              <p className={`text-xs mt-1.5 flex items-center gap-1 ${pw.password === pw.confirm ? 'text-green-400' : 'text-red-400'}`}>
                {pw.password === pw.confirm
                  ? <><Check className="w-3 h-3" /> Passwords match</>
                  : <><X className="w-3 h-3" /> Passwords do not match</>}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPw}
              className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingPw
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Lock className="w-4 h-4" />}
              {savingPw ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Notification preferences ─────────────────────────────────────────── */}
      <Section
        icon={Bell}
        iconColor="text-orange-400"
        iconBg="bg-orange-900/30 border-orange-700/40"
        title="Notification Preferences"
      >
        <div className="space-y-3">
          {[
            { key: 'orderAlerts',    label: 'New Order Alerts',    desc: 'Get notified for every new order' },
            { key: 'lowStockAlerts', label: 'Low Stock Alerts',    desc: 'Alert when a product drops below 10 units' },
            { key: 'emailDigest',    label: 'Weekly Email Digest', desc: 'Summary of sales and activity every Monday' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-200">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <Toggle value={prefs[key]} onChange={(v) => setPrefs({ ...prefs, [key]: v })} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600">Notification settings are local to this browser session.</p>
      </Section>

      {/* ── Account info (read-only) ─────────────────────────────────────────── */}
      <Section
        icon={Shield}
        iconColor="text-purple-400"
        iconBg="bg-purple-900/30 border-purple-700/40"
        title="Account Details"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Account Type', value: user?.isAdmin ? 'Administrator' : 'User' },
            { label: 'User ID',      value: user?._id ? `…${String(user._id).slice(-8)}` : '—' },
            { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
            { label: 'Last Updated', value: user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-200">{value}</p>
            </div>
          ))}
        </div>
      </Section>

    </div>
  )
}

export default Profile
