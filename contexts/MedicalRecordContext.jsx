import { createContext, useContext, useState, useSyncExternalStore } from 'react'
import { createMedicalRecordRepository } from '../services/medicalRecordRepository.js'
import { selectDoctorPatients, selectMotherChildren, selectMotherMedicalRecord } from '../services/medicalRecordSelectors.js'

const ReadContext = createContext(null)
const DoctorCommandsContext = createContext(null)

export function MedicalRecordProvider({ children, repository }) {
  const [store] = useState(() => repository || createMedicalRecordRepository())
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const [, setWarning] = useState(() => store.getWarning())
  function command(operation) {
    const success = operation(store)
    setWarning(store.getWarning())
    return success
  }
  return <ReadContext.Provider value={state}><DoctorCommandsContext.Provider value={{ command, warning: store.getWarning() }}>{children}</DoctorCommandsContext.Provider></ReadContext.Provider>
}

function useRecords() {
  const state = useContext(ReadContext)
  if (!state) throw new Error('MedicalRecordProvider is required')
  return state
}
// Match LanguageContext's existing provider-and-hook convention.
// eslint-disable-next-line react/only-export-components
export function useDoctorMedicalRecords(doctor) {
  const state = useRecords()
  const commands = useContext(DoctorCommandsContext)
  return {
    patients: selectDoctorPatients(state, doctor.id), warning: commands.warning,
    act: (childId, operation, ...args) => commands.command(store => store.act(doctor, childId, operation, args)),
    assignChild: childId => commands.command(store => store.assignChild(doctor.id, childId)),
  }
}
// Future Mother UI receives immutable read models only; no repository or write commands.
// eslint-disable-next-line react/only-export-components
export function useMotherMedicalRecords(motherId) {
  const state = useRecords()
  return { children: selectMotherChildren(state, motherId), getMedicalRecord: idOrAlias => selectMotherMedicalRecord(state, motherId, idOrAlias) }
}
