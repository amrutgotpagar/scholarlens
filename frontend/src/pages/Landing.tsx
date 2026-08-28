import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  FileSearch,
  Gauge,
  GitMerge,
  MessageSquareQuote,
  Quote,
  Sparkles,
  Upload,
} from 'lucide-react'
import { AnimatedNav } from '../components/AnimatedNav'
import { AnimatedStat } from '../components/AnimatedStat'
import { CornerFrame } from '../components/CornerFrame'
import { DocumentStack3D } from '../components/DocumentStack3D'
import { Footer } from '../components/Footer'
import { RetrievalGraph3D } from '../components/RetrievalGraph3D'
import { RevealHeading } from '../components/RevealHeading'
import { ScrollScrubber } from '../components/ScrollScrubber'
import { TiltCard } from '../components/TiltCard'
import { LiquidButton } from '../components/ui/liquid-button'
import { MetalButton } from '../components/ui/metal-button'

const PAPERS = [
  'Attention Is All You Need',
  'BERT: Pre-training of Deep Bidirectional Transformers',
  'Deep Residual Learning for Image Recognition',
  'Generative Adversarial Networks',
]

const STATS = [
  { value: '100%', label: 'retrieval precision', hint: '29/29 questions' },
  { value: '100%', label: 'answer accuracy', hint: 'LLM-judged vs. reference' },
  { value: '4', label: 'papers eval-tested', hint: 'Transformer, BERT, ResNet, GANs' },
  { value: '$0', label: 'cost to run', hint: 'free-tier providers only' },
]

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Hybrid retrieval',
    body: 'Vector similarity and BM25 keyword search, fused with reciprocal rank fusion — so a precise term match and a semantic match both surface, not just one.',
  },
  {
    icon: Quote,
    title: 'Answers you can check',
    body: 'Every claim streams in token by token alongside the exact page it came from. No citation, no claim — the model is grounded to what you uploaded.',
  },
  {
    icon: Gauge,
    title: 'Measured, not assumed',
    body: 'Retrieval precision, answer correctness, and latency are tracked against a hand-written eval set with an LLM-as-judge harness — quality is a number, not a vibe.',
  },
]

const FLOW = [
  { icon: Upload, title: 'Upload', body: 'A PDF from arXiv, chunked and embedded in seconds.' },
  { icon: GitMerge, title: 'Hybrid retrieve', body: 'Vector + BM25 candidates, fused by reciprocal rank.' },
  { icon: MessageSquareQuote, title: 'Cite', body: 'Every passage traced back to its exact page.' },
  { icon: Sparkles, title: 'Stream', body: 'The grounded answer arrives token by token.' },
]

export default function Landing() {
  const scrubContainerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: scrubContainerRef,
    offset: ['start start', 'end end'],
  })

  const titleOpacity = useTransform(scrollYProgress, [0, 0.1, 0.62, 0.74], [0, 1, 1, 0])
  const titleY = useTransform(scrollYProgress, [0, 0.1], [24, 0])
  const subtitleOpacity = useTransform(scrollYProgress, [0.08, 0.18, 0.62, 0.74], [0, 1, 1, 0])
  const frameOpacity = useTransform(scrollYProgress, [0, 0.06, 0.96, 1], [0, 1, 1, 0])

  return (
    <div className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <AnimatedNav />

      {/* Scroll-scrubbed hero: a pen underlining text, one frame per scroll tick.
          The CTA only appears once the underline actually finishes, so "underline
          what matters" and the reveal land on the same beat. */}
      <ScrollScrubber containerRef={scrubContainerRef} scrollHeight={3}>
        <motion.div style={{ opacity: frameOpacity }}>
          <CornerFrame color="rgba(255,255,255,0.55)" size={22} inset={28} alwaysOn />
        </motion.div>
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 text-center sm:px-10">
          <motion.h1
            style={{ opacity: titleOpacity, y: titleY }}
            className="font-serif text-4xl leading-[1.1] font-semibold text-white text-shadow-lg sm:text-6xl md:text-7xl"
          >
            Underline what matters.
          </motion.h1>
          <motion.p
            style={{ opacity: subtitleOpacity }}
            className="mx-auto mt-5 max-w-xl text-base text-white/80 sm:text-lg"
          >
            Ask grounded, cited questions across your arXiv papers — hybrid retrieval, streamed
            answers, real citations.
          </motion.p>
        </div>
      </ScrollScrubber>

      {/* Proof strip — real numbers from the eval harness, not marketing copy. */}
      <section className="border-b border-slate-200 bg-slate-900 dark:border-slate-800">
        <div className="premium-bg mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 pt-12 pb-8 sm:grid-cols-4 sm:px-10">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-center sm:text-left"
            >
              <AnimatedStat value={s.value} className="font-serif text-3xl text-white sm:text-4xl" />
              <div className="mt-1 text-xs font-medium text-white/70">{s.label}</div>
              <div className="text-[11px] text-white/35">{s.hint}</div>
            </motion.div>
          ))}
        </div>
        {/* A quiet ticker of the real papers behind those numbers. */}
        <div className="relative overflow-hidden border-t border-white/5 py-3">
          <div className="animate-marquee flex w-max gap-10 text-[11px] tracking-wide text-white/30">
            {[...PAPERS, ...PAPERS].map((p, i) => (
              <span key={i} className="whitespace-nowrap">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards, tilting in 3D toward the cursor. */}
      <section className="premium-bg mx-auto max-w-6xl px-6 py-24 sm:px-10 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-xs font-medium tracking-[0.2em] text-indigo-500 uppercase dark:text-indigo-400">
            Why it's grounded
          </span>
          <RevealHeading
            text="Built so the model can't make things up."
            className="mt-3 font-serif text-3xl font-semibold sm:text-4xl"
          />
        </motion.div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <TiltCard className="h-full">
                <div className="flex h-full flex-col p-7">
                  <div
                    className="animate-icon-float flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  >
                    <f.icon size={18} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {f.body}
                  </p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* The embedding index as a 3D node graph — a real visual for what "hybrid
          retrieval" means, not just an icon. WebGL only mounts once scrolled into
          view and idles when out of it, kept well away from the hero's own canvas. */}
      <section className="border-y border-slate-200 bg-slate-900 py-24 sm:py-32 dark:border-slate-800">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 sm:px-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-medium tracking-[0.2em] text-indigo-400 uppercase">
              A living index
            </span>
            <RevealHeading
              text="Every chunk is a point in space."
              className="mt-3 font-serif text-3xl font-semibold text-white sm:text-4xl"
            />
            <p className="mt-4 max-w-md text-slate-400">
              Each passage of your paper becomes an embedding — a point positioned by meaning,
              not just keywords. When you ask a question, ScholarLens finds the nearest points
              in that space, then double-checks against BM25's exact-term matches before either
              one gets to answer alone.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="mx-auto w-full max-w-sm"
          >
            <RetrievalGraph3D />
          </motion.div>
        </div>
      </section>

      {/* Under the hood — the request -> answer pipeline as a connected flow. */}
      <section className="border-y border-slate-200 bg-white py-24 sm:py-32 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <span className="text-xs font-medium tracking-[0.2em] text-indigo-500 uppercase dark:text-indigo-400">
              Under the hood
            </span>
            <RevealHeading
              text="One question, four honest steps."
              className="mt-3 font-serif text-3xl font-semibold sm:text-4xl"
            />
          </motion.div>

          <div className="relative mt-16 grid gap-10 sm:grid-cols-4">
            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'left' }}
              className="absolute top-6 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent sm:block dark:via-indigo-500/20"
            />
            {FLOW.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                <div
                  className="animate-icon-float flex h-12 w-12 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-sm dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-400"
                  style={{ animationDelay: `${i * 0.25}s` }}
                >
                  <s.icon size={18} />
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — the document stack visual gives "upload a paper" something to look at. */}
      <section className="relative overflow-hidden bg-slate-950 px-6 py-24 sm:px-10 sm:py-32">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 800px 500px at 15% 20%, rgba(99,102,241,0.25), transparent 60%), radial-gradient(ellipse 600px 500px at 90% 80%, rgba(167,139,250,0.18), transparent 55%), radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: 'auto, auto, 22px 22px',
          }}
        />
        <div className="relative mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1fr_auto] lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
          <RevealHeading
            text="Your papers are full of answers."
            className="font-serif text-3xl font-semibold text-white sm:text-5xl"
          />
          <p className="mx-auto mt-4 max-w-md text-slate-400 lg:mx-0">
            Upload one and ask it something you'd normally have to skim ten pages to find.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <MetalButton asChild variant="primary">
              <Link to="/app">
                Open ScholarLens
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </MetalButton>
            <LiquidButton
              asChild
              variant="light"
              className="border border-white/10 bg-white/5 font-semibold text-white backdrop-blur-sm"
            >
              <Link to="/sign-up">Create an account</Link>
            </LiquidButton>
          </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto hidden w-48 shrink-0 sm:block"
          >
            <DocumentStack3D />
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
