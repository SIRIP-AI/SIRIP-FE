import { useEffect, useRef, useState } from 'react'
import {
  Boxes,
  Ship,
  Blocks,
  Menu,
  MessageCircle,
  Route,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button.jsx'
import { cn } from '@/lib/utils.js'

const navigation = [
  { label: 'Resources', icon: Blocks, path: '/resources' },
  { label: 'Fishing Trips', icon: Ship, path: '/fishing-trips' },
  { label: 'Batches', icon: Boxes, path: '/batches' },
  { label: 'Plans', icon: Route, path: '/plans' },
]

function Sidebar({ isMobile, open, closeButtonRef, onClose }) {
  return (
    <aside
      className={cn('fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-card px-4 pt-6 pb-[18px] max-[780px]:w-[min(86vw,300px)] max-[780px]:-translate-x-[102%] max-[780px]:shadow-[18px_0_55px_rgb(2_40_88_/_16%)] max-[780px]:transition-transform max-[780px]:duration-[250ms]', open && 'max-[780px]:translate-x-0')}
      aria-label="Primary navigation"
      aria-hidden={isMobile && !open}
      inert={isMobile && !open ? true : undefined}
    >
      <div className="flex items-center gap-[11px] px-2 pb-[30px]">
        <img className="block h-auto w-[116px]" src="/logo/sirip-color.png" alt="SIRIP" />
        <Button ref={closeButtonRef} className="ml-auto hidden max-[780px]:inline-flex" variant="outline" size="icon" type="button" onClick={onClose} aria-label="Close sidebar"><X size={20} /></Button>
      </div>

      <nav className="flex flex-col gap-1">
        {navigation.map(({ label, icon: Icon, path }) => path ? (
          <NavLink key={label} className={({ isActive }) => cn('flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-[520] text-slate-600 no-underline transition-colors hover:bg-slate-100 hover:text-foreground', isActive && 'bg-primary/10 text-primary')} end={path === '/'} to={path} onClick={onClose}>
            <Icon size={19} />{label}
          </NavLink>
        ) : (
          <span key={label} className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-sm font-[520] text-slate-600 opacity-[.58]" aria-disabled="true"><Icon size={19} />{label}</span>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-border px-2 pt-3">
        <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-bold text-white">AR</span>
        <div><strong className="block text-xs">Adi Rahman</strong><span className="mt-0.5 block text-[11px] text-muted-foreground">Operations coordinator</span></div>
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
  const title = location.pathname === '/resources' ? 'Resources' : location.pathname === '/fishing-trips' ? 'Fishing Trips' : location.pathname === '/batches' ? 'Batches' : location.pathname.startsWith('/plans') ? 'Plans' : 'SIRIP'

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
    <div className="min-h-screen">
      <Sidebar isMobile={isMobile} open={sidebarOpen} closeButtonRef={closeButtonRef} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="fixed inset-0 z-30 hidden h-full w-full border-0 bg-foreground/40 p-0 max-[780px]:block" type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />}

      <main className="ml-60 min-h-screen max-[780px]:ml-0" inert={isMobile && sidebarOpen ? true : undefined}>
        <header className="hidden max-[780px]:sticky max-[780px]:top-0 max-[780px]:z-20 max-[780px]:flex max-[780px]:h-[62px] max-[780px]:items-center max-[780px]:justify-between max-[780px]:border-b max-[780px]:border-border max-[780px]:bg-white/95 max-[780px]:px-4 max-[780px]:backdrop-blur-[10px]">
          <Button ref={menuButtonRef} variant="outline" size="icon" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" aria-expanded={sidebarOpen}><Menu size={20} /></Button>
          <strong className="text-sm">{title}</strong>
          <Button variant="outline" size="icon" asChild><a href="https://wa.me/" target="_blank" rel="noreferrer" aria-label="Open WhatsApp"><MessageCircle size={19} /></a></Button>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
