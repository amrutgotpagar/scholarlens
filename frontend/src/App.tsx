import { Route, Routes } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import { GrainOverlay } from './components/GrainOverlay'
import { RequireAuth } from './components/RequireAuth'
import { LiquidGlassFilterDefs } from './components/ui/liquid-button'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'
import { Workspace } from './pages/Workspace'

function App() {
  return (
    <>
      <GrainOverlay />
      <LiquidGlassFilterDefs />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <Workspace />
            </RequireAuth>
          }
        />
        <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
        <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
