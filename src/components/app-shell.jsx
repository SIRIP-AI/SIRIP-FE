import { useEffect, useRef, useState } from 'react'
import {
  Boxes,
  Blocks,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Route,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard, path: '/' },
  { label: 'Batches', icon: Boxes },
  { label: 'Plan', icon: Route },
  { label: 'Resources', icon: Blocks, path: '/resources' },
]

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
        {navigation.map(({ label, icon: Icon, path }) => path ? (
          <NavLink key={label} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} end={path === '/'} to={path} onClick={onClose}>
            <Icon size={19} />{label}
          </NavLink>
        ) : (
          <span key={label} className="nav-item nav-item-disabled" aria-disabled="true"><Icon size={19} />{label}</span>
        ))}
      </nav>

      <div className="operator-card">
        <span className="avatar">AR</span>
        <div><strong>Adi Rahman</strong><span>Operations coordinator</span></div>
      </div>
    </aside>
  )
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 780px)').matches)
  const closeButtonRef = useRef(null)
  const menuButtonRef = useRef(null)
  const sidebarWasOpen = useRef(false)
  const location = useLocation()
  const title = location.pathname === '/resources' ? 'Resources' : 'Overview'

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

      <main className="main-content" inert={isMobile && sidebarOpen ? true : undefined}>
        <header className="mobile-header">
          <button ref={menuButtonRef} className="icon-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" aria-expanded={sidebarOpen}><Menu size={20} /></button>
          <strong>{title}</strong>
          <a className="icon-button" href="https://wa.me/" target="_blank" rel="noreferrer" aria-label="Open WhatsApp"><MessageCircle size={19} /></a>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
