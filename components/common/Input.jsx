import { useId } from 'react'
import './Input.css'

// Pass normal input props such as name, value, onChange, required, and disabled.
export default function Input({
  label,
  id,
  type = 'text',
  className = '',
  ...props
}) {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <div className="nomu-field">
      <label className="nomu-field__label" htmlFor={inputId}>{label}</label>
      <input
        {...props}
        id={inputId}
        type={type}
        className={`nomu-input ${className}`.trim()}
      />
    </div>
  )
}
