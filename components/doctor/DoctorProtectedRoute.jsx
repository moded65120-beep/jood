import { useSyncExternalStore } from 'react'
import { Navigate } from 'react-router-dom'
import { isDoctorAuthenticated, subscribeDoctorAuth } from '../../services/doctorDemoAuth.js'

export default function DoctorProtectedRoute({ children }) {
  const authenticated = useSyncExternalStore(subscribeDoctorAuth, isDoctorAuthenticated, () => false)
  return authenticated ? children : <Navigate to="/login" replace/>
}
