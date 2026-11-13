import useUnifiedDemoUser from '../../hooks/useUnifiedDemoUser.js'
import LegacyMotherHome from './LegacyMotherHome.jsx'
import ParentHome from './ParentHome.jsx'
import FatherHome from './FatherHome.jsx'
import './ParentHome.css'

export default function MotherDashboard() {
  const user = useUnifiedDemoUser()
  // The protected legacy login predates unified account metadata and is Sara's account.
  return !user || user.homePresentation === 'legacy-mother' ? <LegacyMotherHome /> : user.role === 'father' ? <FatherHome /> : <ParentHome />
}
