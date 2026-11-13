import test from 'node:test'
import assert from 'node:assert/strict'
import { getBookingMother, submitBookingRequest, submitRescheduleRequest } from './motherBookingRequests.js'
import { syncMotherNotifications, readMotherNotifications, markMotherNotificationsRead, notificationStorageKey } from './motherNotifications.js'
import { motherAppointmentDemoData } from '../pages/mother/motherAppointmentDemoData.js'
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } }
const mother = getBookingMother()

test('reminders use exact thresholds, catch up once, and preserve read state across refresh', () => {
 const storage=memory()
 assert.equal(syncMotherNotifications(mother,storage,new Date('2026-11-04T09:59:59')).length,0)
 let records=syncMotherNotifications(mother,storage,new Date('2026-11-04T10:00:00'))
 assert.equal(records.length,1); assert.equal(records[0].type,'reminder24h')
 markMotherNotificationsRead(mother,records[0].id,storage)
 records=syncMotherNotifications(mother,storage,new Date('2026-11-05T08:00:00'))
 assert.equal(records.length,2); assert.equal(records.filter(item=>item.read).length,1)
 assert.equal(syncMotherNotifications(mother,storage,new Date('2026-11-05T08:01:00')).length,2)
 markMotherNotificationsRead(mother,undefined,storage)
 assert.ok(readMotherNotifications(mother,storage).every(item=>item.read))
 const catchup=syncMotherNotifications(mother,memory(),new Date('2026-11-05T09:00:00'))
 assert.deepEqual(new Set(catchup.map(item=>item.type)),new Set(['reminder24h','reminder2h']))
})

test('never generates reminders for past, unconfirmed, unowned or malformed records', () => {
 const base=motherAppointmentDemoData[0]
 const records=['pending','rejected','cancelled','completed'].map((status,index)=>({...base,id:'excluded-'+index,status}))
 records.push({...base,id:'past',dateTime:'2026-10-01T10:00:00'},{...base,id:'other',motherId:'other-mother'},{...base,id:'invalid',dateTime:'2026-02-31T10:00:00'})
 assert.deepEqual(syncMotherNotifications(mother,memory(),new Date('2026-11-05T09:00:00'),records),[])
 assert.deepEqual(syncMotherNotifications(mother,memory(),new Date(base.dateTime),[base]),[])
})

test('request notifications deduplicate and a pending reschedule retains original reminder time', () => {
 const storage=memory(),now=new Date('2026-10-29T10:00:00')
 const booking=submitBookingRequest(mother,{childId:'lina',doctorId:'omar',date:'2026-11-01',time:'12:00',reason:'Visit'},storage,now)
 const proposal=submitRescheduleRequest(mother,'demo-appointment-1',{date:'2026-11-03',time:'09:00'},storage,now)
 let records=syncMotherNotifications(mother,storage,now)
 assert.equal(records.length,2)
 assert.ok(records.some(item=>item.id==='bookingSubmitted:'+booking.id))
 assert.ok(records.some(item=>item.id==='rescheduleSubmitted:'+proposal.id && item.originalDateTime==='2026-11-05T10:00:00'))
 assert.equal(syncMotherNotifications(mother,storage,now).length,2)
 records=syncMotherNotifications(mother,storage,new Date('2026-11-04T10:00:00'))
 assert.ok(records.some(item=>item.type==='reminder24h' && item.appointmentId==='demo-appointment-1' && item.dateTime==='2026-11-05T10:00:00'))
 assert.ok(records.every(item=>!['bookingApproved','bookingRejected','rescheduleApproved','rescheduleRejected'].includes(item.type)))
 assert.ok(records.every(item=>Number.isFinite(Date.parse(item.createdAt))))
})

test('mother scoping, corrupted notification storage and failed writes are safe', () => {
 const storage=memory()
 syncMotherNotifications(mother,storage,new Date('2026-11-05T09:00:00'))
 const other={id:'other-mother',children:mother.children}
 assert.deepEqual(readMotherNotifications(other,storage),[])
 storage.setItem(notificationStorageKey(mother),'{bad')
 assert.throws(()=>syncMotherNotifications(mother,storage,new Date()),/notificationStorageError/)
 assert.equal(storage.getItem(notificationStorageKey(mother)),'{bad')
 assert.throws(()=>syncMotherNotifications(mother,{getItem:()=>null,setItem:()=>{throw Error('blocked')}},new Date('2026-11-05T09:00:00')),/notificationStorageError/)
})
