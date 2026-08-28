import { motion } from 'framer-motion'

interface Props {
  text: string
  className?: string
  as?: 'h1' | 'h2' | 'h3'
  delay?: number
}

const container = {
  hidden: {},
  visible: (delay: number) => ({ transition: { staggerChildren: 0.045, delayChildren: delay } }),
}

const word = {
  hidden: { opacity: 0, y: '0.4em' },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
}

/** Splits a heading into words and reveals them with a stagger once scrolled
 * into view — a one-shot animation, not scroll-linked, so it costs nothing
 * once it has played. */
export function RevealHeading({ text, className = '', as = 'h2', delay = 0 }: Props) {
  const Tag = motion[as]
  const words = text.split(' ')

  return (
    <Tag
      className={`${className} overflow-hidden`}
      variants={container}
      custom={delay}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-top">
          <motion.span variants={word} className="inline-block">
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
