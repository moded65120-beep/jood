import { useSyncExternalStore } from 'react'
import { Navigate } from 'react-router-dom'
import { isMotherAuthenticated, subscribeMotherAuth } from '../../services/motherDemoAuth.js'

export default function MotherProtectedRoute({ children }) {
  const authenticated = useSyncExternalStore(subscribeMotherAuth, isMotherAuthenticated, () => false)
  return authenticated ? children : <Navigate to="/login" replace/>
}
