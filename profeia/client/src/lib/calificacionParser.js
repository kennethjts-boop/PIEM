function toScore(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.min(10, parsed))
}

function collectCandidates(text) {
  const source = String(text || '')
  const matches = [...source.matchAll(/\b(10(?:\.0+)?|[0-9](?:\.\d+)?)\b/g)]
  return matches
    .map((match) => {
      const value = toScore(match[1])
      if (value == null) return null
      return {
        raw: match[1],
        value,
        index: match.index ?? -1,
      }
    })
    .filter(Boolean)
}

function scoreCandidate(message, candidate, isLast) {
  const lower = String(message || '').toLowerCase()
  const idx = candidate.index
  const before = lower.slice(Math.max(0, idx - 24), idx)
  const after = lower.slice(idx, idx + 24)

  let score = 0

  if (/(calificaci[oó]n|nota|puntaje|con|obtuvo|sac[oó]|tiene|ponle|ponerle|eval[uú]a(?:r)?\s+a)\s*(?:de\s*)?$/.test(before)) {
    score += 7
  }

  if (/[:=]\s*$/.test(before)) {
    score += 6
  }

  if (/^\s*(?:\/\s*10|de\s*10\b)/.test(after)) {
    score += 6
  }

  if (/(^|\s)(calificaci[oó]n|nota|puntaje|con|obtuvo|sac[oó])\b/.test(before)) {
    score += 3
  }

  if (/\b(grado|grupo)\b/.test(before)) {
    score -= 3
  }

  if (isLast) {
    score += 2
  }

  return score
}

export function detectCalificacion(mensaje) {
  const candidates = collectCandidates(mensaje)
  if (candidates.length === 0) return 8

  let best = null
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i]
    const isLast = i === candidates.length - 1
    const score = scoreCandidate(mensaje, candidate, isLast)

    if (!best || score > best.score || (score === best.score && candidate.index > best.index)) {
      best = { ...candidate, score }
    }
  }

  return best?.value ?? 8
}
