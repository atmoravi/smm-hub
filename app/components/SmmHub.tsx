'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock, Calendar, BarChart3, Plus, Trash2, TrendingUp, DollarSign,
  Settings, User, Globe, Zap, Layers, History, PieChart,
  Users, Key, Eye, EyeOff, Copy, Check, Shield, LogOut,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, ChevronDown,
  Activity, Target, AlertCircle, Lock
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
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
  const [authState, setAuthState] = useState('select') // 'select' | 'pin' | 'worker-select' | 'app'
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [currentRole, setCurrentRole] = useState(null) // 'admin' | worker id
  const [currentWorker, setCurrentWorker] = useState(null)

  // Core state
  const [activeTab, setActiveTab] = useState('dashboard')

  const [workers, setWorkers] = useState(() => {
    if (typeof window === 'undefined') return []
    const s = localStorage.getItem('smm-workers')
    return s ? JSON.parse(s) : [
      { id: 'w1', name: 'Alex Rivera', role: 'worker', active: true, rates: TASK_CATEGORIES.reduce((a,c) => ({...a,[c]:25}),{}) },
    ]
  })

  const [logs, setLogs] = useState(() => { if (typeof window === 'undefined') return []; const s = localStorage.getItem('smm-logs2'); return s ? JSON.parse(s) : [] })
  const [trafficLogs, setTrafficLogs] = useState(() => { if (typeof window === 'undefined') return []; const s = localStorage.getItem('smm-traffic2'); return s ? JSON.parse(s) : [] })
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

  // Persist
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('smm-workers', JSON.stringify(workers))
    localStorage.setItem('smm-logs2', JSON.stringify(logs))
    localStorage.setItem('smm-traffic2', JSON.stringify(trafficLogs))
    localStorage.setItem('smm-sales2', JSON.stringify(salesLogs))
    localStorage.setItem('smm-endpoints', JSON.stringify(endpoints))
    localStorage.setItem('smm-settings2', JSON.stringify(settings))
  }, [workers, logs, trafficLogs, salesLogs, endpoints, settings])

  // ── Auth flow ────────────────────────────────────────────────────────────────
  const handleRoleSelect = (role) => {
    if (role === 'admin') { setCurrentRole('admin'); setAuthState('pin') }
    else { setCurrentRole('worker'); setAuthState('worker-select') }
  }

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) { setPinError(false); setAuthState('app') }
    else { setPinError(true); setPinInput('') }
  }

  const handleWorkerSelect = (worker) => {
    setCurrentWorker(worker)
    setAuthState('app')
  }

  const logout = () => {
    setAuthState('select')
    setCurrentRole(null)
    setCurrentWorker(null)
    setPinInput('')
    setActiveTab('dashboard')
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  const addLog = () => {
    if (!minutes || isNaN(minutes) || minutes <= 0) return
    const workerId = currentRole === 'admin' ? 'admin' : currentWorker?.id
    const workerName = currentRole === 'admin' ? 'Admin' : currentWorker?.name
    setLogs(prev => [{ id: generateId(), date: currentDate, minutes: parseInt(minutes), category, note: note.trim(), workerId, workerName }, ...prev])
    setMinutes(''); setNote('')
  }

  const addTrafficLog = () => {
    setTrafficLogs(prev => [{
      id: generateId(), date: currentDate, ...trafficData,
      organicLeads: parseInt(trafficData.organicLeads) || 0,
      paidLeads: parseInt(trafficData.paidLeads) || 0,
      adSpend: parseFloat(trafficData.adSpend) || 0,
    }, ...prev])
    setTrafficData({ organicLeads: '', paidLeads: '', adSpend: '', campaignName: '' })
  }

  const addSalesLog = () => {
    if (!incomeAmount || isNaN(incomeAmount)) return
    setSalesLogs(prev => [{ id: generateId(), date: currentDate, amount: parseFloat(incomeAmount) }, ...prev])
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

  const rotateKey = (source) => setEndpoints(prev => ({ ...prev, [source]: { ...prev[source], key: generateKey() } }))

  const copyKey = (source) => {
    navigator.clipboard.writeText(endpoints[source].key)
    setCopiedKey(source)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const mLogs = logs.filter(l => new Date(l.date) >= startOfMonth)
    const mTraffic = trafficLogs.filter(l => new Date(l.date) >= startOfMonth)
    const mSales = salesLogs.filter(l => new Date(l.date) >= startOfMonth)

    // Worker costs
    const workerMap = Object.fromEntries(workers.map(w => [w.id, w]))
    const totalSalary = mLogs.reduce((acc, log) => {
      const w = workerMap[log.workerId]
      const rate = w?.rates?.[log.category] || 25
      return acc + (log.minutes / 60) * rate
    }, 0)

    const totalAdSpend = mTraffic.reduce((a, c) => a + c.adSpend, 0)
    const totalIncome = mSales.reduce((a, c) => a + c.amount, 0)
    const totalCost = totalSalary + totalAdSpend
    const netProfit = totalIncome - totalCost

    const totalOrganic = mTraffic.reduce((a, c) => a + c.organicLeads, 0)
    const totalPaid = mTraffic.reduce((a, c) => a + c.paidLeads, 0)
    const catchupRatio = totalPaid > 0 ? (totalOrganic / totalPaid) * 100 : 0

    const smmLogs = mLogs.filter(l => ['Content Creation','Engagement/Community Mgmt','Strategy & Planning'].includes(l.category))
    const smmCost = smmLogs.reduce((acc, log) => {
      const w = workerMap[log.workerId]
      const rate = w?.rates?.[log.category] || 25
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

    // Per-worker this month
    const perWorker = workers.map(w => {
      const wLogs = mLogs.filter(l => l.workerId === w.id)
      const mins = wLogs.reduce((a, l) => a + l.minutes, 0)
      const cost = wLogs.reduce((acc, log) => acc + (log.minutes / 60) * (w.rates[log.category] || 25), 0)
      return { ...w, monthMins: mins, monthCost: cost }
    })

    return {
      totalSalary, totalAdSpend, totalIncome, totalCost, netProfit,
      totalOrganic, totalPaid, catchupRatio, smmCost, costPerOrgLead,
      grossROI, netROI, trendData, perWorker,
      breakeven: totalCost,
    }
  }, [logs, trafficLogs, salesLogs, workers])

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
        <h2 style={{ color: 'white', fontWeight: 900, fontSize: 22, margin: '0 0 6px' }}>Select Account</h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>Who's logging in?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {workers.filter(w => w.active).map(w => (
            <button key={w.id} onClick={() => handleWorkerSelect(w)} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: '14px 18px', color: 'white', fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', transition: 'border-color 0.2s' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16 }}>
                {w.name[0]}
              </div>
              {w.name}
            </button>
          ))}
          {workers.filter(w => w.active).length === 0 && <p style={{color:'#64748b',fontSize:13}}>No active workers. Ask your admin to add you.</p>}
        </div>
        <button onClick={() => setAuthState('select')} style={{ marginTop: 20, width: '100%', background: 'transparent', border: '1px solid #334155', borderRadius: 10, padding: '11px', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>← Back</button>
      </div>
    </div>
  )

  // ── Main App ─────────────────────────────────────────────────────────────────
  const isAdmin = currentRole === 'admin'
  const TABS = isAdmin
    ? ['dashboard', 'traffic', 'workers', 'settings', 'history']
    : ['effort', 'traffic', 'history']

  const tabLabels = { dashboard: 'Dashboard', traffic: 'Traffic', workers: 'Workers', settings: 'Settings', history: 'History', effort: 'Log Effort' }
  const tabIcons = { dashboard: <BarChart3 size={14}/>, traffic: <Globe size={14}/>, workers: <Users size={14}/>, settings: <Settings size={14}/>, history: <History size={14}/>, effort: <Layers size={14}/> }

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
                  {stats.perWorker.map(w => (
                    <tr key={w.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 14 }}>{w.name[0]}</div>
                        <span style={{ fontWeight: 700 }}>{w.name}</span>
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatTime(w.monthMins)}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{fmtDollar(w.monthCost)}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ background: w.active ? '#f0fdf4' : '#fef2f2', color: w.active ? '#10b981' : '#ef4444', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{w.active ? 'Active' : 'Inactive'}</span>
                      </td>
                    </tr>
                  ))}
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
                    {logs.filter(l => l.workerId === currentWorker?.id).slice(0, 20).map(l => (
                      <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '13px 18px', fontSize: 13 }}>{l.date}</td>
                        <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 600 }}>{l.category}</td>
                        <td style={{ padding: '13px 18px', fontSize: 13 }}>{l.minutes}m</td>
                        <td style={{ padding: '13px 18px', fontSize: 12, color: '#94a3b8' }}>{l.note || '—'}</td>
                        <td style={{ padding: '13px 18px' }}><button onClick={() => setLogs(p => p.filter(x => x.id !== l.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={13}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TRAFFIC ── */}
        {activeTab === 'traffic' && (
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

        {/* ── WORKERS (admin only) ── */}
        {activeTab === 'workers' && isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Add worker */}
            <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0', maxWidth: 500 }}>
              <h2 style={{ fontWeight: 900, fontSize: 16, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={18} color="#6366f1"/> Add Worker</h2>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="text" placeholder="Full name" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} style={{ flex: 2, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14 }}/>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}>$</span>
                  <input type="number" placeholder="25" value={newWorker.rate} onChange={e => setNewWorker({...newWorker, rate: e.target.value})} style={{ width: '100%', padding: '10px 10px 10px 22px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}/>
                </div>
                <button onClick={addWorker} style={{ background: '#6366f1', border: 'none', borderRadius: 10, padding: '10px 20px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Add</button>
              </div>
              <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 8 }}>Default hourly rate applies to all categories; customize below after adding.</p>
            </div>

            {/* Worker list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {workers.map(w => (
                <div key={w.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 18 }}>{w.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>{w.name}</p>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Worker · ID: {w.id}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => toggleWorkerStatus(w.id)} style={{ background: w.active ? '#f0fdf4' : '#fef2f2', color: w.active ? '#10b981' : '#ef4444', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        {w.active ? 'Active' : 'Inactive'}
                      </button>
                      <button onClick={() => removeWorker(w.id)} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {TASK_CATEGORIES.map(cat => (
                      <div key={cat}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>{cat}</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }}>$</span>
                          <input type="number" value={w.rates[cat]} onChange={e => updateWorkerRate(w.id, cat, e.target.value)} style={{ width: '100%', padding: '7px 8px 7px 20px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS (admin only) ── */}
        {activeTab === 'settings' && isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 20, margin: '0 0 6px' }}>API Endpoints & Keys</h2>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>Use these endpoints and API keys to pipe data from your traffic sources into SMM Hub. Each source has its own key.</p>
            </div>

            {Object.entries(endpoints).map(([source, ep]) => (
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
                        https://yourdomain.com{ep.url}
                      </code>
                      <button onClick={() => { navigator.clipboard.writeText(`https://yourdomain.com${ep.url}`) }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12 }}>
                        <Copy size={13}/> Copy
                      </button>
                    </div>
                  </div>

                  {/* API Key */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>API Key</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '11px 14px', fontSize: 13, fontFamily: "'DM Mono', monospace", color: '#7dd3fc', letterSpacing: 1 }}>
                        {visibleKeys[source] ? ep.key : ep.key.slice(0, 10) + '•'.repeat(24)}
                      </code>
                      <button onClick={() => setVisibleKeys(prev => ({...prev, [source]: !prev[source]}))} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        {visibleKeys[source] ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                      <button onClick={() => copyKey(source)} style={{ background: copiedKey === source ? '#f0fdf4' : '#f1f5f9', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', color: copiedKey === source ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12 }}>
                        {copiedKey === source ? <><Check size={13}/> Copied</> : <><Copy size={13}/> Copy</>}
                      </button>
                      <button onClick={() => rotateKey(source)} title="Rotate key" style={{ background: '#fff7ed', border: 'none', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
                        <RefreshCw size={14}/>
                      </button>
                    </div>
                  </div>

                  {/* Example payload */}
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ChevronDown size={13}/> Example payload
                    </summary>
                    <pre style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px', marginTop: 10, fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#94a3b8', overflowX: 'auto', lineHeight: 1.6 }}>
{source === 'organicLeads' ? `POST ${ep.url}
x-api-key: ${ep.key.slice(0,20)}...

{
  "date": "2026-03-06",
  "count": 14,
  "source": "instagram_organic",
  "campaign": "Q1 Content Push"
}` : source === 'paidLeads' ? `POST ${ep.url}
x-api-key: ${ep.key.slice(0,20)}...

{
  "date": "2026-03-06",
  "count": 31,
  "adSpend": 240.00,
  "platform": "meta_ads",
  "campaign": "Spring Sale"
}` : `POST ${ep.url}
x-api-key: ${ep.key.slice(0,20)}...

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
            ))}

            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <AlertCircle size={18} color="#f59e0b" style={{flexShrink:0, marginTop:1}}/>
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 4px' }}>Keep your API keys secret</p>
                <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>Keys give write access to your SMM Hub data. Rotate immediately if one is exposed. Each source has an independent key so you can revoke them individually.</p>
              </div>
            </div>
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
                  const groups = {}
                  (isAdmin ? logs : logs.filter(l => l.workerId === currentWorker?.id)).forEach(l => {
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

export default SmmHub
