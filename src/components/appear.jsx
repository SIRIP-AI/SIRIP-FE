import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

export function Appear({ as: Component = 'div', children, className = '', delay = 0, stagger, ...props }) {
  const elementRef = useRef(null)

  useLayoutEffect(() => {
    const element = elementRef.current
    if (!element) return

    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const targets = stagger ? element.querySelectorAll(stagger) : element
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.45, delay, stagger: stagger ? 0.055 : 0, ease: 'power2.out', clearProps: 'opacity,visibility,transform' },
      )
    }, element)

    return () => media.revert()
  }, [delay, stagger])

  return (
    <Component ref={elementRef} className={className} {...props}>
      {children}
    </Component>
  )
}
