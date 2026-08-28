import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Menu, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../lib/utils'

const EXPAND_SCROLL_THRESHOLD = 80

/** A pill nav that collapses to a plain circle on scroll-down and expands back on
 * scroll-up past a threshold — state only changes at those two crossings, not on
 * every scroll tick, so it stays cheap even sitting above the hero's own canvas.
 * Uses a plain window scroll listener (not framer-motion's useScroll, which needs
 * a real native 'scroll' DOM event some programmatic-scroll paths don't fire) and
 * plain CSS transitions for the collapse/expand content swap — framer-motion's
 * AnimatePresence + layout combination here proved unreliable in testing (child
 * enter animations repeatedly got stuck at their initial pre-animation values),
 * so only the one-off mount fade-in — which was reliable in every test — still
 * uses it. */
export function AnimatedNav() {
  const [isExpanded, setExpanded] = useState(true)
  const lastScrollY = useRef(0)
  const scrollPositionOnCollapse = useRef(0)
  const isExpandedRef = useRef(isExpanded)
  const { user } = useAuth()

  useEffect(() => {
    isExpandedRef.current = isExpanded
  }, [isExpanded])

  useEffect(() => {
    const onScroll = () => {
      const latest = window.scrollY
      const previous = lastScrollY.current
      if (isExpandedRef.current && latest > previous && latest > 150) {
        setExpanded(false)
        scrollPositionOnCollapse.current = latest
      } else if (
        !isExpandedRef.current &&
        latest < previous &&
        scrollPositionOnCollapse.current - latest > EXPAND_SCROLL_THRESHOLD
      ) {
        setExpanded(true)
      }
      lastScrollY.current = latest
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleNavClick = () => {
    if (!isExpanded) setExpanded(true)
  }

  const navItems = user
    ? [{ name: 'Open app', href: '/app' }]
    : [
        { name: 'Sign in', href: '/sign-in' },
        { name: 'Sign up', href: '/sign-up' },
        { name: 'Open app', href: '/app' },
      ]

  return (
    <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2">
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={handleNavClick}
        className={cn(
          'flex h-12 items-center overflow-hidden rounded-full border border-white/10 bg-slate-950/80 shadow-lg backdrop-blur-sm transition-[width] duration-300 ease-out',
          isExpanded ? 'w-auto px-1' : 'w-12 cursor-pointer justify-center hover:scale-110 active:scale-95',
        )}
      >
        <div
          className={cn(
            'flex items-center overflow-hidden transition-opacity duration-200',
            isExpanded ? 'opacity-100 delay-150' : 'pointer-events-none w-0 opacity-0',
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/30">
            <Sparkles size={12} />
          </span>
          <div className="flex items-center gap-1 pr-3 pl-2 whitespace-nowrap sm:gap-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1 text-sm font-medium whitespace-nowrap text-white/75 transition-colors hover:text-white"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div
          className={cn(
            'flex items-center justify-center transition-opacity duration-200',
            isExpanded ? 'w-0 opacity-0' : 'opacity-100 delay-150',
          )}
        >
          <Menu size={20} className="text-white" />
        </div>
      </motion.nav>
    </div>
  )
}
