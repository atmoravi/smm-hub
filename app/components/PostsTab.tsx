'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus, Calendar, Clock, Check, X, Trash2, Filter, ChevronDown,
  ChevronRight, Edit3, BarChart2, Target, FileText, Tag, ArchiveRestore
} from 'lucide-react'

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'X/Twitter', 'YouTube']
const STATUSES = ['Draft', 'Scheduled', 'Published', 'Results In']
const CONTENT_TYPES = ['Reel', 'Carousel', 'Static Post', 'Story', 'Video', 'Article', 'Thread']

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Draft':      { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
  'Scheduled':  { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' },
  'Published':  { bg: '#fefce8', text: '#ca8a04', border: '#fde68a' },
  'Results In': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
}

const PLATFORM_COLORS: Record<string, string> = {
  'Instagram': '#e1306c',
  'TikTok':    '#010101',
  'LinkedIn':  '#0077b5',
  'Facebook':  '#1877f2',
  'X/Twitter': '#000000',
  'YouTube':   '#ff0000',
}

const PLATFORM_ICONS: Record<string, string> = {
  'Instagram': '📸',
  'TikTok':    '🎵',
  'LinkedIn':  '💼',
  'Facebook':  '👤',
  'X/Twitter': '✕',
  'YouTube':   '▶',
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

const SAMPLE_POSTS = [
  { id: 'p1', title: 'Spring Campaign Launch', platform: 'Instagram', contentType: 'Carousel', status: 'Results In', scheduledDate: '2026-02-15', publishedDate: '2026-02-15', caption: 'Introducing our spring collection', tags: ['spring', 'launch'], assignedTo: '', minutesSpent: 120, impressions: 4200, organicLeads: 18, notes: 'Strong engagement on first 3 slides' },
  { id: 'p2', title: 'Behind the Scenes Reel', platform: 'Instagram', contentType: 'Reel', status: 'Results In', scheduledDate: '2026-02-20', publishedDate: '2026-02-20', caption: 'A day in our studio', tags: ['bts', 'brand'], assignedTo: '', minutesSpent: 90, impressions: 8900, organicLeads: 31, notes: 'Best performing reel this quarter' },
  { id: 'p3', title: 'Industry Insights Thread', platform: 'X/Twitter', contentType: 'Thread', status: 'Published', scheduledDate: '2026-03-01', publishedDate: '2026-03-01', caption: '5 things no one tells you about organic growth', tags: ['insights', 'organic'], assignedTo: '', minutesSpent: 60, impressions: 2100, organicLeads: 9, notes: '' },
  { id: 'p4', title: 'Client Success Story', platform: 'LinkedIn', contentType: 'Article', status: 'Scheduled', scheduledDate: '2026-03-10', publishedDate: '', caption: 'How we helped a client 3x their organic traffic in 60 days', tags: ['casestudy', 'results'], assignedTo: '', minutesSpent: 180, impressions: 0, organicLeads: 0, notes: '' },
  { id: 'p5', title: 'Product Demo Video', platform: 'YouTube', contentType: 'Video', status: 'Draft', scheduledDate: '2026-03-15', publishedDate: '', caption: '', tags: ['product', 'demo'], assignedTo: '', minutesSpent: 240, impressions: 0, organicLeads: 0, notes: '' },
  { id: 'p6', title: 'Weekly Tips Carousel', platform: 'Instagram', contentType: 'Carousel', status: 'Draft', scheduledDate: '2026-03-12', publishedDate: '', caption: '5 tips to boost your organic reach this week', tags: ['tips', 'weekly'], assignedTo: '', minutesSpent: 0, impressions: 0, organicLeads: 0, notes: '' },
]

interface Post {
  id: string
  title: string
  platform: string
  contentType: string
  status: string
  scheduledDate: string
  publishedDate: string
  caption: string
  tags: string[]
  assignedTo: string
  minutesSpent: number
  impressions: number
  organicLeads: number
  notes: string
}

interface Worker {
  id: string
  name: string
}

const blankPost = (): Post => ({
  id: generateId(),
  title: '',
  platform: 'Instagram',
  contentType: 'Reel',
  status: 'Draft',
  scheduledDate: new Date().toISOString().split('T')[0],
  publishedDate: '',
  caption: '',
  tags: [],
  assignedTo: '',
  minutesSpent: 0,
  impressions: 0,
  organicLeads: 0,
  notes: '',
})

const PostCard: React.FC<{ post: Post; onClick: (post: Post) => void; workers: Worker[] }> = ({ post, onClick, workers }) => {
  const sc = STATUS_COLORS[post.status]
  const pc = PLATFORM_COLORS[post.platform]
  const hasResults = post.status === 'Results In'
  const worker = workers?.find(w => w.id === post.assignedTo)

  return (
    <div
      onClick={() => onClick(post)}
      style={{
        background: 'white',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: pc, borderRadius: '14px 14px 0 0' }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{PLATFORM_ICONS[post.platform]}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: pc }}>{post.platform}</span>
          <span style={{ fontSize: 10, color: '#94a3b8', background: '#f8fafc', padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>{post.contentType}</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 99, padding: '2px 8px' }}>{post.status}</span>
      </div>
      <p style={{ fontWeight: 800, fontSize: 14, margin: '0 0 6px', lineHeight: 1.3, color: '#0f172a' }}>{post.title || <span style={{color:'#cbd5e1',fontWeight:400,fontStyle:'italic'}}>Untitled post</span>}</p>
      {post.caption && <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.caption}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: hasResults ? 12 : 0 }}>
        {post.scheduledDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} color="#94a3b8"/>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{post.scheduledDate}</span>
          </div>
        )}
        {post.minutesSpent > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} color="#94a3b8"/>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{Math.floor(post.minutesSpent/60)}h {post.minutesSpent%60}m</span>
          </div>
        )}
        {worker && (
          <div style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 900 }}>
            {worker.name[0]}
          </div>
        )}
      </div>
      {hasResults && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{post.impressions?.toLocaleString() || 0}</p>
            <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '2px 0 0' }}>Impr.</p>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#10b981', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{post.organicLeads || 0}</p>
            <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '2px 0 0' }}>Leads</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#6366f1', margin: 0 }}>
              {post.organicLeads > 0 && post.impressions > 0 ? ((post.organicLeads / post.impressions) * 100).toFixed(2) : '—'}
            </p>
            <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '2px 0 0' }}>CVR%</p>
          </div>
        </div>
      )}
      {post.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
          {post.tags.slice(0,3).map(t => (
            <span key={t} style={{ fontSize: 10, background: '#f8fafc', color: '#94a3b8', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

const PostModal: React.FC<{ post: Post; onSave: (post: Post) => void; onDelete: (id: string) => void; onClose: () => void; workers: Worker[]; isAdmin: boolean }> = ({ post, onSave, onDelete, onClose, workers, isAdmin }) => {
  const [form, setForm] = useState({ ...post })
  const [tagInput, setTagInput] = useState('')
  const [activeSection, setActiveSection] = useState('details')
  const [workNote, setWorkNote] = useState('')

  const set = (k: keyof Post, v: any) => setForm(f => ({ ...f, [k]: v }))
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t])
    setTagInput('')
  }
  const removeTag = (t: string) => set('tags', form.tags.filter(x => x !== t))
  const canEditResults = isAdmin || form.status === 'Published' || form.status === 'Results In'
  const canEditWork = isAdmin || form.status !== 'Results In'

  const addWorkTime = (minutes: number) => {
    if (minutes > 0) {
      set('minutesSpent', (form.minutesSpent || 0) + minutes)
      if (workNote.trim()) {
        set('notes', form.notes ? `${form.notes}\n\n[${new Date().toLocaleDateString()}] ${workNote.trim()}` : `[${new Date().toLocaleDateString()}] ${workNote.trim()}`)
        setWorkNote('')
      }
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{PLATFORM_ICONS[form.platform]}</span>
              <span style={{ fontWeight: 900, fontSize: 16 }}>{form.title || 'New Post'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && <button onClick={() => onDelete(form.id)} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}><Trash2 size={13}/> Delete</button>}
              <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#64748b' }}><X size={15}/></button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['details', 'worktime', 'results'].map(s => (
              <button key={s} onClick={() => setActiveSection(s)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: activeSection === s ? '#0f172a' : 'transparent', color: activeSection === s ? 'white' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize' }}>{s === 'worktime' ? '⏱ Work' : s === 'results' ? '📊 Results' : '📋 Details'}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {activeSection === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Post Title</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Spring Launch Carousel" style={inputStyle}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Platform</label>
                  <select value={form.platform} onChange={e => set('platform', e.target.value)} style={inputStyle}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Content Type</label>
                  <select value={form.contentType} onChange={e => set('contentType', e.target.value)} style={inputStyle}>
                    {CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Scheduled Date</label>
                  <input type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} style={inputStyle}/>
                </div>
              </div>
              {workers?.length > 0 && (
                <div>
                  <label style={labelStyle}>Assigned To</label>
                  <select value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} style={inputStyle}>
                    <option value="">Unassigned</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={labelStyle}>Caption / Copy</label>
                <textarea value={form.caption} onChange={e => set('caption', e.target.value)} placeholder="Write your post copy here..." style={{ ...inputStyle, height: 90, resize: 'none' }}/>
              </div>
              <div>
                <label style={labelStyle}>Tags</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Add tag..." style={{ ...inputStyle, flex: 1, marginBottom: 0 }}/>
                  <button onClick={addTag} style={{ background: '#0f172a', border: 'none', borderRadius: 10, padding: '0 14px', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Add</button>
                </div>
                {form.tags?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {form.tags.map(t => (
                      <span key={t} style={{ background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        #{t}
                        <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, lineHeight: 1 }}>x</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Planning Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Initial ideas, references, inspiration..." style={{ ...inputStyle, height: 60, resize: 'none' }}/>
              </div>
            </div>
          )}
          {activeSection === 'worktime' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Time summary */}
              <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 14, padding: '18px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px' }}>Total Time Tracked</p>
                  <p style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>{Math.floor(form.minutesSpent / 60)}h {(form.minutesSpent || 0) % 60}m</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px' }}>At $25/hr</p>
                  <p style={{ fontSize: 20, fontWeight: 900, color: '#10b981', margin: 0 }}>${((form.minutesSpent || 0) / 60 * 25).toFixed(2)}</p>
                </div>
              </div>

              {/* Quick add time buttons */}
              <div>
                <label style={labelStyle}>Quick Add Time</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[15, 30, 45, 60].map(m => (
                    <button key={m} onClick={() => addWorkTime(m)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+{m}m</button>
                  ))}
                </div>
              </div>

              {/* Custom time entry */}
              <div>
                <label style={labelStyle}>Custom Time Entry</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" id="customMinutes" placeholder="Minutes" style={{ ...inputStyle, flex: 1 }}/>
                  <button onClick={() => { const el = document.getElementById('customMinutes') as HTMLInputElement; addWorkTime(parseInt(el.value) || 0); el.value = ''; }} style={{ background: '#0f172a', border: 'none', borderRadius: 10, padding: '0 18px', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Add</button>
                </div>
              </div>

              {/* Work notes */}
              <div>
                <label style={labelStyle}>Work Log Note (optional)</label>
                <textarea value={workNote} onChange={e => setWorkNote(e.target.value)} placeholder="What did you work on? Design, copy, revisions..." style={{ ...inputStyle, height: 70, resize: 'none' }}/>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>This note will be timestamped and added to the notes section when you add time.</p>
              </div>

              {/* Status quick update */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px' }}>
                <label style={labelStyle}>Update Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...inputStyle, background: 'white' }} disabled={!canEditWork}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Move from Draft → Scheduled → Published as you progress.</p>
              </div>

              {/* Time history hint */}
              {form.notes && (
                <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#64748b' }}>
                  <p style={{ fontWeight: 700, margin: '0 0 6px' }}>📝 Work Notes History:</p>
                  <div style={{ maxHeight: 120, overflowY: 'auto', lineHeight: 1.6 }}>
                    {form.notes.split('\n\n').map((note, i) => (
                      <p key={i} style={{ margin: '0 0 8px', paddingBottom: 8, borderBottom: i < form.notes.split('\n\n').length - 1 ? '1px solid #e2e8f0' : 'none' }}>{note}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeSection === 'results' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(form.status === 'Draft' || form.status === 'Scheduled') && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#92400e' }}>
                  Results can be filled in once the post is <strong>Published</strong> or <strong>Results In</strong>. Update the status in Work first.
                </div>
              )}

              {/* Time investment summary */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 8px' }}>Production Investment</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>Time tracked: <strong style={{ color: '#0f172a' }}>{Math.floor(form.minutesSpent / 60)}h {(form.minutesSpent || 0) % 60}m</strong></span>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>Cost: <strong style={{ color: '#10b981' }}>${((form.minutesSpent || 0) / 60 * 25).toFixed(2)}</strong></span>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Published Date</label>
                <input type="date" value={form.publishedDate} onChange={e => set('publishedDate', e.target.value)} style={inputStyle} disabled={!canEditResults}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px' }}>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>Impressions</label>
                  <input type="number" value={form.impressions || ''} onChange={e => set('impressions', parseInt(e.target.value) || 0)} placeholder="0" style={inputStyle} disabled={!canEditResults}/>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px' }}>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>Organic Leads</label>
                  <input type="number" value={form.organicLeads || ''} onChange={e => set('organicLeads', parseInt(e.target.value) || 0)} placeholder="0" style={inputStyle} disabled={!canEditResults}/>
                </div>
              </div>
              {(form.impressions > 0 || form.organicLeads > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { label: 'CVR', value: form.impressions > 0 && form.organicLeads > 0 ? ((form.organicLeads / form.impressions) * 100).toFixed(2) + '%' : '-', color: '#6366f1' },
                    { label: 'Cost/Lead', value: form.organicLeads > 0 && form.minutesSpent > 0 ? '$' + ((form.minutesSpent / 60) * 25 / form.organicLeads).toFixed(2) : '-', color: '#f59e0b' },
                    { label: 'Impr/Hr', value: form.impressions > 0 && form.minutesSpent > 0 ? Math.round(form.impressions / (form.minutesSpent / 60)).toLocaleString() : '-', color: '#3b82f6' },
                  ].map(m => (
                    <div key={m.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 900, color: m.color, margin: '0 0 4px' }}>{m.value}</p>
                      <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>{m.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {form.organicLeads > 0 && form.minutesSpent > 0 && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 16px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 6px' }}>ROI Summary</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>Leads per hour: <strong style={{ color: '#0f172a' }}>{(form.organicLeads / (form.minutesSpent / 60)).toFixed(1)}</strong></span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>Revenue needed @ $50/lead: <strong style={{ color: '#10b981' }}>${(form.organicLeads * 50).toFixed(2)}</strong></span>
                  </div>
                </div>
              )}
              <div>
                <label style={labelStyle}>Post-publish notes / learnings</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What worked? What didn't? Key takeaways for future posts..." style={{ ...inputStyle, height: 80, resize: 'none' }} disabled={!canEditResults}/>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>These notes will be saved separately from work logs.</p>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#64748b' }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ background: '#0f172a', border: 'none', borderRadius: 10, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={15}/> Save Post
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: 'white', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#0f172a' }

interface PostsTabProps {
  workers?: Worker[]
  isAdmin?: boolean
  archiveMode?: 'actual' | 'archive'
}

const PostsTab: React.FC<PostsTabProps> = ({ workers = [], isAdmin = false, archiveMode = 'actual' }) => {
  const [posts, setPosts] = useState<Post[]>(() => {
    if (typeof window === 'undefined') return SAMPLE_POSTS
    const saved = localStorage.getItem('smm-posts')
    return saved ? JSON.parse(saved) : SAMPLE_POSTS
  })
  const [modalPost, setModalPost] = useState<Post | null>(null)
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [filterPlatform, setFilterPlatform] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({})

  const savePosts = (updated: Post[]) => {
    setPosts(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('smm-posts', JSON.stringify(updated))
    }
  }

  const openNew = () => setModalPost(blankPost())
  const openEdit = (post: Post) => setModalPost({ ...post })

  const handleSave = (post: Post) => {
    const exists = posts.find(p => p.id === post.id)
    if (exists) savePosts(posts.map(p => p.id === post.id ? post : p))
    else savePosts([post, ...posts])
    setModalPost(null)
  }

  const handleDelete = (id: string) => {
    savePosts(posts.filter(p => p.id !== id))
    setModalPost(null)
  }

  const filtered = useMemo(() => {
    let filteredPosts = posts.filter(p => {
      if (filterPlatform !== 'All' && p.platform !== filterPlatform) return false
      if (filterStatus !== 'All' && p.status !== filterStatus) return false
      return true
    })

    // Separate Results In posts from others
    const resultsInPosts = filteredPosts.filter(p => p.status === 'Results In')
    const otherPosts = filteredPosts.filter(p => p.status !== 'Results In')

    if (archiveMode === 'actual') {
      // ACTUAL: All non-Results-In posts + max 8 most recent Results In posts
      const recentResultsIn = resultsInPosts
        .sort((a, b) => new Date(b.publishedDate || b.scheduledDate).getTime() - new Date(a.publishedDate || a.scheduledDate).getTime())
        .slice(0, 8)
      filteredPosts = [...otherPosts, ...recentResultsIn]
      // Sort: Draft → Scheduled → Published → Results In
      const statusOrder: Record<string, number> = { 'Draft': 0, 'Scheduled': 1, 'Published': 2, 'Results In': 3 }
      filteredPosts.sort((a, b) => {
        const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
        if (statusDiff !== 0) return statusDiff
        return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
      })
    } else {
      // ARCHIVE: Results In posts beyond the 8 most recent
      const oldResultsIn = resultsInPosts
        .sort((a, b) => new Date(b.publishedDate || b.scheduledDate).getTime() - new Date(a.publishedDate || a.scheduledDate).getTime())
        .slice(8)
      filteredPosts = oldResultsIn
      // Sort archive by date descending (newest first)
      filteredPosts.sort((a, b) => new Date(b.publishedDate || b.scheduledDate).getTime() - new Date(a.publishedDate || a.scheduledDate).getTime())
    }

    return filteredPosts
  }, [posts, filterPlatform, filterStatus, archiveMode])

  const stats = useMemo(() => {
    const published = posts.filter(p => p.status === 'Results In')
    return {
      totalPosts: posts.length,
      published: published.length,
      totalImpressions: published.reduce((a, p) => a + (p.impressions || 0), 0),
      totalLeads: published.reduce((a, p) => a + (p.organicLeads || 0), 0),
      totalMinutes: posts.reduce((a, p) => a + (p.minutesSpent || 0), 0),
      avgCVR: published.length > 0
        ? (published.reduce((a, p) => a + (p.impressions > 0 ? p.organicLeads / p.impressions : 0), 0) / published.length * 100).toFixed(2)
        : '-',
    }
  }, [posts])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Archive banner */}
      {archiveMode === 'archive' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArchiveRestore size={20} color="#64748b"/>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Archived Posts</p>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Completed posts beyond the 8 most recent. Stats preserved.</p>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
            {filtered.length} post{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Posts', value: stats.totalPosts, color: '#0f172a' },
          { label: 'With Results', value: stats.published, color: '#16a34a' },
          { label: 'Total Impressions', value: stats.totalImpressions.toLocaleString(), color: '#3b82f6' },
          { label: 'Organic Leads', value: stats.totalLeads, color: '#10b981' },
          { label: 'Avg CVR', value: stats.avgCVR === '-' ? '-' : stats.avgCVR + '%', color: '#6366f1' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: 14, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 6px' }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={openNew} style={{ background: '#0f172a', border: 'none', borderRadius: 10, padding: '10px 18px', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15}/> New Post
        </button>
        <div style={{ display: 'flex', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          {(['board', 'list'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{ padding: '9px 14px', border: 'none', background: viewMode === mode ? '#0f172a' : 'transparent', color: viewMode === mode ? 'white' : '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{mode === 'board' ? 'Board' : 'List'}</button>
          ))}
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12, color: '#64748b' }}>
          <Filter size={13}/> Filter <ChevronDown size={12}/>
        </button>
        {showFilters && (
          <>
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer' }}>
              <option value="All">All Platforms</option>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer' }}>
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{filtered.length} posts</span>
      </div>

      {viewMode === 'board' && (() => {
        const COLUMN_CAP = 8
        const UNCAPPED = ['Draft', 'Scheduled']
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
            {STATUSES.map(status => {
              const col = filtered.filter(p => p.status === status).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
              const sc = STATUS_COLORS[status]
              const isCapped = !UNCAPPED.includes(status)
              const isExpanded = expandedCols[status]
              const visible = isCapped && !isExpanded ? col.slice(0, COLUMN_CAP) : col
              const hidden = col.length - COLUMN_CAP
              return (
                <div key={status}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '8px 12px', background: sc.bg, borderRadius: 10, border: `1px solid ${sc.border}` }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: sc.text, textTransform: 'uppercase', letterSpacing: 0.8 }}>{status}</span>
                    <span style={{ background: sc.border, color: sc.text, borderRadius: 99, fontSize: 11, fontWeight: 900, padding: '2px 8px' }}>{col.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {visible.map(post => (
                      <PostCard key={post.id} post={post} onClick={openEdit} workers={workers}/>
                    ))}
                    {col.length === 0 && (
                      <div style={{ border: '2px dashed #e2e8f0', borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}>
                        <p style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600, margin: 0 }}>No posts</p>
                      </div>
                    )}
                    {isCapped && hidden > 0 && (
                      <button onClick={() => setExpandedCols(prev => ({ ...prev, [status]: !prev[status] }))} style={{ background: 'transparent', border: `1px solid ${sc.border}`, borderRadius: 10, padding: '9px 12px', cursor: 'pointer', color: sc.text, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        {isExpanded ? 'Show less' : `+${hidden} more`}
                      </button>
                    )}
                    {status === 'Draft' && (
                      <button onClick={openNew} style={{ background: 'transparent', border: '2px dashed #e2e8f0', borderRadius: 14, padding: '12px', cursor: 'pointer', color: '#94a3b8', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                      >
                        <Plus size={14}/> Add post
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {viewMode === 'list' && (() => {
        const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const DAY_COLORS: Record<string, string> = { 'Mon': '#6366f1', 'Tue': '#3b82f6', 'Wed': '#0ea5e9', 'Thu': '#10b981', 'Fri': '#f59e0b', 'Sat': '#ef4444', 'Sun': '#8b5cf6' }
        const getWeekMonday = (dateStr: string) => {
          const d = new Date(dateStr + 'T12:00:00')
          const day = d.getDay()
          const diff = (day === 0 ? -6 : 1 - day)
          const mon = new Date(d)
          mon.setDate(d.getDate() + diff)
          return mon
        }
        const fmtWeekRange = (monday: Date) => {
          const sunday = new Date(monday)
          sunday.setDate(monday.getDate() + 6)
          const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
          return monday.toLocaleDateString('en-US', opts) + ' - ' + sunday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
        }
        const isCurrentWeek = (monday: Date) => {
          const now = new Date()
          const thisMonday = getWeekMonday(now.toISOString().split('T')[0])
          return monday.toDateString() === thisMonday.toDateString()
        }
        const weekMap: Record<string, { monday: Date, posts: Post[] }> = {}
        const sortedPosts = filtered.slice().sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
        sortedPosts.forEach(post => {
          if (!post.scheduledDate) return
          const mon = getWeekMonday(post.scheduledDate)
          const key = mon.toISOString().split('T')[0]
          if (!weekMap[key]) weekMap[key] = { monday: mon, posts: [] }
          weekMap[key].posts.push(post)
        })
        Object.values(weekMap).forEach(week => {
          week.posts.sort((a, b) => {
            const da = new Date(a.scheduledDate + 'T12:00:00').getDay()
            const db = new Date(b.scheduledDate + 'T12:00:00').getDay()
            const norm = (d: number) => d === 0 ? 7 : d
            return norm(da) - norm(db)
          })
        })
        const weeks = Object.entries(weekMap).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        if (weeks.length === 0) return (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No posts match your filters.</div>
        )
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {weeks.map(([weekKey, { monday, posts: weekPosts }]) => {
              const isCurrent = isCurrentWeek(monday)
              const weekImpressions = weekPosts.reduce((a, p) => a + (p.impressions || 0), 0)
              const weekLeads = weekPosts.reduce((a, p) => a + (p.organicLeads || 0), 0)
              const weekMins = weekPosts.reduce((a, p) => a + (p.minutesSpent || 0), 0)
              return (
                <div key={weekKey}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isCurrent && (<span style={{ background: '#0f172a', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: 0.8 }}>This Week</span>)}
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{fmtWeekRange(monday)}</span>
                    </div>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{weekPosts.length} post{weekPosts.length !== 1 ? 's' : ''}</span>
                      {weekImpressions > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>{weekImpressions.toLocaleString()} views</span>}
                      {weekLeads > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>{weekLeads} leads</span>}
                      {weekMins > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{Math.floor(weekMins/60)}h {weekMins%60}m</span>}
                    </div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Day', 'Post', 'Platform', 'Type', 'Status', 'Impressions', 'Leads', 'Time', ''].map(h => (
                            <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {weekPosts.map((post, i) => {
                          const sc = STATUS_COLORS[post.status]
                          const d = new Date(post.scheduledDate + 'T12:00:00')
                          const dayName = DAYS[d.getDay()]
                          const dayNum = d.getDate()
                          const dayColor = DAY_COLORS[dayName]
                          const isToday = new Date().toDateString() === d.toDateString()
                          return (
                            <tr key={post.id} onClick={() => openEdit(post)} style={{ borderTop: i === 0 ? 'none' : '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '10px 14px', width: 64 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: isToday ? dayColor : dayColor + '15', border: isToday ? '2px solid ' + dayColor : '1px solid ' + dayColor + '30' }}>
                                  <span style={{ fontSize: 9, fontWeight: 800, color: isToday ? 'white' : dayColor, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1 }}>{dayName}</span>
                                  <span style={{ fontSize: 16, fontWeight: 900, color: isToday ? 'white' : dayColor, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{dayNum}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 3, height: 28, borderRadius: 99, background: PLATFORM_COLORS[post.platform], flexShrink: 0 }} />
                                  <div>
                                    <p style={{ fontWeight: 700, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{post.title || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Untitled</span>}</p>
                                    {post.caption && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{post.caption}</p>}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                                <span style={{ color: PLATFORM_COLORS[post.platform], fontWeight: 700 }}>{PLATFORM_ICONS[post.platform]}</span>
                                <span style={{ color: '#475569', marginLeft: 5, fontWeight: 600 }}>{post.platform}</span>
                              </td>
                              <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{post.contentType}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text, border: '1px solid ' + sc.border, borderRadius: 99, padding: '3px 9px', whiteSpace: 'nowrap' }}>{post.status}</span>
                              </td>
                              <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: post.impressions > 0 ? '#3b82f6' : '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{post.impressions > 0 ? post.impressions.toLocaleString() : '-'}</td>
                              <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: post.organicLeads > 0 ? '#10b981' : '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{post.organicLeads > 0 ? post.organicLeads : '-'}</td>
                              <td style={{ padding: '10px 14px', fontSize: 12, color: post.minutesSpent > 0 ? '#64748b' : '#cbd5e1', fontWeight: 600, whiteSpace: 'nowrap' }}>{post.minutesSpent > 0 ? Math.floor(post.minutesSpent/60) + 'h ' + (post.minutesSpent%60) + 'm' : '-'}</td>
                              <td style={{ padding: '10px 14px' }}><ChevronRight size={13} color="#cbd5e1" /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {modalPost && (
        <PostModal post={modalPost} onSave={handleSave} onDelete={handleDelete} onClose={() => setModalPost(null)} workers={workers} isAdmin={isAdmin} />
      )}
    </div>
  )
}

export default PostsTab
