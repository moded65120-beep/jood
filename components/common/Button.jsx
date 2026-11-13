import './Button.css'

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}) {
  const buttonVariant = ['primary', 'secondary', 'accent'].includes(variant)
    ? variant
    : 'primary'

  return (
    <button
      {...props}
      type={type}
      className={`nomu-button nomu-button--${buttonVariant} ${className}`.trim()}
    >
      {children}
    </button>
  )
}
