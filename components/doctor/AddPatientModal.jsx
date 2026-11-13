import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import DoctorModal from './DoctorModal.jsx'
import { registeredPatients, patientName } from './patientData.js'

export default function AddPatientModal({ patients, onAdd, onClose }) {
  const { language, t } = useLanguage()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const matches = registeredPatients.filter(patient =>
    `${patient.name} ${patient.nameAr || ''} ${patient.nationalId} ${patient.file}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  function submit(event) {
    event.preventDefault()
    if (!selected) return setError('doctor.selectChild')
    if (patients.some(patient => patient.id === selected.id)) {
      return setError('doctor.alreadyAddedError')
    }
    // When connected to a backend, the add endpoint must authorize an authenticated doctor.
    // This mock interaction only assigns an existing record; it creates no child or medical record.
    if (!onAdd(selected)) setError('doctor.alreadyAddedError')
  }

  return (
    <DoctorModal title={t('doctor.addExistingPatient')} onClose={onClose}>
      <p>{t('doctor.addDescription')}</p>
      <form onSubmit={submit}>
        <label className="dd-field">
          {t('doctor.searchRegistered')}
          <input
            autoFocus
            placeholder={t('doctor.registeredPlaceholder')}
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              setSelected(null)
              setError('')
            }}
          />
        </label>
        <fieldset className="dd-matches">
          <legend>{t('doctor.matchingRecords')}</legend>
          {matches.map(patient => {
            const exists = patients.some(item => item.id === patient.id)
            return (
              <label className={`dd-match ${selected?.id === patient.id ? 'dd-match-selected' : ''}`} key={patient.id}>
                <input
                  type="radio"
                  name="registered-child"
                  checked={selected?.id === patient.id}
                  disabled={exists}
                  onChange={() => { setSelected(patient); setError('') }}
                />
                <span><strong>{patientName(patient, language)}</strong><small><bdi>{patient.file}</bdi> · <bdi>{patient.nationalId}</bdi></small></span>
                {exists && <small>{t('doctor.alreadyAdded')}</small>}
              </label>
            )
          })}
          {!matches.length && <p role="status">{t('doctor.noRegisteredMatches')}</p>}
        </fieldset>
        {error && <p className="dd-error" role="alert">{t(error)}</p>}
        <div className="dd-modal-actions">
          <button className="dd-button" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="dd-record-button" type="submit">{t('doctor.addPatient')}</button>
        </div>
      </form>
    </DoctorModal>
  )
}
