import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { GoogleIcon } from '../components/GoogleIcon'
import { Logomark } from '../components/Logomark'
import { MetalButton } from '../components/ui/metal-button'
import { supabase } from '../lib/supabaseClient'

interface Props {
  mode: 'sign-in' | 'sign-up'
}

const STATS = [
  { value: '100%', label: 'retrieval precision' },
  { value: '29', label: 'hand-graded eval questions' },
  { value: '$0', label: 'cost, free-tier providers' },
]

export default function AuthPage({ mode }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const isSignIn = mode === 'sign-in'
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/app'

  const handleGoogleSignIn = async () => {
    setError(null)
    setGoogleLoading(true)
    // Full-page redirect to Google and back — unlike email/password this can't resolve
    // in-place, so there's no local navigate() on success; Supabase lands the user back
    // at redirectTo with the session already established, and AuthProvider picks it up.
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    })
    if (authError) {
      setError(authError.message)
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isSignIn) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        navigate(redirectTo, { replace: true })
      } else {
        const { data, error: authError } = await supabase.auth.signUp({ email, password })
        if (authError) throw authError
        // A confirmed-emails-required project returns a user but no session until the
        // link is clicked; a project with confirmation off returns a session immediately.
        if (data.session) {
          navigate(redirectTo, { replace: true })
        } else {
          setCheckEmail(true)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="premium-bg flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Branding panel */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white lg:flex">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 15%, rgba(129,140,248,0.35), transparent 55%), radial-gradient(circle at 85% 85%, rgba(167,139,250,0.25), transparent 50%), radial-gradient(circle, rgba(255,255,255,0.14) 1px, transparent 1px)',
            backgroundSize: 'auto, auto, 22px 22px',
          }}
        />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"
        />
        <Link to="/" className="relative z-10 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logomark size={28} className="shadow-md shadow-indigo-500/30" />
          ScholarLens
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <p className="font-serif text-3xl leading-snug text-white/95">
            "Underline what matters, let the model do the skimming."
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-serif text-2xl text-white">{s.value}</div>
                <div className="mt-1 text-xs leading-tight text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-xs text-white/40">
          Hybrid retrieval &middot; streamed citations &middot; measured, not assumed.
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 520px 360px at 50% 0%, rgba(99,102,241,0.08), transparent 60%)',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative w-full max-w-sm"
        >
          <Link
            to="/"
            className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 lg:hidden dark:text-white"
          >
            <Logomark size={28} className="shadow-md shadow-indigo-500/30" />
            ScholarLens
          </Link>

          <div className="rounded-[calc(1.5rem+1px)] bg-gradient-to-br from-indigo-200/70 via-white/40 to-violet-200/70 p-px shadow-xl shadow-slate-900/[0.06] dark:from-indigo-500/25 dark:via-white/5 dark:to-violet-500/20 dark:shadow-black/30">
          <div className="rounded-3xl bg-white/90 p-8 backdrop-blur-xl dark:bg-slate-900/80">
            <h1 className="font-serif text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">
              {isSignIn ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isSignIn
                ? 'Sign in to pick up where you left off.'
                : 'A few seconds, then straight to your papers.'}
            </p>

            {checkEmail ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200"
              >
                <p className="font-medium">Check your inbox.</p>
                <p className="mt-1 text-indigo-700/80 dark:text-indigo-300/70">
                  We sent a confirmation link to {email}. Click it, then sign in.
                </p>
              </motion.div>
            ) : (
              <>
                <MetalButton
                  type="button"
                  variant="primary"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                  className="mt-8 w-full"
                >
                  <GoogleIcon size={16} />
                  {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                </MetalButton>

                <div className="my-7 flex items-center gap-3">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-800" />
                  <span className="text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                    or
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-800" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                      {error}
                    </div>
                  )}
                  <div>
                    <label htmlFor="email" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Email
                    </label>
                    <div className="relative mt-1.5">
                      <Mail
                        size={16}
                        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                      />
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@university.edu"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="password" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Password
                    </label>
                    <div className="relative mt-1.5">
                      <Lock
                        size={16}
                        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                      />
                      <input
                        id="password"
                        type="password"
                        required
                        minLength={6}
                        autoComplete={isSignIn ? 'current-password' : 'new-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                  <MetalButton
                    type="submit"
                    variant="muted"
                    disabled={loading}
                    className="group mt-2 w-full"
                  >
                    {loading ? 'Please wait…' : isSignIn ? 'Sign in' : 'Create account'}
                    {!loading && (
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                    )}
                  </MetalButton>
                </form>
              </>
            )}
          </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
            <Link
              to={isSignIn ? '/sign-up' : '/sign-in'}
              className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {isSignIn ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
