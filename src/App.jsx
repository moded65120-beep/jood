import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import PublicPage from './pages/PublicPages.jsx'
import MotherDashboard from './pages/mother/MotherDashboard.jsx'
import MotherChildren from './pages/mother/MotherChildren.jsx'
import MotherProfile from './pages/mother/MotherProfile.jsx'
import MotherSettings from './pages/mother/MotherSettings.jsx'
import MotherAppointments from './pages/mother/MotherAppointments.jsx'
import PortalBooking from './pages/mother/PortalBooking.jsx'
import ChildOverview from './pages/mother/ChildOverview.jsx'
import DoctorDashboard from './pages/doctor/DoctorDashboard.jsx'
import MotherRegister from './pages/auth/MotherRegister.jsx'
import MotherPasswordRecovery from './pages/auth/MotherPasswordRecovery.jsx'
import MotherLayout from './layouts/MotherLayout.jsx'
import MotherProtectedRoute from './components/mother/MotherProtectedRoute.jsx'
import DoctorProtectedRoute from './components/doctor/DoctorProtectedRoute.jsx'
import DoctorLayout from './layouts/DoctorLayout.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/choose-role" element={<Navigate to="/" replace />} />
        <Route path="/about" element={<PublicPage key="about" about />} />
        <Route path="/login" element={<Home key="portal-entry" loginMode />} />
        <Route path="/mother" element={<MotherProtectedRoute><MotherLayout /></MotherProtectedRoute>}>
          <Route index element={<MotherDashboard />} />
          <Route path="children" element={<MotherChildren />} />
          <Route path="profile" element={<MotherProfile />} />
          <Route path="settings" element={<MotherSettings />} />
          <Route path="appointments" element={<MotherAppointments />} />
          <Route path="appointments/book" element={<PortalBooking />} />
          <Route path="appointments/:appointmentId/reschedule" element={<Navigate to="/mother/appointments" replace />} />
          <Route path="children/:childId" element={<ChildOverview />} />
          <Route path="children/:childId/:section" element={<ChildOverview />} />
        </Route>
        <Route path="/doctor" element={<DoctorProtectedRoute><DoctorLayout /></DoctorProtectedRoute>}>
          <Route index element={<DoctorDashboard />} />
          <Route path="profile" element={<DoctorDashboard profilePage />} />
        </Route>
        <Route path="/mother/login" element={<Home key="parent-entry" initialAudience="parent" />} />
        <Route path="/doctor/login" element={<Home key="doctor-entry" initialAudience="doctor" />} />
        <Route path="/mother/register" element={<MotherRegister />} />
        <Route path="/mother/forgot-password" element={<MotherPasswordRecovery step="email" />} />
        <Route path="/mother/verify-code" element={<MotherPasswordRecovery step="code" />} />
        <Route path="/mother/new-password" element={<MotherPasswordRecovery step="password" />} />
        <Route path="/mother/password-reset-success" element={<MotherPasswordRecovery step="success" />} />
      </Routes>
    </BrowserRouter>
  )
}
