import { activeDoctorName } from '../../services/doctorDirectory.js'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import useDemoBookings from '../../hooks/useDemoBookings.js'
import { bookingAppointments } from '../../services/motherDemoBookings.js'
import '../../pages/mother/PortalBooking.css'

export default function ChildDemoBookings({ childId }) {
  const { language, t } = useLanguage()
  const { records, error, now } = useDemoBookings()
  const appointments = bookingAppointments(records, now).filter(item => item.childId === childId)
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  const format = value => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
  return <section className="child-visit-group demo-child-bookings" aria-labelledby="child-demo-bookings-title"><h3 id="child-demo-bookings-title">{t('demoBooking.yourBookings')}</h3><p>{t('demoBooking.notice')}</p>{error && <p role="alert">{t('demoBooking.storageError')}</p>}{['upcoming', 'past'].map(period => <section key={period}><h4>{t('mother.appointmentsPage.' + period)}</h4>{appointments.filter(item => item.period === period).map(item => <article className="child-readonly-entry" key={item.id}><p><time dateTime={item.dateTime}><bdi>{format(item.dateTime)}</bdi></time></p><p>{activeDoctorName(item.doctorKey, language, t('mother.' + item.doctorKey))} &middot; {t(item.clinicKey)}</p><span className="portal-tag">{t('demoBooking.confirmed')}</span></article>)}{!appointments.some(item => item.period === period) && <p>{t('demoBooking.noBookings')}</p>}</section>)}</section>
}
