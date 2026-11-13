import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { appointmentGroup, appointmentsFor, followUpToday, formatFollowUpTime } from './followUpData.js'
import { formatDate } from './patientData.js'
import Icon from './Icon.jsx'
import './FollowUp.css'

export default function FollowUpAppointments({ patient, onEdit, onCancel }) {
  const { language, t } = useLanguage()
  const f = key => t(`doctor.followUp.${key}`)
  const appointments = [...appointmentsFor(patient)].sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
  const groups = ['upcoming', 'past', 'missed', 'cancelled']
  return (
    <section className="dmr-panel dfu-appointments" aria-labelledby="dfu-appointments-title">
      <header className="dmr-panel-header"><h3 id="dfu-appointments-title"><Icon name="followup" />{f('appointments')}</h3><button className="dd-button" onClick={() => onEdit(null)}>{f('newAppointment')}</button></header>
      {!appointments.length && <p className="dnv-demo">{f('empty')}</p>}
      {groups.map(group => {
        const items = appointments.filter(appointment => appointmentGroup(appointment) === group)
        if (!items.length) return null
        return <section key={group} className="dfu-group" aria-label={f(group)}><h4>{f(group)}</h4><ul>{items.map(appointment => (
          <li key={appointment.id}>
            <header><strong><time dateTime={appointment.date}><bdi>{formatDate(appointment.date, language)}</bdi></time>{appointment.time && <> · {formatFollowUpTime(appointment.time, language)}</>}</strong><span className={`dfu-status dfu-status-${appointment.status}`}>{f(`statuses.${appointment.status}`)}</span></header>
            <dl><div><dt>{f('timeLabel')}</dt><dd>{formatFollowUpTime(appointment.time, language) || f('noTime')}</dd></div><div><dt>{f('reasonLabel')}</dt><dd dir="auto">{appointment.reason || f('notProvided')}</dd></div><div><dt>{f('instructionsLabel')}</dt><dd dir="auto">{appointment.instructions || f('notProvided')}</dd></div></dl>
            {appointment.status === 'scheduled' && appointment.date >= followUpToday() && <footer><button className="dd-button" onClick={() => onEdit(appointment)}>{f('editReschedule')}</button><button className="dd-button dfu-cancel" onClick={() => onCancel(appointment.id)}>{f('cancelAppointment')}</button></footer>}
          </li>
        ))}</ul></section>
      })}
      <p className="dnv-demo">{f('mockNotice')}</p>
    </section>
  )
}
