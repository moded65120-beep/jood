import './Card.css'

export default function Card({ children, className = '', ...props }) {
  return (
    <div {...props} className={`nomu-card ${className}`.trim()}>
      {children}
    </div>
  )
}
