const LOG_KEY = 'profeia_action_log_v1'
const MAX_LOG_ENTRIES = 50

export const ACTION_LOG_SHAPE = {
  id: '',
  tool_id: '',
  title: '',
  status: '', // 'success' | 'error' | 'cancelled'
  created_at: '',
  executed_at: '',
  payload_summary: '',
}

export function getActionLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToActionLog(entry) {
  const log = getActionLog()
  const newEntry = {
    id: `log-${Date.now()}`,
    created_at: new Date().toISOString(),
    executed_at: new Date().toISOString(),
    ...entry,
  }
  const updated = [newEntry, ...log].slice(0, MAX_LOG_ENTRIES)
  localStorage.setItem(LOG_KEY, JSON.stringify(updated))
  return newEntry
}

export function clearActionLog() {
  localStorage.removeItem(LOG_KEY)
}
