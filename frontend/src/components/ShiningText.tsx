import { motion } from 'framer-motion'

interface Props {
  text: string
}

export function ShiningText({ text }: Props) {
  return (
    <motion.span
      className="bg-[linear-gradient(110deg,#94a3b8,35%,#4f46e5,50%,#94a3b8,75%,#94a3b8)] bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent dark:bg-[linear-gradient(110deg,#475569,35%,#a5b4fc,50%,#475569,75%,#475569)]"
      initial={{ backgroundPosition: '200% 0' }}
      animate={{ backgroundPosition: '-200% 0' }}
      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
    >
      {text}
    </motion.span>
  )
}
