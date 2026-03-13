// app/components/TimeClock.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Play, Square, Edit2, Save, X, Calendar } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkSession {
  id: string
  userId: string
  startTime: string
  endTime: string | null
  duration: number
  category: string
  notes: string
  status: 'active' | 'completed'
  user: {
    id: string
    name: string
    avatarUrl: string | null
  }
  effortLog?: {
    id: string
    minutes: number
    categoryRate: number
  } | null
}

interface TimeClockProps {
  currentWorker: {
    id: string
    name: string
    username: string
    rates: any
  } | null
  onLog?: (level: 'info' | 'success' | 'error' | 'warn', message: string) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TASK_CATEGORIES = [
  "Content Creation",
  "Engagement/Community Mgmt",
  "Strategy & Planning",
  "Analytics & Reporting",
  "Ad Management",
  "Client Meetings",
  "Admin/Misc"
]

// ─── Helper Functions ─────────────────────────────────────────────────────────
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const groupSessionsByDate = (sessions: WorkSession[]): Record<string, WorkSession[]> => {
  return sessions.reduce((groups, session) => {
    const dateKey = new Date(session.startTime).toISOString().split('T')[0]
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(session)
    return groups
  }, {} as Record<string, WorkSession[]>)
}

// ─── TimeClock Component ──────────────────────────────────────────────────────
const TimeClock: React.FC<TimeClockProps> = ({ currentWorker, onLog }) => {
  // State
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null)
  const [completedSessions, setCompletedSessions] = useState<WorkSession[]>([])
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(TASK_CATEGORIES[0])
  const [initialNotes, setInitialNotes] = useState('')
  const [showHistory, setShowHistory] = useState(true)

  // Fetch sessions on mount
  useEffect(() => {
    if (currentWorker) {
      fetchSessions()
    }
  }, [currentWorker])

  // Timer tick for active session
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (activeSession) {
      interval = setInterval(() => {
        const now = new Date()
        const start = new Date(activeSession.startTime)
        const seconds = Math.floor((now.getTime() - start.getTime()) / 1000)
        setElapsedTime(seconds)
      }, 1000)
    } else {
      setElapsedTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeSession])

  const fetchSessions = async () => {
    if (!currentWorker) return

    try {
      const res = await fetch(`/api/work-sessions?userId=${currentWorker.id}`)
      const data = await res.json()

      if (data.data?.sessions) {
        const sessions: WorkSession[] = data.data.sessions
        const active = sessions.find(s => s.status === 'active')
        const completed = sessions.filter(s => s.status === 'completed')

        setActiveSession(active || null)
        setCompletedSessions(completed)

        if (active) {
          // Calculate elapsed time for existing active session
          const now = new Date()
          const start = new Date(active.startTime)
          const seconds = Math.floor((now.getTime() - start.getTime()) / 1000)
          setElapsedTime(seconds)
        }
      }
    } catch (err) {
      console.error('[TimeClock] Failed to fetch sessions:', err)
      onLog?.('error', 'Failed to load work sessions')
    }
  }

  const startSession = async () => {
    if (!currentWorker || !selectedCategory) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/work-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentWorker.id,
          category: selectedCategory,
          notes: initialNotes,
        }),
      })

      const data = await res.json()

      if (res.ok && data.data?.session) {
        setActiveSession(data.data.session)
        setInitialNotes('')
        onLog?.('success', 'Work session started')
      } else {
        alert(data.error?.message || 'Failed to start session')
        onLog?.('error', data.error?.message || 'Failed to start session')
      }
    } catch (err) {
      console.error('[TimeClock] Failed to start session:', err)
      alert('Failed to start session')
      onLog?.('error', 'Failed to start session')
    } finally {
      setIsLoading(false)
    }
  }

  const stopSession = async () => {
    if (!activeSession) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/work-sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          notes: activeSession.notes,
        }),
      })

      const data = await res.json()

      if (res.ok && data.data?.session) {
        const minutes = Math.ceil(data.data.session.duration / 60)
        setActiveSession(null)
        setCompletedSessions(prev => [data.data.session, ...prev])
        onLog?.('success', `Session stopped - ${minutes} min logged`)
      } else {
        alert(data.error?.message || 'Failed to stop session')
        onLog?.('error', data.error?.message || 'Failed to stop session')
      }
    } catch (err) {
      console.error('[TimeClock] Failed to stop session:', err)
      alert('Failed to stop session')
      onLog?.('error', 'Failed to stop session')
    } finally {
      setIsLoading(false)
    }
  }

  const updateSessionNotes = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/work-sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          notes: editNotes,
        }),
      })

      const data = await res.json()

      if (res.ok && data.data?.session) {
        // Update local state
        if (activeSession && activeSession.id === sessionId) {
          setActiveSession(data.data.session)
        }
        setCompletedSessions(prev =>
          prev.map(s => s.id === sessionId ? data.data.session : s)
        )
        setIsEditingNotes(null)
        onLog?.('success', 'Notes updated')
      } else {
        alert(data.error?.message || 'Failed to update notes')
        onLog?.('error', data.error?.message || 'Failed to update notes')
      }
    } catch (err) {
      console.error('[TimeClock] Failed to update notes:', err)
      alert('Failed to update notes')
      onLog?.('error', 'Failed to update notes')
    } finally {
      setIsLoading(false)
    }
  }

  const startEditNotes = (session: WorkSession) => {
    setIsEditingNotes(session.id)
    setEditNotes(session.notes)
  }

  const cancelEditNotes = () => {
    setIsEditingNotes(null)
    setEditNotes('')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: 16,
      padding: 24,
      border: '1px solid #334155',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Clock size={20} color="white" />
        </div>
        <div>
          <h3 style={{
            color: 'white',
            fontSize: 18,
            fontWeight: 700,
            margin: 0,
          }}>
            Time Clock
          </h3>
          <p style={{
            color: '#64748b',
            fontSize: 13,
            margin: 0,
          }}>
            Track work sessions in real-time
          </p>
        </div>
      </div>

      {/* Active Session or Start Form */}
      {activeSession ? (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 12,
          padding: 20,
        }}>
          {/* Timer Display */}
          <div style={{
            textAlign: 'center',
            marginBottom: 16,
          }}>
            <div style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#10b981',
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '2px',
            }}>
              {formatDuration(elapsedTime)}
            </div>
            <div style={{
              color: '#64748b',
              fontSize: 13,
              marginTop: 4,
            }}>
              Working on: <strong style={{ color: '#94a3b8' }}>{activeSession.category}</strong>
            </div>
          </div>

          {/* Notes Field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 6,
            }}>
              Session Notes (what are you working on?)
            </label>
            <textarea
              value={activeSession.notes}
              onChange={(e) => {
                setActiveSession({ ...activeSession, notes: e.target.value })
              }}
              placeholder="Describe what you're working on... (for AI summarization later)"
              rows={3}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#e2e8f0',
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Stop Button */}
          <button
            onClick={stopSession}
            disabled={isLoading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none',
              borderRadius: 10,
              padding: '14px 20px',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <Square size={18} fill="white" />
            {isLoading ? 'Stopping...' : 'Stop Clock'}
          </button>
        </div>
      ) : (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 12,
          padding: 20,
        }}>
          {/* Category Selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 6,
            }}>
              Work Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#e2e8f0',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {TASK_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Initial Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 6,
            }}>
              Initial Notes (optional)
            </label>
            <textarea
              value={initialNotes}
              onChange={(e) => setInitialNotes(e.target.value)}
              placeholder="What will you be working on?"
              rows={2}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#e2e8f0',
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Start Button */}
          <button
            onClick={startSession}
            disabled={isLoading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: 10,
              padding: '14px 20px',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <Play size={18} fill="white" />
            {isLoading ? 'Starting...' : 'Start Clock'}
          </button>
        </div>
      )}

      {/* Session History Toggle */}
      <div style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid #334155',
      }}>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 0,
          }}
        >
          <Calendar size={16} />
          {showHistory ? 'Hide' : 'Show'} Session History ({completedSessions.length})
        </button>
      </div>

      {/* Session History */}
      {showHistory && completedSessions.length > 0 && (
        <div style={{
          marginTop: 16,
          maxHeight: 400,
          overflowY: 'auto',
        }}>
          {Object.entries(groupSessionsByDate(completedSessions)).map(([dateKey, sessions]) => (
            <div key={dateKey} style={{ marginBottom: 16 }}>
              <div style={{
                color: '#64748b',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
              }}>
                {new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              {sessions.map(session => (
                <div
                  key={session.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#10b981',
                      }} />
                      <span style={{
                        color: '#e2e8f0',
                        fontSize: 13,
                        fontWeight: 600,
                      }}>
                        {session.category}
                      </span>
                    </div>
                    <div style={{
                      color: '#10b981',
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {formatDuration(session.duration)}
                    </div>
                  </div>

                  {/* Notes */}
                  {isEditingNotes === session.id ? (
                    <div>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          padding: '8px 10px',
                          color: '#e2e8f0',
                          fontSize: 12,
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          marginBottom: 8,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => updateSessionNotes(session.id)}
                          disabled={isLoading}
                          style={{
                            background: '#10b981',
                            border: 'none',
                            borderRadius: 4,
                            padding: '4px 8px',
                            color: 'white',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Save size={12} /> Save
                        </button>
                        <button
                          onClick={cancelEditNotes}
                          disabled={isLoading}
                          style={{
                            background: '#334155',
                            border: 'none',
                            borderRadius: 4,
                            padding: '4px 8px',
                            color: '#94a3b8',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {session.notes && (
                        <div style={{
                          color: '#94a3b8',
                          fontSize: 12,
                          lineHeight: 1.5,
                          marginBottom: 8,
                        }}>
                          {session.notes}
                        </div>
                      )}
                      <button
                        onClick={() => startEditNotes(session)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: 0,
                        }}
                      >
                        <Edit2 size={12} /> Edit Notes
                      </button>
                    </div>
                  )}

                  {/* Time Info */}
                  <div style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid #334155',
                    color: '#64748b',
                    fontSize: 11,
                  }}>
                    {formatDate(session.startTime)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {showHistory && completedSessions.length === 0 && (
        <div style={{
          marginTop: 16,
          textAlign: 'center',
          padding: 20,
          color: '#64748b',
          fontSize: 13,
        }}>
          No completed sessions yet. Start your first work session above!
        </div>
      )}
    </div>
  )
}

export default TimeClock
