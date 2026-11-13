import { useSyncExternalStore } from 'react'
import { getUnifiedDemoUser, subscribeUnifiedAuth } from '../services/unifiedDemoAuth.js'
export default function useUnifiedDemoUser() { return useSyncExternalStore(subscribeUnifiedAuth, getUnifiedDemoUser, () => null) }
