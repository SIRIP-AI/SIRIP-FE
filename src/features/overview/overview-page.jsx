import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  Check,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Route,
  Settings2,
  X,
} from 'lucide-react'

import { Appear } from '@/components/appear.jsx'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Batches', icon: Boxes },
  { label: 'Plan', icon: Route },
  { label: 'Setup', icon: Settings2 },
]

const batches = [
  { id: 'B-017', temp: '8.0°C', window: '4.2 days', sensor: 'S-003', status: 'Warning', tone: 'warning' },
  { id: 'B-021', temp: '2.8°C', window: '7.6 days', sensor: 'S-005', status: 'Normal', tone: 'healthy' },
  { id: 'B-024', temp: '1.9°C', window: '9.1 days', sensor: 'S-008', status: 'Normal', tone: 'healthy' },
]

const steps = [
  { time: '09:00', action: 'Store B-017 in Cold Room 1', complete: true },
  { time: '10:30', action: 'Load B-017 into TR-01', next: true },
  { time: '11:00', action: 'Dispatch B-017 to Processor B' },
]

function StatusBadge({ tone, children }) {
  return <span className={`status-badge status-${tone}`}><span className="status-dot" />{children}</span>
}

function Sidebar({ isMobile, open, closeButtonRef, onClose }) {
  return (
    <aside
      className={`sidebar ${open ? 'sidebar-open' : ''}`}
      aria-label="Primary navigation"
      aria-hidden={isMobile && !open}
      inert={isMobile && !open ? true : undefined}
    >
      <div className="brand-row">
        <img className="brand-logo" src="/logo/sirip-color.png" alt="SIRIP" />
        <button ref={closeButtonRef} className="icon-button sidebar-close" type="button" onClick={onClose} aria-label="Close sidebar"><X size={20} /></button>
      </div>

      <nav className="nav-list">
        {navigation.map(({ label, icon: Icon, active }) => (
          <a key={label} className={active ? 'nav-item active' : 'nav-item'} href={active ? '#overview' : `#${label.toLowerCase()}`} onClick={onClose}>
            <Icon size={19} />{label}
          </a>
        ))}
      </nav>

      <div className="operator-card">
        <span className="avatar">AR</span>
        <div><strong>Adi Rahman</strong><span>Operations coordinator</span></div>
      </div>
    </aside>
  )
}

export function OverviewPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 780px)').matches)
  const closeButtonRef = useRef(null)
  const menuButtonRef = useRef(null)
  const sidebarWasOpen = useRef(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 780px)')
    const update = () => setIsMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!sidebarOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false)
      if (event.key !== 'Tab') return
      const sidebar = closeButtonRef.current?.closest('aside')
      const focusable = [...(sidebar?.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])') ?? [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [sidebarOpen])

  useEffect(() => {
    let startX = 0
    let startY = 0
    let tracking = false
    const onPointerDown = (event) => {
      tracking = isMobile && !sidebarOpen && event.clientX <= 28
      startX = event.clientX
      startY = event.clientY
    }
    const onPointerUp = (event) => {
      if (tracking && event.clientX - startX > 72 && Math.abs(event.clientY - startY) < 55) setSidebarOpen(true)
      tracking = false
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isMobile, sidebarOpen])

  useEffect(() => {
    if (sidebarWasOpen.current && !sidebarOpen) menuButtonRef.current?.focus()
    sidebarWasOpen.current = sidebarOpen
  }, [sidebarOpen])

  return (
    <div className="app-shell">
      <Sidebar isMobile={isMobile} open={sidebarOpen} closeButtonRef={closeButtonRef} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />}

      <main className="main-content" id="overview" inert={isMobile && sidebarOpen ? true : undefined}>
        <header className="mobile-header">
          <button ref={menuButtonRef} className="icon-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" aria-expanded={sidebarOpen}><Menu size={20} /></button>
          <strong>Overview</strong>
          <a className="icon-button" href="https://wa.me/" target="_blank" rel="noreferrer" aria-label="Open WhatsApp"><MessageCircle size={19} /></a>
        </header>

        <div className="dashboard">
          <div className="page-heading">
            <div><h1>Overview</h1><p>Tanjung Perak · Friday, 14 August</p></div>
            <div className="live-state"><span />Live · 14 sec ago</div>
          </div>

          <Appear as="section" className="summary-strip" aria-label="Operation summary">
            <div><span>Active batches</span><strong>8</strong></div>
            <div className="summary-warning"><span>At risk</span><strong>2</strong></div>
            <div className="summary-critical"><span>Active alerts</span><strong>1</strong></div>
            <div><span>Active plan</span><strong>V3</strong></div>
          </Appear>

          <div className="overview-grid">
            <Appear as="section" className="panel batch-panel" delay={0.08}>
              <div className="panel-header"><h2>Batch priority</h2><span>Quality window</span></div>
              <div className="batch-table" role="table" aria-label="Active batches by priority">
                <div className="table-head" role="row"><span>Batch</span><span>Temperature</span><span>Remaining</span><span>Status</span></div>
                {batches.map((batch) => (
                  <div className="batch-row" role="row" key={batch.id}>
                    <div><strong>{batch.id}</strong><span>{batch.sensor} · Online</span></div>
                    <strong>{batch.temp}</strong>
                    <strong className={batch.tone === 'warning' ? 'warning-text' : ''}>{batch.window}</strong>
                    <StatusBadge tone={batch.tone}>{batch.status}</StatusBadge>
                  </div>
                ))}
              </div>
            </Appear>

            <Appear as="section" className="panel plan-panel" delay={0.14}>
              <div className="panel-header"><h2>Active plan · V3</h2><StatusBadge tone="healthy">Active</StatusBadge></div>
              <p className="plan-reason"><strong>B-017 first:</strong> reduced quality margin after a temperature excursion.</p>
              <ol className="timeline">
                {steps.map((step) => (
                  <li className={step.complete ? 'complete' : step.next ? 'next' : ''} key={step.time}>
                    <span className="timeline-marker">{step.complete && <Check size={13} />}</span>
                    <time>{step.time}</time>
                    <strong>{step.action}</strong>
                    {step.next && <span className="next-label">Next</span>}
                  </li>
                ))}
              </ol>
            </Appear>
          </div>

          <Appear as="section" className="alert-bar" delay={0.2}>
            <AlertTriangle size={20} aria-hidden="true" />
            <div><strong>B-017 temperature excursion</strong><span>8.0°C for 42 min · 4.2 days remaining · 10:08</span></div>
            <StatusBadge tone="critical">Critical</StatusBadge>
            <a className="button button-primary" href="https://wa.me/" target="_blank" rel="noreferrer"><MessageCircle size={17} />Open WhatsApp</a>
          </Appear>

          <p className="quality-disclaimer">Quality windows are operational estimates, not food-safety certification.</p>
        </div>
      </main>
    </div>
  )
}
