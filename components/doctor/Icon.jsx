const paths = {
  plus: 'M12 5v14 M5 12h14',
  x: 'M18 6 6 18 M6 6l12 12',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 13h8 M8 17h6',
  growth: 'M3 3v18h18 M7 14l4-4 4 3 6-8',
  syringe: 'M18 2l4 4 M17 7l3-3 M14 4l6 6 M5 13l6 6 M4 20l-2 2 M5 19l-1-1 10-10 4 4-10 10Z M10 12l2 2',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
  stethoscope: 'M6 3H4v5a5 5 0 0 0 10 0V3h-2 M9 13v3a5 5 0 0 0 10 0v-3 M21 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  notes: 'M16 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8 M8 7h8 M8 11h6 M8 15h3 M16 16l3-3 3 3-5 5h-3v-3Z',
  pill: 'M10 4a6 6 0 0 1 8 8l-6 6a6 6 0 0 1-8-8Z M8 8l8 8',
  scale: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2 M8 8a5 5 0 0 1 8 0 M12 7v4',
  ruler: 'M8 2h8v20H8Z M8 6h4 M8 10h3 M8 14h4 M8 18h3',
  head: 'M9 22v-4a8 8 0 1 1 10-7l2 3h-3v4h-5 M9 22h6',
  alert: 'm12 3 10 18H2Z M12 9v5 M12 17h.01',
  patients: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 M8 14h2 M14 14h2 M8 18h2',
  followup: 'M8 2v4 M16 2v4 M3 10h18 M11 22H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5 M23 18a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M18 15v3l2 1',
  user: 'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 22v-2a8 6 0 0 1 16 0v2Z',
  add: 'M15 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M3 22v-3a7 5 0 0 1 10-4 M19 14v8 M15 18h8',
  search: 'M19 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M16 16l6 6',
  right: 'M4 12h16 M14 6l6 6-6 6',
  reset: 'M3 10a9 9 0 1 0 3-5 M3 3v7h7',
  logout: 'M9 3H4v18h5 M10 12h12 M17 7l5 5-5 5',
  menu: 'M3 5h18 M3 12h18 M3 19h18',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 10h18c0-3-3-3-3-10 M10 22h4',
}
export default function Icon({ name }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.user} /></svg>
}
