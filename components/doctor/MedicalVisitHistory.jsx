import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { formatDate } from './patientData.js'
import { clinicalVisitFields } from './medicalVisitData.js'
import Icon from './Icon.jsx'

export default function MedicalVisitHistory({ visits = [], onAdd }) {
  const { language, t } = useLanguage()
  const v = key => t(`doctor.newVisit.${key}`)
  const sorted = [...visits].reverse().sort((a, b) => b.date.localeCompare(a.date))
  return (
    <section className="dmr-panel dmr-visit-history" aria-labelledby="dmr-history-title">
      <header className="dmr-panel-header"><h3 id="dmr-history-title"><Icon name="calendar" />{v('history')}</h3>{onAdd && <button type="button" className="dd-button" onClick={onAdd}>{v('add')}</button>}</header>
      {!sorted.length ? <p className="dnv-demo">{v('emptyHistory')}</p> : <ul className="dnv-history-list">{sorted.map(visit => (
        <li key={visit.id}>
          <header className="dnv-history-header">
            <strong className="dnv-visit-type">{v(`types.${visit.type}`)}</strong>
            <dl className="dnv-history-meta">
              <div><dt>{v('date')}</dt><dd><time dateTime={visit.date}><bdi>{formatDate(visit.date, language)}</bdi></time></dd></div>
              <div><dt>{v('doctorLabel')}</dt><dd><bdi>{visit.doctor}</bdi></dd></div>
            </dl>
          </header>
          <dl className="dnv-history-details">{clinicalVisitFields.filter(field => visit[field]).map(field => <div key={field}><dt>{v(field)}</dt><dd><p dir="auto">{visit[field]}</p></dd></div>)}{visit.nextFollowUp && <div><dt>{v('nextFollowUp')}</dt><dd><bdi>{formatDate(visit.nextFollowUp, language)}</bdi></dd></div>}</dl>
        </li>
      ))}</ul>}
    </section>
  )
}
