import { useNavigate } from 'react-router-dom'
import { logoutMotherDemo } from '../services/motherDemoAuth.js'

export default function useMotherLogout() {
  const navigate = useNavigate()
  return event => {
    event?.preventDefault()
    // Establish an explicit public Back destination before leaving the portal.
    // Do not replace every private navigation: authenticated Back/Forward stays normal.
    navigate('/', { replace: true })
    logoutMotherDemo()
    // PUSH is intentional: Login must sit immediately after the public Landing entry.
    navigate('/mother/login')
  }
}
