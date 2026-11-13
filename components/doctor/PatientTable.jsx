import PatientInitials from './PatientInitials.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Icon from './Icon.jsx'
import { followUpStatus, formatDate, formatAge, patientName } from './patientData.js'
import { formatFollowUpTime } from './followUpData.js'

const PAGE_SIZE = 7
const statusKeys = { Upcoming: 'upcoming', Overdue: 'overdue', 'No Follow-up': 'noFollowUp' }
const columns = ['number', 'childName', 'age', 'gender', 'medicalFile', 'lastVisit', 'nextFollowUp', 'actions']

export default function PatientTable({ patients, page, onPageChange, onViewRecord }) {
  const { language, t } = useLanguage()
  const number = new Intl.NumberFormat(language)
  const pageCount = Math.max(1, Math.ceil(patients.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visiblePatients = patients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeText = t('doctor.showing')
    .replace('{from}', number.format(patients.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0))
    .replace('{to}', number.format(Math.min(currentPage * PAGE_SIZE, patients.length)))
    .replace('{total}', number.format(patients.length))

  return (
    <section className="dd-table-card" aria-label={t('doctor.assignedPatients')}>
      <div className="dd-table-scroll" tabIndex="0" role="region" aria-label={t('doctor.tableRegion')}>
        <table>
          <caption className="dd-sr-only">{t('doctor.tableCaption')}</caption>
          <thead><tr>{columns.map(key => <th scope="col" key={key}>{t(`doctor.${key}`)}</th>)}</tr></thead>
          <tbody>
            {visiblePatients.map((patient, index) => {
              const status = followUpStatus(patient)
              return (
                <tr key={patient.id}>
                  <td>{number.format((currentPage - 1) * PAGE_SIZE + index + 1)}</td>
                  <td>
                    <button className="dd-patient-name" onClick={() => onViewRecord(patient)}>
                      <PatientInitials name={patientName(patient, language)} gender={patient.gender} className="dd-child-avatar" />
                      {patientName(patient, language)}
                    </button>
                  </td>
                  <td>
                    {patient.months < 12 ? formatAge(patient.months, 'month', language) : (
                      <>{formatAge(Math.floor(patient.months / 12), 'year', language)}<small>({formatAge(patient.months, 'month', language)})</small></>
                    )}
                  </td>
                  <td>{t(patient.gender === 'Female' ? 'doctor.female' : 'doctor.male')}</td>
                  <td><bdi>{patient.file}</bdi></td>
                  <td><bdi>{formatDate(patient.lastVisit, language)}</bdi></td>
                  <td>
                    <span className={`dd-badge dd-status-${status.toLowerCase().replaceAll(' ', '-')}`}>
                      <Icon name="calendar" />
                      <span>
                        {patient.nextFollowUp && <time dateTime={patient.nextFollowUp}><bdi>{formatDate(patient.nextFollowUp, language)}</bdi></time>}
                        {patient.nextFollowUpTime && <small>{formatFollowUpTime(patient.nextFollowUpTime, language)}</small>}
                        <small>{t(`doctor.${statusKeys[status]}`)}</small>
                      </span>
                    </span>
                  </td>
                  <td><button className="dd-record-button" onClick={() => onViewRecord(patient)}>{t('doctor.viewRecord')}<Icon name="right" /></button></td>
                </tr>
              )
            })}
            {!visiblePatients.length && <tr><td className="dd-empty" colSpan="8"><Icon name="search" /><strong>{t('doctor.noPatients')}</strong><span>{t('doctor.emptyHint')}</span></td></tr>}
          </tbody>
        </table>
      </div>
      <footer className="dd-table-footer">
        <span>{rangeText}</span>
        {pageCount > 1 && (
          <nav className="dd-pagination" aria-label={t('doctor.pagination')}>
            <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label={t('doctor.previousPage')}><span aria-hidden="true">{language === 'ar' ? '\u203a' : '\u2039'}</span></button>
            {Array.from({ length: pageCount }, (_, index) => <button key={index} aria-label={t('doctor.page').replace('{number}', number.format(index + 1))} aria-current={currentPage === index + 1 ? 'page' : undefined} onClick={() => onPageChange(index + 1)}>{number.format(index + 1)}</button>)}
            <button disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)} aria-label={t('doctor.nextPage')}><span aria-hidden="true">{language === 'ar' ? '\u2039' : '\u203a'}</span></button>
          </nav>
        )}
      </footer>
    </section>
  )
}
