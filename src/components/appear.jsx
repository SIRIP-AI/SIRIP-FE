import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function Appear({ as: Component = 'div', children, className = '', delay = 0, ...props }) {
  const elementRef = useRef(null)

  useEffect(() => {
    const element = elementRef.current
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!element || reduceMotion) return

    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.55, delay, ease: 'power2.out', clearProps: 'all' },
      )
    }, element)

    return () => context.revert()
  }, [delay])

  return (
    <Component ref={elementRef} className={className} {...props}>
      {children}
    </Component>
  )
}
