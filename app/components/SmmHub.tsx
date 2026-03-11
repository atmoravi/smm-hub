'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock, Calendar, BarChart3, Plus, Trash2, TrendingUp, DollarSign,
  Settings, User, Globe, Zap, Layers, History, PieChart,
  Users, Key, Eye, EyeOff, Copy, Check, Shield, LogOut,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, ChevronDown,
  Activity, Target, AlertCircle, Lock, FileText, ArchiveRestore
} from 'lucide-react'
import PostsTab from './PostsTab'

// ─── Constants ────────────────────────────────────────────────────────────────
// Version: 2026-03-07-fix-310
const TASK_CATEGORIES = [
  "Content Creation", "Engagement/Community Mgmt", "Strategy & Planning",
  "Analytics & Reporting", "Ad Management", "Client Meetings", "Admin/Misc"
]

const ADMIN_PIN = "1234"

const generateKey = () => 'sk-smm-' + Array.from({length: 32}, () => Math.random().toString(36)[2]).join('')
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

const INITIAL_ENDPOINTS = {
  organicLeads: { url: '/api/v1/leads/organic', key: generateKey(), label: 'Organic Leads', color: '#10b981' },
  paidLeads:    { url: '/api/v1/leads/paid',    key: generateKey(), label: 'Paid Leads',    color: '#3b82f6' },
  purchases:    { url: '/api/v1/purchases',      key: generateKey(), label: 'Purchases',     color: '#f59e0b' },
}

// ─── Mini Chart (SVG sparkline / area chart) ──────────────────────────────────
const AreaChart = ({ data, color, fill }: { data: any[], color: string, fill?: string }) => {
  if (!data || data.length < 2) return <div className="h-full flex items-center justify-center text-xs" style={{color: '#94a3b8'}}>No data yet</div>
  const max = Math.max(...data.map(d => d.value), 1)
  const w = 300, h = 80, pad = 4
  const points = data.map((d, i) => [pad + (i / (data.length - 1)) * (w - pad * 2), h - pad - (d.value / max) * (h - pad * 2)])
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${path} L${points[points.length-1][0].toFixed(1)},${h} L${points[0][0].toFixed(1)},${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace('#','')})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} stroke="white" strokeWidth="1.5"/>)}
    </svg>
  )
}

// ─── Dual Line Chart for organic vs paid ──────────────────────────────────────
const DualChart = ({ series, labels, height = 160 }: { series: any[], labels: string[], height?: number }) => {
  const allVals = series.flatMap(s => s.data)
  const max = Math.max(...allVals, 1)
  const w = 400, h = height, padX = 10, padY = 16
  const xs = labels.map((_, i) => padX + (i / Math.max(labels.length - 1, 1)) * (w - padX * 2))
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{height}} preserveAspectRatio="none">
      <defs>
        {series.map(s => (
          <linearGradient key={s.color} id={`dg-${s.color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={s.color} stopOpacity="0"/>
          </linearGradient>
        ))}
      </defs>
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={padX} x2={w-padX} y1={padY + t*(h-padY*2)} y2={padY + t*(h-padY*2)} stroke="#e2e8f0" strokeWidth="1"/>
      ))}
      {series.map(s => {
        const pts = s.data.map((v, i) => [xs[i], padY + (1 - v / max) * (h - padY * 2)])
        const path = pts.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
        const area = `${path} L${pts[pts.length-1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`
        return (
          <g key={s.color}>
            <path d={area} fill={`url(#dg-${s.color.replace('#','')})`}/>
            <path d={path} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={s.color} stroke="white" strokeWidth="1.5"/>)}
          </g>
        )
      })}
    </svg>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
const SmmHub = () => {
  // Auth
  const [authState, setAuthState] = useState('select') // 'select' | 'pin' | 'worker-select' | 'worker-login' | 'app'
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [currentRole, setCurrentRole] = useState(null) // 'admin' | worker id
  const [currentWorker, setCurrentWorker] = useState(null)
  const [workerLoginMode, setWorkerLoginMode] = useState<'select' | 'password'>('select')
  const [workersList, setWorkersList] = useState<any[]>([])
  const [workersLoading, setWorkersLoading] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // Core state
  const [activeTab, setActiveTab] = useState('dashboard')
  const [settingsSubTab, setSettingsSubTab] = useState<'api' | 'users' | 'general' | 'archive' | 'meta'>('api') // Settings sub-tabs
  const [contentSubTab, setContentSubTab] = useState<'actual' | 'archive'>('actual') // Content sub-tabs - MUST be here for hooks order
  const [trafficSubTab, setTrafficSubTab] = useState<'results' | 'campaigns'>('results')

  const [workers, setWorkers] = useState(() => {
    if (typeof window === 'undefined') return []
    const s = localStorage.getItem('smm-workers')
    return s ? JSON.parse(s) : []
  })

  const [logs, setLogs] = useState(() => { if (typeof window === 'undefined') return []; const s = localStorage.getItem('smm-logs2'); return s ? JSON.parse(s) : [] })
  const [trafficLogs, setTrafficLogs] = useState<any[]>([])
  const [salesLogs, setSalesLogs] = useState(() => { if (typeof window === 'undefined') return []; const s = localStorage.getItem('smm-sales2'); return s ? JSON.parse(s) : [] })
  const [endpoints, setEndpoints] = useState(() => { if (typeof window === 'undefined') return INITIAL_ENDPOINTS; const s = localStorage.getItem('smm-endpoints'); return s ? JSON.parse(s) : INITIAL_ENDPOINTS })
  const [settings, setSettings] = useState(() => { if (typeof window === 'undefined') return { targets: {} }; const s = localStorage.getItem('smm-settings2'); return s ? JSON.parse(s) : { targets: TASK_CATEGORIES.reduce((a,c)=>({...a,[c]:10}),{}) } })

  // Forms
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [minutes, setMinutes] = useState('')
  const [category, setCategory] = useState(TASK_CATEGORIES[0])
  const [note, setNote] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [trafficData, setTrafficData] = useState({ organicLeads: '', paidLeads: '', adSpend: '', campaignName: '' })

  // New worker form
  const [newWorker, setNewWorker] = useState({ name: '', rate: '25' })

  // Key visibility
  const [visibleKeys, setVisibleKeys] = useState({})
  const [copiedKey, setCopiedKey] = useState(null)
  const [apiKeys, setApiKeys] = useState<{source: string, key: string, createdAt: string, updatedAt: string}[]>()
  const [keysLoading, setKeysLoading] = useState(true)

  // Fetch API keys from database (admin only)
  useEffect(() => {
    if (authState !== 'app') return
    const fetchKeys = async () => {
      try {
        const res = await fetch('/api/settings/keys')
        const data = await res.json()
        setApiKeys(data.keys)
      } catch (err) {
        console.error('Failed to fetch API keys:', err)
      } finally {
        setKeysLoading(false)
      }
    }
    if (currentRole === 'admin') {
      fetchKeys()
    }
  }, [authState, currentRole])

  // Persist (only non-sensitive data)
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('smm-workers', JSON.stringify(workers))
    localStorage.setItem('smm-sales2', JSON.stringify(salesLogs))
    localStorage.setItem('smm-settings2', JSON.stringify(settings))
  }, [workers, salesLogs, settings])
  
  // Fetch effort logs when worker logs in
  useEffect(() => {
    if (currentWorker && authState === 'app') {
      fetchEffortLogs()
    }
  }, [currentWorker, authState])

  // Fetch traffic logs for both admin and workers
  useEffect(() => {
    if (authState === 'app') {
      fetch('/api/traffic')
        .then(res => res.json())
        .then(data => setTrafficLogs(data.data || []))
        .catch(err => console.error('[traffic] Failed to load:', err))
    }
  }, [authState])

  // Fetch workers list when admin logs in
  useEffect(() => {
    if (authState === 'app' && currentRole === 'admin') {
      setWorkersLoading(true)
      fetch('/api/auth/workers')
        .then(res => res.json())
        .then(data => {
          setWorkersList(data.workers || [])
          setWorkersLoading(false)
        })
        .catch((err) => {
          console.error('[admin-workers] Failed to load workers:', err)
          setWorkersLoading(false)
        })
    }
  }, [authState, currentRole])

  // ── Auth flow ────────────────────────────────────────────────────────────────
  const handleRoleSelect = (role) => {
    if (role === 'admin') { setCurrentRole('admin'); setAuthState('pin') }
    else {
      setCurrentRole('worker')
      // Fetch workers from database (admin users excluded - they must use PIN login)
      setWorkersLoading(true)
      fetch('/api/auth/workers')
        .then(res => res.json())
        .then(data => {
          setWorkersList(data.workers || [])
          setWorkersLoading(false)
          setAuthState('worker-select')
        })
        .catch((err) => {
          console.error('[worker-select] Failed to load workers:', err)
          setWorkersLoading(false)
          setAuthState('worker-select')
        })
    }
  }

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) { setPinError(false); setAuthState('app') }
    else { setPinError(true); setPinInput('') }
  }

  const handleWorkerSelect = (worker) => {
    // Go directly to password entry with username pre-filled
    setLoginUsername(worker.username)
    setCurrentWorker(worker)
    setAuthState('worker-login')
  }

  const handleWorkerPasswordLogin = async () => {
    setLoginError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      })
      const data = await res.json()
      if (res.ok && data.data?.user) {
        const user = data.data.user
        // If user has admin role, switch to admin mode
        if (user.role === 'admin') {
          setCurrentRole('admin')
        }
        setCurrentWorker(user)
        setAuthState('app')
        setLoginPassword('')
        setLoginError('')
      } else {
        setLoginError(data.error?.message || 'Login failed')
      }
    } catch (err) {
      setLoginError('Login failed. Please try again.')
    }
  }

  const logout = () => {
    setAuthState('select')
    setCurrentRole(null)
    setCurrentWorker(null)
    setPinInput('')
    setActiveTab('dashboard')
    setWorkerLoginMode('select')
    setLoginUsername('')
    setLoginPassword('')
    setLoginError('')
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  const addLog = async () => {
    const mins = parseInt(minutes)
    if (!minutes || isNaN(mins) || mins <= 0) return
    if (!currentWorker) return
    
    try {
      const res = await fetch('/api/effort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentWorker.id,
          date: currentDate,
          minutes: mins,
          category,
          note: note.trim(),
          categoryRate: currentWorker.hourlyRate || 25,
        }),
      })
      
      if (res.ok) {
        setMinutes('')
        setNote('')
        // Refresh logs
        fetchEffortLogs()
      } else {
        alert('Failed to log effort')
      }
    } catch (err) {
      console.error('Failed to log effort:', err)
      alert('Failed to log effort')
    }
  }
  
  const fetchEffortLogs = async () => {
    if (!currentWorker) return
    try {
      const res = await fetch(`/api/effort?userId=${currentWorker.id}`)
      const data = await res.json()
      // Store in localStorage for offline viewing
      localStorage.setItem('smm-logs2', JSON.stringify(data.data?.logs || []))
      setLogs(data.data?.logs || [])
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }

  const addTrafficLog = async () => {
    try {
      await fetch('/api/traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: currentDate,
          campaignName: trafficData.campaignName,
          organicLeads: parseInt(trafficData.organicLeads) || 0,
          paidLeads: parseInt(trafficData.paidLeads) || 0,
          adSpend: parseFloat(trafficData.adSpend) || 0,
        }),
      })
      setTrafficData({ organicLeads: '', paidLeads: '', adSpend: '', campaignName: '' })
      const res = await fetch('/api/traffic')
      const data = await res.json()
      setTrafficLogs(data.data || [])
    } catch (err) {
      console.error('[traffic] Failed to save:', err)
    }
  }

  const addSalesLog = () => {
    const amt = parseFloat(incomeAmount)
    if (!incomeAmount || isNaN(amt)) return
    setSalesLogs(prev => [{ id: generateId(), date: currentDate, amount: amt }, ...prev])
    setIncomeAmount('')
  }

  const addWorker = () => {
    if (!newWorker.name.trim()) return
    const w = {
      id: generateId(), name: newWorker.name.trim(), role: 'worker', active: true,
      rates: TASK_CATEGORIES.reduce((a, c) => ({ ...a, [c]: parseFloat(newWorker.rate) || 25 }), {})
    }
    setWorkers(prev => [...prev, w])
    setNewWorker({ name: '', rate: '25' })
  }

  const toggleWorkerStatus = (id) => setWorkers(prev => prev.map(w => w.id === id ? { ...w, active: !w.active } : w))
  const removeWorker = (id) => setWorkers(prev => prev.filter(w => w.id !== id))
  const updateWorkerRate = (wid, cat, val) => setWorkers(prev => prev.map(w => w.id === wid ? { ...w, rates: { ...w.rates, [cat]: parseFloat(val) || 0 } } : w))

  const rotateKey = async (source) => {
    try {
      const res = await fetch('/api/settings/keys/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      const data = await res.json()
      if (data.success) {
        // Refresh keys
        const keysRes = await fetch('/api/settings/keys')
        const keysData = await keysRes.json()
        setApiKeys(keysData.keys)
        alert('Key rotated! Please update your external services.')
      }
    } catch (err) {
      console.error('Failed to rotate key:', err)
      alert('Failed to rotate key')
    }
  }

  const copyKey = (source) => {
    navigator.clipboard.writeText(endpoints[source].key)
    setCopiedKey(source)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const mLogs = logs.filter((l: any) => new Date(l.date) >= startOfMonth)
    const mTraffic = trafficLogs.filter(l => new Date(l.date) >= startOfMonth)
    const wTraffic = trafficLogs.filter(l => new Date(l.date) >= startOfWeek)
    const todayTraffic = trafficLogs.filter(l => new Date(l.date) >= today)
    const mSales = salesLogs.filter(l => new Date(l.date) >= startOfMonth)

    // Worker costs from effort logs
    const totalSalary = mLogs.reduce((acc, log) => {
      const rate = log.categoryRate || log.user?.hourlyRate || 25
      return acc + (log.minutes / 60) * rate
    }, 0)

    const totalAdSpend = mTraffic.reduce((a, c) => a + c.adSpend, 0)
    const totalIncome = mSales.reduce((a, c) => a + c.amount, 0)
    const totalCost = totalSalary + totalAdSpend
    const netProfit = totalIncome - totalCost

    const totalOrganic = mTraffic.reduce((a, c) => a + c.organicLeads, 0)
    const totalPaid = mTraffic.reduce((a, c) => a + c.paidLeads, 0)
    const catchupRatio = totalPaid > 0 ? (totalOrganic / totalPaid) * 100 : 0

    // LEADS monitoring: Today, This Week, This Month (Campaign), Overall
    const todayOrganic = todayTraffic.reduce((a, c) => a + c.organicLeads, 0)
    const todayPaid = todayTraffic.reduce((a, c) => a + c.paidLeads, 0)
    const todayAdSpend = todayTraffic.reduce((a, c) => a + c.adSpend, 0)
    
    const weekOrganic = wTraffic.reduce((a, c) => a + c.organicLeads, 0)
    const weekPaid = wTraffic.reduce((a, c) => a + c.paidLeads, 0)
    const weekAdSpend = wTraffic.reduce((a, c) => a + c.adSpend, 0)
    
    const overallOrganic = trafficLogs.reduce((a, c) => a + c.organicLeads, 0)
    const overallPaid = trafficLogs.reduce((a, c) => a + c.paidLeads, 0)
    const overallAdSpend = trafficLogs.reduce((a, c) => a + c.adSpend, 0)

    const smmLogs = mLogs.filter(l => ['Content Creation','Engagement/Community Mgmt','Strategy & Planning'].includes(l.category))
    const smmCost = smmLogs.reduce((acc, log) => {
      const rate = log.categoryRate || log.user?.hourlyRate || 25
      return acc + (log.minutes / 60) * rate
    }, 0)
    const costPerOrgLead = totalOrganic > 0 ? smmCost / totalOrganic : null

    const grossROI = totalAdSpend > 0 ? ((totalIncome - totalAdSpend) / totalAdSpend) * 100 : 0
    const netROI = totalCost > 0 ? ((totalIncome - totalCost) / totalCost) * 100 : 0

    // Monthly trend (last 6 months)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return { label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() }
    })

    const trendData = months.map(m => {
      const mT = trafficLogs.filter(l => { const d = new Date(l.date); return d.getFullYear() === m.year && d.getMonth() === m.month })
      return {
        label: m.label,
        organic: mT.reduce((a, c) => a + c.organicLeads, 0),
        paid: mT.reduce((a, c) => a + c.paidLeads, 0),
      }
    })

    // Per-worker this month - from database users (workersList)
    const perWorker = workersList.map(w => {
      const wLogs = mLogs.filter((l: any) => l.userId === w.id || l.user?.id === w.id)
      const mins = wLogs.reduce((a, l) => a + l.minutes, 0)
      const hourlyRate = typeof w.rates === 'string' ? JSON.parse(w.rates) : w.rates
      const cost = wLogs.reduce((acc, log) => {
        const rate = log.categoryRate || (typeof hourlyRate === 'object' ? Object.values(hourlyRate)[0] : hourlyRate) || 25
        return acc + (log.minutes / 60) * rate
      }, 0)
      return { ...w, monthMins: mins, monthCost: cost }
    })

    return {
      totalSalary, totalAdSpend, totalIncome, totalCost, netProfit,
      totalOrganic, totalPaid, catchupRatio, smmCost, costPerOrgLead,
      grossROI, netROI, trendData, perWorker,
      breakeven: totalCost,
      // LEADS monitoring
      todayOrganic, todayPaid, todayAdSpend,
      weekOrganic, weekPaid, weekAdSpend,
      overallOrganic, overallPaid, overallAdSpend,
    }
  }, [logs, trafficLogs, salesLogs, workersList])

  const formatTime = (mins) => `${Math.floor(mins/60)}h ${mins%60}m`
  const fmt = (n) => n?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? '—'
  const fmtDollar = (n) => n !== null && n !== undefined ? `$${Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—'

  // ── Auth screens ─────────────────────────────────────────────────────────────
  if (authState === 'select') return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px', width: '100%' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Activity size={28} color="white"/>
          </div>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: '0 0 6px' }}>SMM Hub</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Select your role to continue</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => handleRoleSelect('admin')} style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 14, padding: '18px 24px', color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            <Shield size={22}/> <span style={{flex:1,textAlign:'left'}}>Admin</span> <span style={{fontSize:12,opacity:0.7}}>PIN required →</span>
          </button>
          <button onClick={() => handleRoleSelect('worker')} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '18px 24px', color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            <User size={22}/> <span style={{flex:1,textAlign:'left'}}>Worker</span> <span style={{fontSize:12,opacity:0.7,color:'#64748b'}}>Select account →</span>
          </button>
        </div>
      </div>
    </div>
  )

  if (authState === 'pin') return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{ background: '#1e293b', borderRadius: 20, padding: 40, width: 360, border: '1px solid #334155' }}>
        <Lock size={32} color="#6366f1" style={{marginBottom: 16}}/>
        <h2 style={{ color: 'white', fontWeight: 900, fontSize: 22, margin: '0 0 6px' }}>Admin PIN</h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>Enter your 4-digit PIN to access the admin panel.</p>
        <input type="password" maxLength={4} value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError(false) }}
          onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
          placeholder="••••"
          style={{ width: '100%', background: '#0f172a', border: `1px solid ${pinError ? '#ef4444' : '#334155'}`, borderRadius: 10, padding: '14px 16px', color: 'white', fontSize: 22, textAlign: 'center', letterSpacing: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
        />
        {pinError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>Incorrect PIN. Try again.</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={() => setAuthState('select')} style={{ flex: 1, background: 'transparent', border: '1px solid #334155', borderRadius: 10, padding: '12px', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Back</button>
          <button onClick={handlePinSubmit} style={{ flex: 2, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 10, padding: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Unlock</button>
        </div>
      </div>
    </div>
  )

  if (authState === 'worker-select') return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{ background: '#1e293b', borderRadius: 20, padding: 40, width: 380, border: '1px solid #334155' }}>
        <Users size={32} color="#10b981" style={{marginBottom: 16}}/>
        <h2 style={{ color: 'white', fontWeight: 900, fontSize: 22, margin: '0 0 6px' }}>Worker Login</h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>Select your account</p>
        
        {workersLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Loading workers...</div>
        ) : workersList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workersList.map(w => (
              <button key={w.id} onClick={() => handleWorkerSelect(w)} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: '14px 18px', color: 'white', fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', transition: 'border-color 0.2s' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: w.avatarUrl ? 'none' : 'linear-gradient(135deg,#10b981,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, overflow: 'hidden' }}>
                  {w.avatarUrl ? <img src={w.avatarUrl} alt={w.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : w.name[0]}
                </div>
                {w.name}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
            <p>No workers found.</p>
            <p style={{fontSize:12,marginTop:8}}>Ask your admin to:</p>
            <p style={{fontSize:11,marginTop:4}}>1. Create a user account for you</p>
            <p style={{fontSize:11,marginTop:4}}>2. Set role to "User (Worker)"</p>
            <p style={{fontSize:11,marginTop:4}}>3. Make sure account is "Active"</p>
          </div>
        )}
        <button onClick={() => setAuthState('select')} style={{ marginTop: 20, width: '100%', background: 'transparent', border: '1px solid #334155', borderRadius: 10, padding: '11px', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>← Back</button>
      </div>
    </div>
  )

  if (authState === 'worker-login') return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{ background: '#1e293b', borderRadius: 20, padding: 40, width: 380, border: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: currentWorker?.avatarUrl ? 'none' : 'linear-gradient(135deg,#10b981,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, color: 'white', overflow: 'hidden' }}>
            {currentWorker?.avatarUrl ? <img src={currentWorker.avatarUrl} alt={currentWorker.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : currentWorker?.name[0]}
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 2px' }}>Logging in as</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: 0 }}>{currentWorker?.name}</p>
          </div>
        </div>
        
        <input 
          type="password" 
          value={loginPassword} 
          onChange={e => { setLoginPassword(e.target.value); setLoginError('') }}
          onKeyDown={e => e.key === 'Enter' && handleWorkerPasswordLogin()}
          placeholder="Enter your password"
          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '14px 16px', color: 'white', fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
        />
        {loginError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 16 }}>{loginError}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setAuthState('select'); setLoginUsername(''); setLoginPassword(''); setCurrentWorker(null) }} style={{ flex: 1, background: 'transparent', border: '1px solid #334155', borderRadius: 10, padding: '12px', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Back</button>
          <button onClick={handleWorkerPasswordLogin} style={{ flex: 2, background: 'linear-gradient(135deg,#10b981,#3b82f6)', border: 'none', borderRadius: 10, padding: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Login</button>
        </div>
      </div>
    </div>
  )

  // ── Main App ─────────────────────────────────────────────────────────────────
  const isAdmin = currentRole === 'admin'
  const TABS = isAdmin
    ? ['dashboard', 'content', 'traffic', 'settings', 'history']
    : ['effort', 'content', 'traffic', 'history']

  const tabLabels = { dashboard: 'Dashboard', content: 'Content', traffic: 'Traffic', workers: 'Workers', settings: 'Settings', history: 'History', effort: 'Log Effort' }
  const tabIcons = { dashboard: <BarChart3 size={14}/>, content: <FileText size={14}/>, traffic: <Globe size={14}/>, workers: <Users size={14}/>, settings: <Settings size={14}/>, history: <History size={14}/>, effort: <Layers size={14}/> }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", color: '#0f172a' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Top Nav */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 0, height: 60, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={18} color="white"/>
          </div>
          <span style={{ fontWeight: 900, fontSize: 17 }}>SMM Hub</span>
        </div>

        <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: activeTab === tab ? '#eff6ff' : 'transparent', color: activeTab === tab ? '#3b82f6' : '#64748b', fontWeight: activeTab === tab ? 700 : 500, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              {tabIcons[tab]} {tabLabels[tab]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isAdmin ? '#eff6ff' : '#f0fdf4', borderRadius: 8, padding: '6px 12px' }}>
            {isAdmin ? <Shield size={14} color="#6366f1"/> : <User size={14} color="#10b981"/>}
            <span style={{ fontSize: 13, fontWeight: 700, color: isAdmin ? '#6366f1' : '#10b981' }}>{isAdmin ? 'Admin' : currentWorker?.name}</span>
          </div>
          <button onClick={logout} title="Logout" style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
            <LogOut size={13}/> Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── DASHBOARD (admin) ── */}
        {activeTab === 'dashboard' && isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Monthly Income', value: fmtDollar(stats.totalIncome), color: '#10b981', sub: 'This month' },
                { label: 'Ad Spend', value: fmtDollar(stats.totalAdSpend), color: '#ef4444', sub: 'This month' },
                { label: 'Worker Salary', value: fmtDollar(stats.totalSalary), color: '#3b82f6', sub: 'Logged effort' },
                { label: 'Net Profit', value: `${stats.netProfit >= 0 ? '' : '-'}${fmtDollar(stats.netProfit)}`, color: stats.netProfit >= 0 ? '#10b981' : '#ef4444', sub: 'Income - all costs' },
              ].map(k => (
                <div key={k.label} style={{ background: 'white', borderRadius: 16, padding: '20px 22px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>{k.label}</p>
                  <p style={{ fontSize: 26, fontWeight: 900, color: k.color, margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>{k.value}</p>
                  <p style={{ fontSize: 11, color: '#cbd5e1', margin: 0 }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* LEADS Monitor Section */}
            <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontWeight: 900, fontSize: 16, margin: '0 0 4px' }}>LEADS Monitor</h3>
                  <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>Real-time tracking of organic and paid leads</p>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[{label:'Organic', color:'#10b981'},{label:'Paid', color:'#3b82f6'},{label:'Ad Spend', color:'#f59e0b'}].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }}/>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* LEADS cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {/* Today */}
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '18px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 12px' }}>Today</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Organic</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>{fmt(stats.todayOrganic)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Paid</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>{fmt(stats.todayPaid)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Ad Spend</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{fmtDollar(stats.todayAdSpend)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* This Week */}
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '18px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 12px' }}>This Week</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Organic</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>{fmt(stats.weekOrganic)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Paid</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>{fmt(stats.weekPaid)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Ad Spend</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{fmtDollar(stats.weekAdSpend)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* This Month (Campaign) */}
                <div style={{ background: '#eff6ff', borderRadius: 12, padding: '18px', border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 12px' }}>This Month</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Organic</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>{fmt(stats.totalOrganic)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Paid</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>{fmt(stats.totalPaid)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid #bfdbfe', marginTop: 4, paddingTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Ad Spend</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{fmtDollar(stats.totalAdSpend)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall */}
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '18px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 12px' }}>Overall</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Organic</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>{fmt(stats.overallOrganic)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Paid</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>{fmt(stats.overallPaid)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Ad Spend</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{fmtDollar(stats.overallAdSpend)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Organic vs Paid trend + catchup */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
              <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontWeight: 900, fontSize: 16, margin: '0 0 4px' }}>Organic vs. Paid Leads</h3>
                    <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>6-month trend — tracking SMM effort results</p>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[{label:'Organic', color:'#10b981'},{label:'Paid', color:'#3b82f6'}].map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }}/>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <DualChart
                  series={[
                    { color: '#10b981', data: stats.trendData.map(d => d.organic) },
                    { color: '#3b82f6', data: stats.trendData.map(d => d.paid) },
                  ]}
                  labels={stats.trendData.map(d => d.label)}
                  height={160}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  {stats.trendData.map(d => (
                    <span key={d.label} style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{d.label}</span>
                  ))}
                </div>
              </div>

              {/* Catchup panel */}
              <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontWeight: 900, fontSize: 16, margin: 0 }}>SMM Breakeven</h3>

                {/* Catchup ratio */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Organic Catchup</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: stats.catchupRatio >= 100 ? '#10b981' : '#f59e0b' }}>{stats.catchupRatio.toFixed(0)}%</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(stats.catchupRatio, 100)}%`, background: stats.catchupRatio >= 100 ? 'linear-gradient(90deg,#10b981,#6ee7b7)' : 'linear-gradient(90deg,#f59e0b,#fcd34d)', borderRadius: 99, transition: 'width 0.6s' }}/>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
                    {stats.totalOrganic} organic vs {stats.totalPaid} paid leads this month
                  </p>
                </div>

                {/* Cost per organic lead */}
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 6px' }}>SMM Cost / Organic Lead</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 3px' }}>
                    {stats.costPerOrgLead !== null ? fmtDollar(stats.costPerOrgLead) : '—'}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Content + Community + Strategy effort</p>
                </div>

                {/* Breakeven */}
                <div style={{ background: stats.netProfit >= 0 ? '#f0fdf4' : '#fff7ed', borderRadius: 12, padding: '14px 16px', borderLeft: `3px solid ${stats.netProfit >= 0 ? '#10b981' : '#f59e0b'}` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 6px' }}>Breakeven Status</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: stats.netProfit >= 0 ? '#10b981' : '#f59e0b', margin: '0 0 3px' }}>
                    {stats.netProfit >= 0 ? `✓ ${fmtDollar(stats.netProfit)} over` : `${fmtDollar(stats.netProfit)} to go`}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Need {fmtDollar(stats.breakeven)} to cover all costs</p>
                </div>

                {/* ROI */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{label:'Gross ROI', value: stats.grossROI, sub:'Excl. salary'},{label:'Net ROI', value: stats.netROI, sub:'All costs'}].map(r => (
                    <div key={r.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px' }}>{r.label}</p>
                      <p style={{ fontSize: 18, fontWeight: 900, color: r.value >= 0 ? '#10b981' : '#ef4444', margin: '0 0 2px' }}>{r.value.toFixed(1)}%</p>
                      <p style={{ fontSize: 10, color: '#cbd5e1', margin: 0 }}>{r.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Per-worker summary */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="#6366f1"/>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Worker Activity This Month</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Worker','Hours','Cost','Status'].map(h => <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {stats.perWorker.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>No workers found. Create user accounts in Settings → User Management.</td>
                    </tr>
                  ) : (
                    stats.perWorker.map(w => (
                      <tr key={w.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: w.avatarUrl ? 'none' : 'linear-gradient(135deg,#6366f1,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 14, overflow: 'hidden' }}>
                            {w.avatarUrl ? <img src={w.avatarUrl} alt={w.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : w.name[0]}
                          </div>
                          <span style={{ fontWeight: 700 }}>{w.name}</span>
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatTime(w.monthMins)}</td>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{fmtDollar(w.monthCost)}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ background: w.active ? '#f0fdf4' : '#fef2f2', color: w.active ? '#10b981' : '#ef4444', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{w.active ? 'Active' : 'Inactive'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Income logging */}
            <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0', maxWidth: 440 }}>
              <h3 style={{ fontWeight: 900, fontSize: 15, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={16} color="#10b981"/> Log Sales Revenue</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, flex: 1 }}/>
                <input type="number" placeholder="Amount $" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, flex: 1 }}/>
                <button onClick={addSalesLog} style={{ background: '#10b981', border: 'none', borderRadius: 10, padding: '10px 18px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Add</button>
              </div>
              <div style={{ marginTop: 12, maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {salesLogs.slice(0, 6).map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>{s.date}</span>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>+{fmtDollar(s.amount)}</span>
                    <button onClick={() => setSalesLogs(p => p.filter(x => x.id !== s.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '2px' }}><Trash2 size={12}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CONTENT (Posts Management) ── */}
        {activeTab === 'content' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Content sub-tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setContentSubTab('actual')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: contentSubTab === 'actual' ? 'none' : '1px solid #e2e8f0',
                  background: contentSubTab === 'actual' ? '#0f172a' : 'white',
                  color: contentSubTab === 'actual' ? 'white' : '#64748b',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <FileText size={14}/> Active Posts
              </button>
              <button
                onClick={() => setContentSubTab('archive')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: contentSubTab === 'archive' ? 'none' : '1px solid #e2e8f0',
                  background: contentSubTab === 'archive' ? '#0f172a' : 'white',
                  color: contentSubTab === 'archive' ? 'white' : '#64748b',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <ArchiveRestore size={14}/> Archive
              </button>
              {contentSubTab === 'archive' && (
                <button
                  onClick={() => setActiveTab('settings')}
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <Settings size={12}/> Archive Settings
                </button>
              )}
            </div>
            <PostsTab workers={workersList || []} isAdmin={isAdmin} archiveMode={contentSubTab} userId={currentWorker?.id} />
          </div>
        )}

        {/* ── EFFORT LOG (worker) ── */}
        {activeTab === 'effort' && !isAdmin && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontWeight: 900, fontSize: 16, color: '#3b82f6', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={18}/> Log Effort</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13 }}/>
                <input type="number" placeholder="Minutes" value={minutes} onChange={e => setMinutes(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13 }}/>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, background: 'white' }}>
                  {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <textarea placeholder="Notes..." value={note} onChange={e => setNote(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, height: 72, resize: 'none' }}/>
                <button onClick={addLog} style={{ background: '#3b82f6', border: 'none', borderRadius: 10, padding: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Add Log</button>
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, fontSize: 14 }}>My Logs</div>
              <div style={{ overflowY: 'auto', maxHeight: 500 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f8fafc' }}>
                    {['Date','Category','Duration','Note',''].map(h => <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={5} style={{padding:'40px 20px',textAlign:'center',color:'#94a3b8'}}>No logs yet. Start by logging your effort.</td></tr>
                    ) : (
                      logs.slice(0, 20).map((l: any) => (
                        <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '13px 18px', fontSize: 13 }}>{new Date(l.date).toLocaleDateString()}</td>
                          <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 600 }}>{l.category}</td>
                          <td style={{ padding: '13px 18px', fontSize: 13 }}>{l.minutes}m</td>
                          <td style={{ padding: '13px 18px', fontSize: 12, color: '#94a3b8' }}>{l.note || '—'}</td>
                          <td style={{ padding: '13px 18px' }}></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TRAFFIC ── */}
        {activeTab === 'traffic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Traffic sub-tabs */}
            <div style={{ display: 'flex', gap: 8 }}>
              {(['results', 'campaigns'] as const).map(tab => (
                <button key={tab} onClick={() => setTrafficSubTab(tab)} style={{ padding: '8px 20px', borderRadius: 8, border: trafficSubTab === tab ? 'none' : '1px solid #e2e8f0', background: trafficSubTab === tab ? '#0f172a' : 'white', color: trafficSubTab === tab ? 'white' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {tab === 'results' ? 'Results' : 'Campaigns'}
                </button>
              ))}
            </div>
          {trafficSubTab === 'results' && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontWeight: 900, fontSize: 16, color: '#10b981', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={18}/> Submit Traffic Data</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13 }}/>
                <input type="text" placeholder="Campaign name" value={trafficData.campaignName} onChange={e => setTrafficData({...trafficData, campaignName: e.target.value})} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13 }}/>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'organicLeads', label: 'Organic Leads', color: '#10b981' },
                    { key: 'paidLeads', label: 'Paid Leads', color: '#3b82f6' },
                    { key: 'adSpend', label: 'Ad Spend ($)', color: '#f59e0b' },
                  ].map(f => (
                    <div key={f.key} style={{ gridColumn: f.key === 'adSpend' ? 'span 2' : 'span 1' }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{f.label}</label>
                      <input type="number" value={trafficData[f.key]} onChange={e => setTrafficData({...trafficData, [f.key]: e.target.value})} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${f.color}40`, borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}/>
                    </div>
                  ))}
                </div>
                <button onClick={addTrafficLog} style={{ background: '#10b981', border: 'none', borderRadius: 10, padding: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Submit</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Trend */}
              <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 900, fontSize: 15, margin: 0 }}>Organic vs Paid — 6 months</h3>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[{l:'Organic',c:'#10b981'},{l:'Paid',c:'#3b82f6'}].map(s => (
                      <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.c }}/>
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{s.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <DualChart
                  series={[{color:'#10b981', data: stats.trendData.map(d=>d.organic)},{color:'#3b82f6', data: stats.trendData.map(d=>d.paid)}]}
                  labels={stats.trendData.map(d=>d.label)}
                  height={140}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  {stats.trendData.map(d => <span key={d.label} style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{d.label}</span>)}
                </div>
              </div>

              {/* Log table */}
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, fontSize: 13 }}>Campaign History</div>
                <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      {['Date','Campaign','Organic','Paid','Ad Spend',''].map(h => <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {trafficLogs.map(t => (
                        <tr key={t.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13 }}>{t.date}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{t.campaignName || '—'}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#10b981', fontWeight: 700 }}>{t.organicLeads}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#3b82f6', fontWeight: 700 }}>{t.paidLeads}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>{fmtDollar(t.adSpend)}</td>
                          <td style={{ padding: '12px 16px' }}><button onClick={() => setTrafficLogs(p=>p.filter(x=>x.id!==t.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={12}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          )}
          {trafficSubTab === 'campaigns' && <CampaignsTab />}
          </div>
        )}

        {/* ── WORKERS (admin only) ── */}
        {activeTab === 'workers' && isAdmin && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Users size={48} color="#94a3b8" style={{marginBottom: 16}}/>
            <h2 style={{ fontWeight: 900, fontSize: 20, margin: '0 0 8px' }}>Worker Management Moved</h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px' }}>
              Workers are now managed as Users with the "user" role.
            </p>
            <button
              onClick={() => { setActiveTab('settings'); setSettingsSubTab('users') }}
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 10, padding: '12px 24px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >
              Go to User Management →
            </button>
          </div>
        )}

        {/* ── SETTINGS (admin only) ── */}
        {activeTab === 'settings' && isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Settings Sub-tabs */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 0 }}>
              <button
                onClick={() => setSettingsSubTab('api')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  background: settingsSubTab === 'api' ? 'white' : 'transparent',
                  color: settingsSubTab === 'api' ? '#3b82f6' : '#64748b',
                  fontWeight: settingsSubTab === 'api' ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  borderBottom: settingsSubTab === 'api' ? '2px solid #3b82f6' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <Key size={16}/> API Endpoints
              </button>
              <button
                onClick={() => setSettingsSubTab('users')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  background: settingsSubTab === 'users' ? 'white' : 'transparent',
                  color: settingsSubTab === 'users' ? '#3b82f6' : '#64748b',
                  fontWeight: settingsSubTab === 'users' ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  borderBottom: settingsSubTab === 'users' ? '2px solid #3b82f6' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <Users size={16}/> User Management
              </button>
              <button
                onClick={() => setSettingsSubTab('general')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  background: settingsSubTab === 'general' ? 'white' : 'transparent',
                  color: settingsSubTab === 'general' ? '#3b82f6' : '#64748b',
                  fontWeight: settingsSubTab === 'general' ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  borderBottom: settingsSubTab === 'general' ? '2px solid #3b82f6' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <Settings size={16}/> General
              </button>
              <button
                onClick={() => setSettingsSubTab('archive')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  background: settingsSubTab === 'archive' ? 'white' : 'transparent',
                  color: settingsSubTab === 'archive' ? '#3b82f6' : '#64748b',
                  fontWeight: settingsSubTab === 'archive' ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  borderBottom: settingsSubTab === 'archive' ? '2px solid #3b82f6' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <ArchiveRestore size={16}/> Archive Settings
              </button>
              <button
                onClick={() => setSettingsSubTab('meta')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  background: settingsSubTab === 'meta' ? 'white' : 'transparent',
                  color: settingsSubTab === 'meta' ? '#3b82f6' : '#64748b',
                  fontWeight: settingsSubTab === 'meta' ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  borderBottom: settingsSubTab === 'meta' ? '2px solid #3b82f6' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <Globe size={16}/> Meta Ads
              </button>
            </div>

            {/* API Keys Tab */}
            {settingsSubTab === 'api' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h2 style={{ fontWeight: 900, fontSize: 20, margin: '0 0 6px' }}>API Endpoints & Keys</h2>
                  <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>Use these endpoints and API keys to pipe data from your traffic sources into SMM Hub. Each source has its own key.</p>
                </div>

                {keysLoading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading API keys...</div>
                ) : apiKeys?.length ? (
                  apiKeys.map(({ source, key, createdAt, updatedAt }) => {
                    const ep = {
                      organicLeads: { url: '/api/leads/organic', label: 'Organic Leads', color: '#10b981' },
                      paidLeads: { url: '/api/leads/paid', label: 'Paid Leads', color: '#3b82f6' },
                      purchases: { url: '/api/purchases', label: 'Purchases', color: '#f59e0b' },
                    }[source]
                    return (
                      <div key={source} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: ep.color, boxShadow: `0 0 0 3px ${ep.color}22` }}/>
                          <span style={{ fontWeight: 800, fontSize: 15 }}>{ep.label}</span>
                          <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#64748b', marginLeft: 'auto' }}>POST</span>
                        </div>
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {/* Endpoint URL */}
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Endpoint URL</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <code style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 13, fontFamily: "'DM Mono', monospace", color: '#334155' }}>
                                {typeof window !== 'undefined' ? window.location.origin : ''}{ep.url}
                              </code>
                              <button onClick={() => { navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}${ep.url}`) }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12 }}>
                                <Copy size={13}/> Copy
                              </button>
                            </div>
                          </div>

                          {/* API Key */}
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>API Key</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <code style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '11px 14px', fontSize: 13, fontFamily: "'DM Mono', monospace", color: '#7dd3fc', letterSpacing: 1 }}>
                                {visibleKeys[source] ? key : key.slice(0, 10) + '•'.repeat(24)}
                              </code>
                              <button onClick={() => setVisibleKeys(prev => ({...prev, [source]: !prev[source]}))} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                                {visibleKeys[source] ? <EyeOff size={14}/> : <Eye size={14}/>}
                              </button>
                              <button onClick={() => { navigator.clipboard.writeText(key); setCopiedKey(source); setTimeout(() => setCopiedKey(null), 2000) }} style={{ background: copiedKey === source ? '#f0fdf4' : '#f1f5f9', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', color: copiedKey === source ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12 }}>
                                {copiedKey === source ? <><Check size={13}/> Copied</> : <><Copy size={13}/> Copy</>}
                              </button>
                              <button onClick={() => rotateKey(source)} title="Rotate key" style={{ background: '#fff7ed', border: 'none', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
                                <RefreshCw size={14}/>
                              </button>
                            </div>
                            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Last updated: {new Date(updatedAt).toLocaleDateString()}</p>
                          </div>

                          {/* Example payload */}
                          <details style={{ marginTop: 4 }}>
                            <summary style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <ChevronDown size={13}/> Example payload
                            </summary>
                            <pre style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px', marginTop: 10, fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#94a3b8', overflowX: 'auto', lineHeight: 1.6 }}>
{source === 'organicLeads' ? `POST ${ep.url}
x-api-key: ${key.slice(0,20)}...

{
  "date": "2026-03-06",
  "count": 14,
  "campaign": "Q1 Content Push"
}` : source === 'paidLeads' ? `POST ${ep.url}
x-api-key: ${key.slice(0,20)}...

{
  "date": "2026-03-06",
  "count": 31,
  "adSpend": 240.00,
  "platform": "meta_ads",
  "campaign": "Spring Sale"
}` : `POST ${ep.url}
x-api-key: ${key.slice(0,20)}...

{
  "date": "2026-03-06",
  "amount": 1200.00,
  "source": "organic" | "paid",
  "orderId": "ORD-9182"
}`}
                            </pre>
                          </details>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No API keys found. Please run the seed script.</div>
                )}

                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <AlertCircle size={18} color="#f59e0b" style={{flexShrink:0, marginTop:1}}/>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 4px' }}>Keep your API keys secret</p>
                    <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>Keys give write access to your SMM Hub data. Rotate immediately if one is exposed.</p>
                  </div>
                </div>
              </div>
            )}

            {/* User Management Tab */}
            {settingsSubTab === 'users' && <UserManagement />}

            {/* General Settings Tab */}
            {settingsSubTab === 'general' && <GeneralSettings />}

            {/* Archive Settings Tab */}
            {settingsSubTab === 'archive' && <ArchiveSettings />}

            {/* Meta Ads Tab */}
            {settingsSubTab === 'meta' && <MetaAdsSettings />}
          </div>
        )}

        {/* ── HISTORY ── */}
        {activeTab === 'history' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Monthly effort */}
            <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 900, fontSize: 15, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={16} color="#3b82f6"/> Monthly Hours</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(() => {
                  const groups: Record<string, number> = {}
                  const logsToUse = isAdmin ? logs : logs.filter((l: any) => l.workerId === (currentWorker as any)?.id)
                  logsToUse.forEach((l: any) => {
                    const key = new Date(l.date).toLocaleString('default', { month: 'long', year: 'numeric' })
                    groups[key] = (groups[key] || 0) + l.minutes
                  })
                  return Object.entries(groups).map(([month, mins]) => (
                    <div key={month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{month}</span>
                      <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{formatTime(mins)}</span>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* Traffic monthly */}
            <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 900, fontSize: 15, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={16} color="#10b981"/> Monthly Traffic</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.trendData.map(d => (
                  <div key={d.label} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{d.label}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{d.organic + d.paid} total leads</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: d.organic || 1, background: '#d1fae5', borderRadius: 4, height: 6 }} title={`Organic: ${d.organic}`}/>
                      <div style={{ flex: d.paid || 1, background: '#bfdbfe', borderRadius: 4, height: 6 }} title={`Paid: ${d.paid}`}/>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>Organic: {d.organic}</span>
                      <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700 }}>Paid: {d.paid}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── User Management Component ────────────────────────────────────────────────
const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'user',
  })
  const [editUserModal, setEditUserModal] = useState<{open: boolean, user: any, rates: Record<string, number>}>({
    open: false,
    user: null,
    rates: {},
  })
  const [currencyModal, setCurrencyModal] = useState<{open: boolean, user: any, currency: string}>({
    open: false,
    user: null,
    currency: 'EUR',
  })
  const [editUserDetailsModal, setEditUserDetailsModal] = useState<{open: boolean, user: any, name: string, email: string, avatarUrl: string, newPassword: string}>({
    open: false,
    user: null,
    name: '',
    email: '',
    avatarUrl: '',
    newPassword: '',
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [siteSettings, setSiteSettings] = useState<{siteCurrency: string}>({siteCurrency: 'EUR'})
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data.data || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // Fetch site settings
    fetch('/api/settings/site')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setSiteSettings({ siteCurrency: data.settings.siteCurrency || 'EUR' })
        }
      })
      .catch(err => console.error('Failed to fetch site settings:', err))
  }, [])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB')
      return
    }

    try {
      // Compress image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        let width = img.width
        let height = img.height
        const maxSize = 800

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)

        // Compress to under 300KB
        let quality = 0.95
        const compress = () => {
          const base64 = canvas.toDataURL('image/jpeg', quality)
          const sizeKB = (base64.length * 3) / 4 / 1024

          if (sizeKB > 300 && quality > 0.1) {
            quality -= 0.1
            compress()
          } else {
            setAvatarPreview(base64)
            setAvatarFile(file)
            setError('')
          }
        }
        compress()
      }
      img.src = URL.createObjectURL(file)
    } catch (err) {
      setError('Failed to process image')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.message || 'Failed to save user')
        return
      }

      setSuccess('User created successfully')
      setFormData({ name: '', username: '', email: '', password: '', role: 'user' })
      setAvatarPreview(null)
      setAvatarFile(null)
      setShowForm(false)
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to save user')
    }
  }

  const handleEdit = (user: any) => {
    setEditUserModal({
      open: true,
      user,
      rates: typeof user.rates === 'string' ? JSON.parse(user.rates) : (user.rates || {}),
    })
  }
  
  const handleCurrencyEdit = (user: any) => {
    setCurrencyModal({
      open: true,
      user,
      currency: user.currency || 'EUR',
    })
  }
  
  const handleSaveUserRates = async () => {
    if (!editUserModal.user) return
    setError('')
    
    try {
      const res = await fetch(`/api/users/${editUserModal.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: editUserModal.rates }),
      })
      
      if (res.ok) {
        setSuccess('Rates updated')
        setEditUserModal({ open: false, user: null, rates: {} })
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error?.message || 'Failed to update')
      }
    } catch (err) {
      setError('Failed to update rates')
    }
  }
  
  const handleSaveUserCurrency = async () => {
    if (!currencyModal.user) return
    setError('')

    try {
      const res = await fetch(`/api/users/${currencyModal.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: currencyModal.currency }),
      })

      if (res.ok) {
        setSuccess('Currency updated')
        setCurrencyModal({ open: false, user: null, currency: 'EUR' })
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error?.message || 'Failed to update')
      }
    } catch (err) {
      setError('Failed to update currency')
    }
  }

  const handleEditUserDetails = (user: any) => {
    setEditUserDetailsModal({
      open: true,
      user,
      name: user.name || '',
      email: user.email || '',
      avatarUrl: user.avatarUrl || '',
      newPassword: '',
    })
    setShowNewPassword(false)
  }

  const handleSaveUserDetails = async () => {
    if (!editUserDetailsModal.user) return
    setError('')

    try {
      const res = await fetch(`/api/users/${editUserDetailsModal.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editUserDetailsModal.name,
          email: editUserDetailsModal.email,
          avatarUrl: avatarPreview || editUserDetailsModal.avatarUrl || null,
          ...(editUserDetailsModal.newPassword ? { password: editUserDetailsModal.newPassword } : {}),
        }),
      })

      if (res.ok) {
        setSuccess('User details updated')
        setEditUserDetailsModal({ open: false, user: null, name: '', email: '', avatarUrl: '', newPassword: '' })
        setAvatarPreview(null)
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error?.message || 'Failed to update')
      }
    } catch (err) {
      setError('Failed to update user details')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('User deleted successfully')
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to delete user')
      }
    } catch (err) {
      setError('Failed to delete user')
    }
  }

  const handleToggleActive = async (user: any) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch (err) {
      console.error('Failed to toggle active:', err)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading users...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 20, margin: '0 0 6px' }}>User Management</h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Manage user accounts, roles, and permissions</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormData({ name: '', username: '', email: '', password: '', role: 'user' }); setAvatarPreview(null) }}
          style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 10, padding: '12px 20px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18}/> Add User
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', color: '#16a34a', fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>Add New User</h3>
              <button onClick={() => { setShowForm(false); setAvatarPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                <Trash2 size={20}/>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Avatar Upload */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8 }}>Profile Picture</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: avatarPreview ? 'none' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    ) : (
                      <User size={32} color="#cbd5e1"/>
                    )}
                  </div>
                  <label style={{ background: '#f1f5f9', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    Upload Image
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }}/>
                  </label>
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Max 300KB (auto-compressed). JPG, PNG, WebP</p>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="johndoe"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="john@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: 'white', boxSizing: 'border-box' }}
                >
                  <option value="user">User (Worker)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => { setShowForm(false); setAvatarPreview(null) }} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '12px', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                <button type="submit" style={{ flex: 2, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['User', 'Username', 'Email', 'Role', 'Currency', 'Status', 'Created', ''].map(h => (
                <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No users yet. Click "Add User" to create one.</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: user.avatarUrl ? 'none' : 'linear-gradient(135deg,#6366f1,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                      ) : (
                        <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{user.name[0]}</span>
                      )}
                    </div>
                    <span style={{ fontWeight: 700 }}>{user.name}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>{user.username}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>{user.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ background: user.role === 'admin' ? '#eff6ff' : '#f1f5f9', color: user.role === 'admin' ? '#3b82f6' : '#64748b', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>{user.role}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600 }}>{user.currency || 'EUR'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <button onClick={() => handleToggleActive(user)} style={{ background: user.active ? '#f0fdf4' : '#fef2f2', color: user.active ? '#10b981' : '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {user.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: '#94a3b8' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleEditUserDetails(user)} style={{ background: '#faf5ff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#a855f7' }} title="Edit Details">
                        <User size={14}/>
                      </button>
                      <button onClick={() => handleCurrencyEdit(user)} style={{ background: '#f0fdf4', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#10b981' }} title="Currency">
                        <Globe size={14}/>
                      </button>
                      <button onClick={() => handleEdit(user)} style={{ background: '#eff6ff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#3b82f6' }} title="Set Rates">
                        <DollarSign size={14}/>
                      </button>
                      <button onClick={() => handleDelete(user.id, user.name)} style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#ef4444' }} title="Delete">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Rates Modal */}
      {editUserModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 4px' }}>Hourly Rates by Category</h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{editUserModal.user?.name}</p>
              </div>
              <button onClick={() => setEditUserModal({ open: false, user: null, rates: {} })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                <Trash2 size={20}/>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {['Content Creation', 'Engagement/Community Mgmt', 'Strategy & Planning', 'Analytics & Reporting', 'Ad Management', 'Client Meetings', 'Admin/Misc'].map(cat => (
                <div key={cat}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>{cat}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}>$</span>
                    <input
                      type="number"
                      value={editUserModal.rates[cat] || 25}
                      onChange={e => setEditUserModal({ ...editUserModal, rates: { ...editUserModal.rates, [cat]: parseFloat(e.target.value) || 0 } })}
                      style={{ width: '100%', padding: '8px 10px 8px 22px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setEditUserModal({ open: false, user: null, rates: {} })} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '12px', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button type="button" onClick={handleSaveUserRates} style={{ flex: 2, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Save Rates</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Currency Modal */}
      {currencyModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 4px' }}>Payment Currency</h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{currencyModal.user?.name}</p>
              </div>
              <button onClick={() => setCurrencyModal({ open: false, user: null, currency: 'EUR' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                <Trash2 size={20}/>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>Currency</label>
                <select
                  value={currencyModal.currency}
                  onChange={e => setCurrencyModal({ ...currencyModal, currency: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: 'white', boxSizing: 'border-box' }}
                >
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CHF">CHF - Swiss Franc</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Currency this user gets paid in</p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setCurrencyModal({ open: false, user: null, currency: 'EUR' })} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '12px', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                <button type="button" onClick={handleSaveUserCurrency} style={{ flex: 2, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Save Currency</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Details Modal */}
      {editUserDetailsModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>Edit User Details</h3>
              <button onClick={() => { setEditUserDetailsModal({ open: false, user: null, name: '', email: '', avatarUrl: '', newPassword: '' }); setAvatarPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                <Trash2 size={20}/>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Profile Picture */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8 }}>Profile Picture</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: avatarPreview || editUserDetailsModal.avatarUrl ? 'none' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {avatarPreview || editUserDetailsModal.avatarUrl ? (
                      <img src={avatarPreview || editUserDetailsModal.avatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    ) : (
                      <User size={32} color="#cbd5e1"/>
                    )}
                  </div>
                  <label style={{ background: '#f1f5f9', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    Upload Image
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }}/>
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>Full Name</label>
                <input
                  type="text"
                  value={editUserDetailsModal.name}
                  onChange={e => setEditUserDetailsModal({ ...editUserDetailsModal, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={editUserDetailsModal.email}
                  onChange={e => setEditUserDetailsModal({ ...editUserDetailsModal, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              {/* New Password */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>New Password <span style={{ fontWeight: 400, color: '#94a3b8' }}>(leave blank to keep current)</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={editUserDetailsModal.newPassword}
                    onChange={e => setEditUserDetailsModal({ ...editUserDetailsModal, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    style={{ width: '100%', padding: '10px 42px 10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    {showNewPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => { setEditUserDetailsModal({ open: false, user: null, name: '', email: '', avatarUrl: '', newPassword: '' }); setAvatarPreview(null) }} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '12px', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                <button type="button" onClick={handleSaveUserDetails} style={{ flex: 2, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── General Settings Component ────────────────────────────────────────────────
const GeneralSettings = () => {
  const [siteCurrency, setSiteCurrency] = useState('EUR')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/site')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.siteCurrency) {
          setSiteCurrency(data.settings.siteCurrency)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteCurrency }),
      })
      if (res.ok) alert('Site currency updated')
      else alert('Failed to update site currency')
    } catch (err) {
      alert('Failed to update site currency')
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontWeight: 900, fontSize: 20, margin: '0 0 6px' }}>General Settings</h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>Configure site-wide settings and preferences</p>
      </div>

      {/* Site Currency */}
      <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0', maxWidth: 500 }}>
        <h3 style={{ fontWeight: 900, fontSize: 16, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarSign size={18} color="#3b82f6"/> Site Currency
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
          This is the base currency for all calculations and reports in your SMM Hub.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            value={siteCurrency}
            onChange={e => setSiteCurrency(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: 'white' }}
          >
            <option value="EUR">EUR - Euro</option>
            <option value="USD">USD - US Dollar</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CHF">CHF - Swiss Franc</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
          </select>
          <button
            onClick={handleSave}
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '10px 24px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          >
            Save
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
          Note: Individual workers can have different payment currencies in their user settings.
        </p>
      </div>
    </div>
  )
}

// ─── Meta Ads Settings Component ───────────────────────────────────────────────
const MetaAdsSettings = () => {
  const [creds, setCreds] = useState({ metaToken: '', metaAdAccountId: '', metaApiVersion: 'v21.0' })
  const [showToken, setShowToken] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [credsSaving, setCredsSaving] = useState(false)
  const [credsMsg, setCredsMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ label: '', metaCampaignNames: '', adsetNames: '', active: true })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/site').then(r => r.json()).then(d => {
      const s = d.data || {}
      setCreds({ metaToken: s.metaToken || '', metaAdAccountId: s.metaAdAccountId || '', metaApiVersion: s.metaApiVersion || 'v21.0' })
    })
    fetchCampaigns()
  }, [])

  const fetchCampaigns = () => {
    fetch('/api/meta/settings').then(r => r.json()).then(d => setCampaigns(d.data || []))
  }

  const saveCreds = async () => {
    setCredsSaving(true)
    setCredsMsg('')
    const res = await fetch('/api/settings/site', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds) })
    setCredsSaving(false)
    setCredsMsg(res.ok ? 'Saved!' : 'Failed to save')
    setTimeout(() => setCredsMsg(''), 3000)
  }

  const addCampaign = async () => {
    const payload = {
      label: form.label.trim(),
      metaCampaignNames: form.metaCampaignNames.split(',').map(s => s.trim()).filter(Boolean),
      adsetNames: form.adsetNames.split('\n').map(s => s.trim()).filter(Boolean),
      active: form.active,
    }
    const res = await fetch('/api/meta/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { setShowForm(false); setForm({ label: '', metaCampaignNames: '', adsetNames: '', active: true }); fetchCampaigns() }
  }

  const deleteCampaign = async (id: string) => {
    await fetch(`/api/meta/settings/${id}`, { method: 'DELETE' })
    fetchCampaigns()
  }

  const copySecret = (secret: string, id: string) => {
    navigator.clipboard.writeText(secret)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontWeight: 900, fontSize: 20, margin: '0 0 6px' }}>Meta Ads Integration</h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Connect your Meta ad account to auto-sync daily spend. One token with <code>ads_read</code> covers all levels.</p>
      </div>

      {/* Credentials */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
        <h3 style={{ fontWeight: 800, fontSize: 15, margin: '0 0 16px' }}>API Credentials</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Access Token</label>
            <div style={{ position: 'relative' }}>
              <input type={showToken ? 'text' : 'password'} value={creds.metaToken} onChange={e => setCreds({ ...creds, metaToken: e.target.value })} placeholder="EAAxxxxxxx..." style={{ width: '100%', padding: '10px 42px 10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}/>
              <button type="button" onClick={() => setShowToken(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                {showToken ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Ad Account ID</label>
              <input value={creds.metaAdAccountId} onChange={e => setCreds({ ...creds, metaAdAccountId: e.target.value })} placeholder="123456789" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>API Version</label>
              <input value={creds.metaApiVersion} onChange={e => setCreds({ ...creds, metaApiVersion: e.target.value })} placeholder="v21.0" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}/>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={saveCreds} disabled={credsSaving} style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '10px 24px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              {credsSaving ? 'Saving...' : 'Save Credentials'}
            </button>
            {credsMsg && <span style={{ fontSize: 13, color: credsMsg === 'Saved!' ? '#10b981' : '#ef4444', fontWeight: 600 }}>{credsMsg}</span>}
          </div>
        </div>
      </div>

      {/* Campaign Configs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>Campaign Configs</h3>
          <button onClick={() => setShowForm(v => !v)} style={{ background: '#0f172a', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add Campaign</button>
        </div>

        {showForm && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #3b82f6', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Label (your name for this campaign)</label>
              <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Offer 2 Spring" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Meta Campaign Names <span style={{ fontWeight: 400, color: '#94a3b8' }}>(comma-separated, up to 2 — exact names from Meta)</span></label>
              <input value={form.metaCampaignNames} onChange={e => setForm({ ...form, metaCampaignNames: e.target.value })} placeholder="Campaign A, Campaign B" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Ad Set Names to Track <span style={{ fontWeight: 400, color: '#94a3b8' }}>(one per line, up to 10)</span></label>
              <textarea value={form.adsetNames} onChange={e => setForm({ ...form, adsetNames: e.target.value })} rows={4} placeholder={"AdSet 1\nAdSet 2"} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}/>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '10px', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={addCampaign} style={{ flex: 2, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '10px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Save Campaign</button>
            </div>
          </div>
        )}

        {campaigns.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No campaign configs yet. Click "Add Campaign" to create one.</div>
        ) : (
          campaigns.map(c => (
            <div key={c.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>Campaigns:</span> {(c.metaCampaignNames as string[]).join(', ')}
                  </div>
                  {(c.adsetNames as string[]).length > 0 && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      <span style={{ fontWeight: 700 }}>Ad Sets:</span> {(c.adsetNames as string[]).join(', ')}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteCampaign(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={14}/></button>
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>WEBHOOK SECRET</span>
                <code style={{ fontSize: 11, background: '#f8fafc', padding: '4px 8px', borderRadius: 6, color: '#475569', letterSpacing: 1 }}>{c.webhookSecret.slice(0, 8)}•••</code>
                <button onClick={() => copySecret(c.webhookSecret, c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === c.id ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  {copiedId === c.id ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Campaigns Tab Component ────────────────────────────────────────────────────
const CampaignsTab = () => {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [range, setRange] = useState<'week' | 'month' | 'all'>('month')

  const fetchStats = async () => {
    setLoading(true)
    const now = new Date()
    let from = ''
    if (range === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString().split('T')[0] }
    if (range === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] }
    const qs = from ? `?from=${from}` : ''
    const res = await fetch(`/api/meta/stats${qs}`)
    const json = await res.json()
    setData(json.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchStats() }, [range])

  const syncNow = async () => {
    setSyncing(true)
    await fetch('/api/meta/sync', { method: 'POST' })
    await fetchStats()
    setSyncing(false)
  }

  const fmtMoney = (n: number) => n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtX = (n: number | null) => n == null ? '—' : `${n}x`

  const colStyle = { padding: '11px 14px', fontSize: 13 }
  const thStyle = { padding: '9px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['week', 'month', 'all'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: '7px 16px', borderRadius: 8, border: range === r ? 'none' : '1px solid #e2e8f0', background: range === r ? '#0f172a' : 'white', color: range === r ? 'white' : '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
        <button onClick={syncNow} disabled={syncing} style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, padding: '8px 20px', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {syncing ? 'Syncing...' : '↻ Sync Now'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading campaigns...</div>
      ) : data.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          No campaign data yet. Configure campaigns in Settings → Meta Ads, then click Sync Now.
        </div>
      ) : (
        data.map(campaign => (
          <div key={campaign.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{campaign.label}</span>
              <button onClick={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 12, fontWeight: 700 }}>
                {expandedId === campaign.id ? '▲ Hide Ad Sets' : '▼ Show Ad Sets'}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  {['Date', 'Ad Spend', 'Leads', 'CPL', 'Purchases', 'Revenue', 'ROAS'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {campaign.summary.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...colStyle, textAlign: 'center', color: '#94a3b8' }}>No data for this period</td></tr>
                  ) : campaign.summary.map((row: any) => (
                    <tr key={row.date} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={colStyle}>{row.date}</td>
                      <td style={{ ...colStyle, color: '#f59e0b', fontWeight: 700 }}>{fmtMoney(row.spend)}</td>
                      <td style={{ ...colStyle, fontWeight: 700 }}>{row.leads}</td>
                      <td style={colStyle}>{fmtMoney(row.cpl)}</td>
                      <td style={{ ...colStyle, fontWeight: 700 }}>{row.purchases}</td>
                      <td style={{ ...colStyle, color: '#10b981', fontWeight: 700 }}>{fmtMoney(row.revenue)}</td>
                      <td style={{ ...colStyle, color: row.roas >= 1 ? '#10b981' : '#ef4444', fontWeight: 700 }}>{fmtX(row.roas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {expandedId === campaign.id && campaign.adsets.length > 0 && (
              <div style={{ borderTop: '2px solid #f1f5f9' }}>
                <div style={{ padding: '10px 20px', background: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Ad Set Breakdown</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f8fafc' }}>
                    {['Ad Set', 'Date', 'Spend', 'Leads', 'CPL', 'Purchases', 'Revenue', 'ROAS'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {campaign.adsets.map((row: any, i: number) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ ...colStyle, fontWeight: 600, color: '#475569' }}>{row.adsetName}</td>
                        <td style={colStyle}>{row.date}</td>
                        <td style={{ ...colStyle, color: '#f59e0b', fontWeight: 700 }}>{fmtMoney(row.spend)}</td>
                        <td style={{ ...colStyle, fontWeight: 700 }}>{row.leads}</td>
                        <td style={colStyle}>{fmtMoney(row.cpl)}</td>
                        <td style={{ ...colStyle, fontWeight: 700 }}>{row.purchases}</td>
                        <td style={{ ...colStyle, color: '#10b981', fontWeight: 700 }}>{fmtMoney(row.revenue)}</td>
                        <td style={{ ...colStyle, color: row.roas >= 1 ? '#10b981' : '#ef4444', fontWeight: 700 }}>{fmtX(row.roas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Archive Settings Component ────────────────────────────────────────────────
const ArchiveSettings = () => {
  const [posts, setPosts] = useState<any[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('smm-posts')
    return saved ? JSON.parse(saved) : []
  })
  const [isCleaning, setIsCleaning] = useState(false)
  const [preview, setPreview] = useState<{total: number, toClean: number, posts: any[]}>({total: 0, toClean: 0, posts: []})

  useEffect(() => {
    // Get all Results In posts, sort by date, archive beyond 8 most recent
    const resultsInPosts = posts.filter(p => p.status === 'Results In')
    const sorted = resultsInPosts.sort((a, b) => 
      new Date(b.publishedDate || b.scheduledDate).getTime() - new Date(a.publishedDate || a.scheduledDate).getTime()
    )
    const toArchive = sorted.slice(8) // Beyond 8 most recent

    setPreview({
      total: resultsInPosts.length,
      toClean: toArchive.length,
      posts: toArchive,
    })
  }, [posts])

  const handleCleanArchive = () => {
    if (!confirm(`This will remove details from ${preview.toClean} archived posts but keep their stats (impressions, leads, time spent). Continue?`)) return

    setIsCleaning(true)
    const archiveIds = new Set(preview.posts.map(p => p.id))

    const cleaned = posts.map(p => {
      if (archiveIds.has(p.id)) {
        // Keep stats, remove details
        return {
          ...p,
          title: '[Archived] ' + (p.title || 'Untitled'),
          caption: '',
          tags: [],
          notes: `Details cleaned on ${new Date().toLocaleDateString()}. Stats preserved.`,
        }
      }
      return p
    })

    setPosts(cleaned)
    if (typeof window !== 'undefined') {
      localStorage.setItem('smm-posts', JSON.stringify(cleaned))
    }
    setIsCleaning(false)
    alert(`Cleaned ${preview.toClean} archived posts. Details removed, stats preserved.`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontWeight: 900, fontSize: 20, margin: '0 0 6px' }}>Archive Settings</h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>Manage archived posts and clean up old data while preserving performance stats</p>
      </div>

      {/* Archive info */}
      <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontWeight: 900, fontSize: 16, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArchiveRestore size={18} color="#6366f1"/> How Archiving Works
        </h3>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ background: '#eff6ff', borderRadius: 12, padding: '14px 18px', flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 4px' }}>Active Posts</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#1d4ed8', margin: 0 }}>8 most recent</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Results In posts shown on Actual tab</p>
          </div>
          <div style={{ background: '#fef3c7', borderRadius: 12, padding: '14px 18px', flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', margin: '0 0 4px' }}>Archived</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#b45309', margin: 0 }}>{preview.toClean}</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Results In posts beyond 8</p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          When a post is marked <strong>Results In</strong>, it appears in the Active list. Once you have more than 8 completed posts, 
          the oldest ones automatically move to the <strong>Archive</strong> tab. All performance stats are preserved in both views.
        </p>
      </div>

      {/* Archive preview */}
      <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontWeight: 900, fontSize: 16, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={18} color="#10b981"/> Archive Preview
        </h3>

        {preview.toClean > 0 ? (
          <>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>Posts to be cleaned:</p>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {preview.posts.slice(0, 10).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{p.publishedDate || p.scheduledDate}</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.title || 'Untitled'}</span>
                  <span style={{ color: '#94a3b8' }}>{p.platform}</span>
                </div>
              ))}
              {preview.toClean > 10 && (
                <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>+{preview.toClean - 10} more</p>
              )}
            </div>

            <div style={{ marginTop: 20, padding: '14px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12 }}>
              <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 8px', fontWeight: 700 }}>⚠️ What gets cleaned:</p>
              <ul style={{ fontSize: 12, color: '#92400e', margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Post titles (prefixed with "[Archived]")</li>
                <li>Captions and copy</li>
                <li>Tags</li>
                <li>Notes and work logs</li>
              </ul>
              <p style={{ fontSize: 12, color: '#059669', margin: '8px 0 0', fontWeight: 700 }}>✓ What's preserved:</p>
              <ul style={{ fontSize: 12, color: '#059669', margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Impressions and organic leads</li>
                <li>Time spent / work hours</li>
                <li>Platform and content type</li>
                <li>Scheduled/published dates</li>
                <li>CVR and performance metrics</li>
              </ul>
            </div>

            <button
              onClick={handleCleanArchive}
              disabled={isCleaning}
              style={{
                marginTop: 16,
                background: isCleaning ? '#cbd5e1' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                border: 'none',
                borderRadius: 10,
                padding: '12px 24px',
                color: 'white',
                fontWeight: 700,
                cursor: isCleaning ? 'not-allowed' : 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: isCleaning ? 0.7 : 1,
              }}
            >
              {isCleaning ? <><RefreshCw size={16}/> Cleaning...</> : <><Trash2 size={16}/> Clean Archive Details</>}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <ArchiveRestore size={48} style={{ marginBottom: 12, opacity: 0.5 }}/>
            <p style={{ fontSize: 14, fontWeight: 600 }}>No posts to archive yet</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Complete 9+ posts to see older ones archived</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SmmHub
