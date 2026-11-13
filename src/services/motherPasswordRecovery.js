// Integration boundary: replace these methods with authenticated backend calls.
// Never accept codes locally or store passwords/reset tokens in browser storage.
// requestCode -> { challengeId }, verifyCode -> { resetToken }, resetPassword -> void.
const unavailable = async () => { throw new Error('RECOVERY_UNAVAILABLE') }
export const motherPasswordRecovery = {
  available: false,
  requestCode: unavailable,
  verifyCode: unavailable,
  resetPassword: unavailable,
}

export function validateRecovery(step, values) {
  const errors = {}
  if (step === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'emailInvalid'
  if (step === 'code' && !/^[0-9]{6}$/.test(values.code)) errors.code = 'codeInvalid'
  if (step === 'password') {
    if (values.password.length < 8) errors.password = 'passwordShort'
    if (!values.confirmPassword) errors.confirmPassword = 'confirmRequired'
    else if (values.password !== values.confirmPassword) errors.confirmPassword = 'passwordMismatch'
  }
  return errors
}
