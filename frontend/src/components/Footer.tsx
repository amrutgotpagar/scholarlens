import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUp, Sparkles } from 'lucide-react'

const NAV_LINKS = [
  { title: 'Home', href: '/' },
  { title: 'Sign in', href: '/sign-in' },
  { title: 'Sign up', href: '/sign-up' },
  { title: 'Open app', href: '/app' },
]

function AnimatedContainer({ delay = 0.1, children }: { delay?: number; children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion()
  if (shouldReduceMotion) return <>{children}</>

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', y: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
    >
      {children}
    </motion.div>
  )
}

/** A "sticky reveal" footer — pinned at the viewport bottom via a negative sticky
 * offset so it slides up from underneath the page instead of just appearing at
 * the end of the scroll, same technique as RFE's StickyFooter. */
export function Footer() {
  return (
    <footer className="relative h-[520px] w-full" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}>
      <div className="fixed bottom-0 h-[520px] w-full">
        <div className="sticky top-[calc(100vh-520px)] h-full overflow-y-auto bg-slate-950">
          <div className="relative flex size-full flex-col justify-between gap-5 overflow-hidden border-t border-white/[0.06] px-6 py-14 md:px-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
              <div className="absolute top-[-160px] left-1/4 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.14)_0%,transparent_70%)] blur-3xl" />
              <div className="absolute right-0 bottom-0 h-[360px] w-[360px] translate-x-1/4 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.14)_0%,transparent_70%)] blur-3xl" />
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.35), transparent)' }}
              />
              <span
                aria-hidden
                className="absolute bottom-[-40px] left-1/2 hidden -translate-x-1/2 text-[11vw] leading-none font-semibold tracking-tight text-white/[0.03] select-none md:block"
              >
                SCHOLARLENS
              </span>
            </div>

            <div className="relative z-10 mx-auto mt-6 flex w-full max-w-5xl flex-col gap-14 md:flex-row md:justify-between">
              <AnimatedContainer delay={0}>
                <div className="max-w-sm space-y-4">
                  <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-white">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 shadow-md shadow-indigo-500/30">
                      <Sparkles size={16} />
                    </span>
                    ScholarLens
                  </Link>
                  <p className="text-sm leading-relaxed text-white/45">
                    Grounded, cited Q&amp;A over your arXiv papers — hybrid retrieval, streamed
                    answers, evaluated against a hand-graded set, not just claimed.
                  </p>
                </div>
              </AnimatedContainer>

              <AnimatedContainer delay={0.15}>
                <div className="w-40">
                  <h3 className="text-xs tracking-[0.25em] text-indigo-300/70 uppercase">Navigate</h3>
                  <ul className="mt-5 space-y-3 text-sm text-white/55">
                    {NAV_LINKS.map((link) => (
                      <li key={link.title}>
                        <Link
                          to={link.href}
                          className="group/link inline-flex items-center transition-colors duration-300 hover:text-white"
                        >
                          <span className="mr-0 max-w-0 overflow-hidden text-indigo-300 opacity-0 whitespace-nowrap transition-all duration-300 group-hover/link:mr-1.5 group-hover/link:max-w-[1em] group-hover/link:opacity-100">
                            →
                          </span>
                          {link.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedContainer>
            </div>

            <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-white/35 md:flex-row">
              <p className="tracking-wide">© {new Date().getFullYear()} ScholarLens.</p>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="group/top inline-flex items-center gap-1.5 tracking-[0.2em] text-white/35 uppercase transition-colors duration-300 hover:text-white"
              >
                Back to top
                <ArrowUp size={12} className="transition-transform duration-300 group-hover/top:-translate-y-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
