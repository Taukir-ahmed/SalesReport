import { useEffect } from 'react'

export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDone, toast.tone === 'error' ? 6000 : 3200)
    return () => clearTimeout(t)
  }, [toast, onDone])

  if (!toast) return null
  return (
    <div className={`toast toast-${toast.tone}`} role="status">
      {toast.message}
      <button onClick={onDone}>×</button>
    </div>
  )
}
