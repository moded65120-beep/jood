import { House, UsersRound, UserRound, CalendarDays, Globe, ChevronRight, ChevronDown, LogOut, Settings, Ruler, Weight, Stethoscope, ArrowUpRight, ShieldCheck, Mail, IdCard, Phone, Check, Plus, Lightbulb, RefreshCw } from 'lucide-react'

const icons = { lightbulb: Lightbulb, refresh: RefreshCw, plus: Plus, home: House, children: UsersRound, user: UserRound, calendar: CalendarDays, globe: Globe, chevron: ChevronRight, down: ChevronDown, logout: LogOut, settings: Settings, height: Ruler, weight: Weight, doctor: Stethoscope, arrow: ArrowUpRight, shield: ShieldCheck, mail: Mail, id: IdCard, phone: Phone, check: Check }

export default function PortalIcon({ name, ...props }) {
  const Icon = icons[name] || UserRound
  return <Icon size={22} strokeWidth={1.7} aria-hidden="true" {...props}/>
}
