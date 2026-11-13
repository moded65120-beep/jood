import { demoChildren } from './childDemoData.js'
import { motherAppointmentDemoData } from './motherAppointmentDemoData.js'

// The app currently has one explicit demo mother and no authenticated profile/session.
export const motherProfile = { id: 'demo-mother-sara', nameKey: 'sara' }
export const portalChildren = Object.values(demoChildren)

// Use only existing doctor-scheduled records. Pending requests are not appointments.
export function getScheduledFollowUps(now = new Date()) {
  return motherAppointmentDemoData
    .filter(item => item.motherId === motherProfile.id && portalChildren.some(child => child.id === item.childKey) && ['confirmed', 'completed'].includes(item.status))
    .map(item => ({ ...item, createdBy: 'doctor', period: new Date(item.dateTime) >= now && item.status === 'confirmed' ? 'upcoming' : 'past' }))
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
}

export function getNextFollowUp(childId, now = new Date()) {
  return getScheduledFollowUps(now).find(item => item.childKey === childId && item.period === 'upcoming')
}

export function initials(name) {
  return name.trim().split(/\s+/u).slice(0, 2).map(part => Array.from(part)[0]).join('')
}
