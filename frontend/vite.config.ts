import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // framer-motion is otherwise discovered lazily mid-session (only once a route/branch
  // that imports it actually renders), which triggers a second on-the-fly dep-optimization
  // pass separate from the one react/react-dom were bundled in — the two passes end up
  // holding distinct module instances of react-dom's internals, so framer-motion's hooks
  // read from a different React than the one that rendered the tree ("Cannot read
  // properties of null (reading 'useContext')"). Forcing it into the initial scan avoids
  // the second pass entirely.
  optimizeDeps: {
    include: ['framer-motion', 'react-router-dom'],
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: true,
    proxy: {
      // No path rewrite: the backend mounts everything under /api itself (app/main.py),
      // matching Vercel's production rewrite (`/api/*` -> backend service), which passes
      // the path through unchanged rather than stripping the prefix. Dev and prod need to
      // agree on this or requests 404 in one of the two environments.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
