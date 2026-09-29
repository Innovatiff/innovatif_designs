import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { Login } from './components/Login'
import Editor from './pages/Editor'
import Home from './pages/Home'
import PageView from './pages/PageView'
import { Splash } from './components/Splash'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Owner-only routes: show the sign-in screen until the user is signed in. */
function Gate({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth()
  if (loading) {
    return <Splash />
  }
  if (!user) return <Login />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <Gate>
              <Home />
            </Gate>
          }
        />
        <Route
          path="/new"
          element={
            <Gate>
              <Editor />
            </Gate>
          }
        />
        <Route path="/p/:id" element={<PageView />} />
        <Route
          path="/p/:id/edit"
          element={
            <Gate>
              <Editor />
            </Gate>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
