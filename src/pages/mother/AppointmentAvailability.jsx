import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { getDoctorAvailableDates, getDoctorSlots } from './bookingAvailabilityDemo.js'

export default function AppointmentAvailability({ doctorId, date, time, now, isReserved, onChange }) {
  const { language, t } = useLanguage()
  const bt = key => t('mother.booking.' + key)
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  const dates = getDoctorAvailableDates(doctorId, now, isReserved)
  const slots = getDoctorSlots(doctorId, date, now).filter(slot => slot.available && !isReserved(date, slot.time))
  const timeLabel = value => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date('2000-01-01T' + value + ':00'))
  return <fieldset><legend>{bt('availability')}</legend><p>{bt('availabilityHint')}</p>
    <fieldset><legend>{bt('date')}</legend><div className="mother-booking__dates">{dates.map(value => <button type="button" className={'mother-booking__date' + (date === value ? ' is-selected' : '')} key={value} aria-pressed={date === value} onClick={() => {
      if (getDoctorAvailableDates(doctorId, new Date(), isReserved).includes(value)) onChange('date', value)
    }}><time dateTime={value}>{new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(value + 'T00:00:00'))}</time></button>)}</div>{dates.length === 0 && <p role="status">{bt('noDates')}</p>}</fieldset>
    {date && <fieldset><legend>{bt('time')}</legend>{slots.length ? <div className="mother-booking__slots">{slots.map(slot => <button type="button" className={'mother-booking__slot' + (time === slot.time ? ' is-selected' : '')} key={slot.time} aria-pressed={time === slot.time} onClick={() => {
      if (getDoctorSlots(doctorId, date, new Date()).some(current => current.time === slot.time && current.available) && !isReserved(date, slot.time)) onChange('time', slot.time)
    }}><span><bdi>{timeLabel(slot.time)}</bdi><small>{bt(time === slot.time ? 'selected' : 'available')}</small></span></button>)}</div> : <p role="status">{bt('noSlots')}</p>}</fieldset>}
  </fieldset>
}
