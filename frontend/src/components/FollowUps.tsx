import { motion } from 'framer-motion'
import { CornerDownRight } from 'lucide-react'

// Generic, always-relevant follow-ups rather than model-generated ones: a dedicated
// generation call per answer would add real latency/cost for suggestions that are "nice
// to have," not core to answering the question. These are genuinely functional (clicking
// one submits a real query) — just not personalized to the specific answer.
const FOLLOW_UPS = ['Can you go into more detail on that?', 'What are the limitations of this approach?']

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, x: -4 },
  visible: { opacity: 1, x: 0 },
}

interface Props {
  onSelect: (prompt: string) => void
}

export function FollowUps({ onSelect }: Props) {
  return (
    <motion.div variants={listVariants} initial="hidden" animate="visible" className="mt-4">
      <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
        Follow-ups
      </h4>
      <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
        {FOLLOW_UPS.map((prompt) => (
          <motion.button
            key={prompt}
            variants={itemVariants}
            type="button"
            onClick={() => onSelect(prompt)}
            whileHover={{ x: 2 }}
            className="flex w-full items-center gap-2 py-2 text-left text-[13px] text-slate-600 transition-colors hover:text-indigo-700 dark:text-slate-300 dark:hover:text-indigo-300"
          >
            <CornerDownRight size={13} className="shrink-0 text-slate-300 dark:text-slate-600" />
            {prompt}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
