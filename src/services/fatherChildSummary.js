import { motherRouteAliases, parentCanViewChild } from './demoChildAccess.js'
import { getDemoChild } from '../pages/mother/childDemoData.js'
import { measurementSeries } from '../components/doctor/medicalRecordData.js'

// Read-only compatibility view. The existing Child Details fixtures remain in their
// original store; real shared records override them without migrating or copying data.
export function fatherChildSummary(user, childId, record, bookings = [], now = new Date()) {
  if (!parentCanViewChild(user, childId)) return null
  const alias = Object.entries(motherRouteAliases).find(([, id]) => id === childId)?.[0]
  const seed = alias ? getDemoChild(alias) : null
  const visit = [...(record?.medicalVisits || [])].sort((a, b) => b.date.localeCompare(a.date))[0]
  const measurement = type => measurementSeries(record?.growthMeasurements, type).at(-1)?.value ?? seed?.[type] ?? null
  const normalize = item => {
    const dateTime = item.dateTime || (item.date?.includes('T') ? item.date : item.date ? `${item.date}T${item.time || '23:59'}:00` : '')
    return { ...item, dateTime, date: dateTime.slice(0, 10), time: item.time || (item.date?.includes('T') ? item.date.slice(11, 16) : '') }
  }
  // Once shared appointments exist, their status/history supersedes legacy seeds.
  const sharedGroups = record?.followUps || {}
  const hasSharedAppointments = Object.values(sharedGroups).some(items => items.length)
  const followUps = [
    ...(sharedGroups.upcoming || []),
    ...(!hasSharedAppointments ? (seed?.followUps || []).filter(item => item.status === 'upcoming') : []),
    ...bookings.filter(item => item.childId === alias && item.period === 'upcoming'),
  ].map(normalize).filter(item => Number.isFinite(Date.parse(item.dateTime)) && new Date(item.dateTime) > now)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
  return {
    height: measurement('height'), weight: measurement('weight'),
    visitDate: visit?.date || seed?.lastVisit?.slice(0, 10) || null,
    doctor: visit?.doctor || null, doctorKey: visit ? null : seed?.doctorKey || null,
    followUp: followUps[0] || null,
  }
}
