# Profeia Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add avatar selection modal, dynamic greeting sidebar with ProfeIA chat, notifications dropdown, admin panel with PDF upload + webhook config, and Supabase SQL schema to the existing Profeia Vite+React+Express app.

**Architecture:** Replace the current "header+main" layout with a fixed collapsible left sidebar (300px) + right main area. `react-router-dom` routes `/` to the main app and `/admin` to a new Admin Panel page. Preferences (avatar gender, webhook URL) live in localStorage. Express gains `multer` for PDF uploads and a `documents` SQLite table.

**Tech Stack:** React 18 + Vite + Tailwind CSS, Express + better-sqlite3, react-router-dom v6, react-dropzone v14, multer v1, inline SVG for avatars.

> **Note on testing:** This project has no test framework configured. Each task includes a manual smoke-test step instead of automated tests. Do not skip them — they catch integration errors early.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `client/src/main.jsx` | Modify | Wrap app in BrowserRouter |
| `client/src/App.jsx` | Rewrite | New sidebar+main layout, router, replace OnboardingModal |
| `client/src/index.css` | Append | Sidebar, chat, dropzone, notification, chip styles |
| `client/src/api.js` | Append | `sendProfeIAMessage`, `getWebhookUrl`, admin upload endpoint |
| `client/.env` | Create | `VITE_N8N_WEBHOOK_URL` placeholder |
| `client/src/components/TeacherAvatar.jsx` | Create | SVG avatar (maestro/maestra) with animation |
| `client/src/components/AvatarModal.jsx` | Create | Two-step onboarding modal (choose avatar → enter data) |
| `client/src/components/Sidebar.jsx` | Create | Collapsible sidebar shell, greeting, reminders, quick tools |
| `client/src/components/ProfeIAChat.jsx` | Create | Chat UI, webhook call, quick prompts, typing indicator |
| `client/src/components/NotificationDropdown.jsx` | Create | Bell icon, badge, tabbed dropdown (Urgente/Recordatorio/Sugerencia) |
| `client/src/pages/AdminPanel.jsx` | Create | PDF upload + document library + webhook config form |
| `server/db.js` | Modify | Add `documents` table creation |
| `server/index.js` | Modify | Add multer + `POST/GET/DELETE /api/admin/documents` routes |
| `docs/supabase-setup.sql` | Create | Full pgvector schema for production migration |

---

## Task 1 — Install New Dependencies

**Files:**
- Modify: `client/package.json`
- Modify: `server/package.json`

- [ ] **Step 1: Install client dependencies**

```bash
cd profeia/client
npm install react-router-dom@^6 react-dropzone@^14
```

Expected output: `added N packages` — no errors.

- [ ] **Step 2: Install server dependency**

```bash
cd profeia/server
npm install multer@^1
```

Expected output: `added N packages` — no errors.

- [ ] **Step 3: Verify installs**

```bash
# In profeia/client
node -e "require.resolve('react-router-dom')" && echo "router OK"
# In profeia/server  
node -e "require('multer')" && echo "multer OK"
```

- [ ] **Step 4: Commit**

```bash
cd profeia
git add client/package.json client/package-lock.json server/package.json server/package-lock.json
git commit -m "chore: add react-router-dom, react-dropzone, multer"
```

---

## Task 2 — Environment File + API Helpers

**Files:**
- Create: `client/.env`
- Modify: `client/src/api.js`

- [ ] **Step 1: Create .env**

Create `profeia/client/.env` with this exact content:

```
VITE_N8N_WEBHOOK_URL=https://n8n.tudominio.com/webhook/profeia-chat
```

- [ ] **Step 2: Add webhook helpers to api.js**

Append to the bottom of `profeia/client/src/api.js` (keep all existing code, add after the closing `}`):

```js
// ── Webhook URL resolution (Admin Panel > .env > hardcoded fallback) ──
export const getWebhookUrl = () =>
  localStorage.getItem('profeia_webhook_url') ||
  import.meta.env.VITE_N8N_WEBHOOK_URL ||
  'https://n8n.tudominio.com/webhook/profeia-chat'

export const saveWebhookUrl = (url) =>
  localStorage.setItem('profeia_webhook_url', url)

export const sendProfeIAMessage = async ({ mensaje, docenteId, fecha, grado }) => {
  const url = getWebhookUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje, docenteId, fecha, grado, contexto: 'profeia-chat' })
  })
  if (!res.ok) throw new Error(`Webhook ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { respuesta: text } }
}

// ── Admin: document upload ──
export const uploadDocument = async (file, categoria) => {
  const form = new FormData()
  form.append('file', file)
  form.append('categoria', categoria)
  const res = await fetch('/api/admin/documents', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

export const getDocuments = async () => {
  const res = await fetch('/api/admin/documents')
  return res.json()
}

export const deleteDocument = async (id) => {
  const res = await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' })
  return res.json()
}
```

- [ ] **Step 3: Verify the file still exports `api`**

```bash
cd profeia/client
node --input-type=module <<'EOF'
import { api, getWebhookUrl, sendProfeIAMessage } from './src/api.js'
console.log('api OK, getWebhookUrl:', typeof getWebhookUrl)
EOF
```

Expected: `api OK, getWebhookUrl: function` (may show fetch errors if server not running — that's fine).

- [ ] **Step 4: Commit**

```bash
cd profeia
git add client/.env client/src/api.js
git commit -m "feat: add webhook URL helpers and admin upload API"
```

---

## Task 3 — Server: documents Table

**Files:**
- Modify: `server/db.js`

- [ ] **Step 1: Add documents table**

In `profeia/server/db.js`, find the last `CREATE TABLE IF NOT EXISTS` block and add immediately after it (before the closing backtick of the `db.exec` call):

```sql
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    archivo TEXT NOT NULL,
    estado TEXT DEFAULT 'procesando',
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );
```

- [ ] **Step 2: Smoke test — restart server and verify table exists**

```bash
cd profeia/server
node -e "
const { db } = require('./db');
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
console.log(tables.map(t => t.name));
"
```

Expected output includes `documents`.

- [ ] **Step 3: Commit**

```bash
cd profeia
git add server/db.js
git commit -m "feat: add documents table to SQLite schema"
```

---

## Task 4 — Server: Multer + Admin Routes

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Add multer config and routes**

At the top of `profeia/server/index.js`, after the existing `require` lines, add:

```js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se aceptan archivos PDF'));
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});
```

Then add these three routes before the `app.listen` line at the bottom:

```js
// ===== ADMIN: DOCUMENTS =====
app.post('/api/admin/documents', upload.single('file'), (req, res) => {
  const { categoria } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const result = db.prepare(
    'INSERT INTO documents (nombre, categoria, archivo, estado) VALUES (?, ?, ?, ?)'
  ).run(req.file.originalname, categoria || 'Otro', req.file.filename, 'listo');
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  res.json(doc);
});

app.get('/api/admin/documents', (_req, res) => {
  const docs = db.prepare('SELECT * FROM documents ORDER BY creado_en DESC').all();
  res.json(docs);
});

app.delete('/api/admin/documents/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(uploadsDir, doc.archivo);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// multer error handler (must be after routes)
app.use((err, _req, res, _next) => {
  if (err.message === 'Solo se aceptan archivos PDF') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message });
});
```

- [ ] **Step 2: Smoke test — start server and hit the endpoint**

```bash
cd profeia/server && node index.js &
sleep 1
curl -s http://localhost:3001/api/admin/documents | head -c 100
# Expected: [] (empty array)
kill %1
```

- [ ] **Step 3: Commit**

```bash
cd profeia
git add server/index.js
git commit -m "feat: add multer PDF upload and /api/admin/documents routes"
```

---

## Task 5 — TeacherAvatar Component

**Files:**
- Create: `client/src/components/TeacherAvatar.jsx`

- [ ] **Step 1: Create the SVG avatar component**

Create `profeia/client/src/components/TeacherAvatar.jsx`:

```jsx
/**
 * TeacherAvatar — Google flat style SVG avatar
 * Props:
 *   genero: 'maestro' | 'maestra'
 *   size: number (default 80)
 *   animated: boolean (default true) — applies float animation
 */
function TeacherAvatar({ genero = 'maestro', size = 80, animated = true }) {
  const cls = animated ? 'animate-float' : ''

  if (genero === 'maestra') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={cls}
        aria-label="Avatar Maestra"
      >
        {/* Body — teal blouse */}
        <ellipse cx="50" cy="82" rx="28" ry="20" fill="#00BCD4" />
        <rect x="28" y="65" width="44" height="28" rx="10" fill="#00BCD4" />
        {/* Collar */}
        <path d="M 42 65 L 50 73 L 58 65" fill="white" opacity="0.6" />
        {/* Head */}
        <circle cx="50" cy="42" r="22" fill="#FFCCBC" />
        {/* Hair — dark bun */}
        <path d="M 29 38 Q 28 18 50 16 Q 72 18 71 38 Q 66 24 50 22 Q 34 24 29 38 Z" fill="#4E342E" />
        {/* Bun */}
        <circle cx="50" cy="15" r="7" fill="#4E342E" />
        {/* Bun highlight */}
        <circle cx="48" cy="13" r="2" fill="#6D4C41" opacity="0.6" />
        {/* Ear studs */}
        <circle cx="28" cy="44" r="2.5" fill="#FF6B9D" />
        <circle cx="72" cy="44" r="2.5" fill="#FF6B9D" />
        {/* Eyes */}
        <ellipse cx="41" cy="42" rx="3.5" ry="3.5" fill="#3E2723" />
        <ellipse cx="59" cy="42" rx="3.5" ry="3.5" fill="#3E2723" />
        {/* Eye shine */}
        <circle cx="42.5" cy="40.5" r="1.2" fill="white" />
        <circle cx="60.5" cy="40.5" r="1.2" fill="white" />
        {/* Lashes */}
        <path d="M 38 39 Q 41 37 44 39" stroke="#3E2723" strokeWidth="1" fill="none" />
        <path d="M 56 39 Q 59 37 62 39" stroke="#3E2723" strokeWidth="1" fill="none" />
        {/* Nose */}
        <circle cx="50" cy="47" r="1.5" fill="#FFAB91" />
        {/* Smile */}
        <path d="M 43 52 Q 50 58 57 52" stroke="#BF360C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Cheeks */}
        <ellipse cx="36" cy="50" rx="5" ry="3" fill="#FF8A65" opacity="0.35" />
        <ellipse cx="64" cy="50" rx="5" ry="3" fill="#FF8A65" opacity="0.35" />
        {/* Book */}
        <rect x="63" y="68" width="16" height="20" rx="2" fill="#4285F4" />
        <rect x="64" y="69" width="7" height="18" rx="1" fill="#3367D6" />
        <line x1="71" y1="69" x2="71" y2="87" stroke="#2a56c6" strokeWidth="1" />
        <line x1="67" y1="73" x2="78" y2="73" stroke="white" strokeWidth="1" opacity="0.5" />
        <line x1="67" y1="77" x2="78" y2="77" stroke="white" strokeWidth="1" opacity="0.5" />
      </svg>
    )
  }

  // Maestro (default)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cls}
      aria-label="Avatar Maestro"
    >
      {/* Body — blue suit */}
      <rect x="24" y="65" width="52" height="38" rx="10" fill="#3F51B5" />
      {/* Suit lapels */}
      <path d="M 50 65 L 40 78 L 50 75 L 60 78 Z" fill="#303F9F" />
      {/* White shirt */}
      <path d="M 44 65 L 50 73 L 56 65" fill="white" />
      {/* Tie */}
      <path d="M 50 73 L 47 85 L 50 83 L 53 85 Z" fill="#EA4335" />
      {/* Collar */}
      <rect x="46" y="62" width="8" height="5" rx="2" fill="white" />
      {/* Head */}
      <circle cx="50" cy="40" r="22" fill="#FFCCBC" />
      {/* Hair */}
      <path d="M 28 35 Q 29 15 50 14 Q 71 15 72 35 Q 67 22 50 20 Q 33 22 28 35 Z" fill="#3E2723" />
      {/* Sideburns */}
      <path d="M 28 35 Q 27 42 30 48" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 72 35 Q 73 42 70 48" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <ellipse cx="41" cy="40" rx="3.5" ry="3.5" fill="#3E2723" />
      <ellipse cx="59" cy="40" rx="3.5" ry="3.5" fill="#3E2723" />
      {/* Eye shine */}
      <circle cx="42.5" cy="38.5" r="1.2" fill="white" />
      <circle cx="60.5" cy="38.5" r="1.2" fill="white" />
      {/* Eyebrows */}
      <path d="M 37 35 Q 41 33 45 35" stroke="#3E2723" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 55 35 Q 59 33 63 35" stroke="#3E2723" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Nose */}
      <circle cx="50" cy="45" r="1.5" fill="#FFAB91" />
      {/* Smile */}
      <path d="M 43 51 Q 50 57 57 51" stroke="#BF360C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <ellipse cx="35" cy="48" rx="5" ry="3" fill="#FF8A65" opacity="0.3" />
      <ellipse cx="65" cy="48" rx="5" ry="3" fill="#FF8A65" opacity="0.3" />
      {/* Book in hand */}
      <rect x="63" y="70" width="16" height="20" rx="2" fill="#34A853" />
      <rect x="64" y="71" width="7" height="18" rx="1" fill="#1e8a40" />
      <line x1="71" y1="71" x2="71" y2="89" stroke="#1a7a38" strokeWidth="1" />
      <line x1="67" y1="75" x2="78" y2="75" stroke="white" strokeWidth="1" opacity="0.5" />
      <line x1="67" y1="79" x2="78" y2="79" stroke="white" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export default TeacherAvatar
```

- [ ] **Step 2: Smoke test — import in browser**

Start dev server (`npm run dev` in `client/`) and temporarily add to App.jsx:
```jsx
import TeacherAvatar from './components/TeacherAvatar'
// inside return: <TeacherAvatar genero="maestra" size={100} />
```
Verify both avatars render correctly, then remove the test import.

- [ ] **Step 3: Commit**

```bash
cd profeia
git add client/src/components/TeacherAvatar.jsx
git commit -m "feat: add TeacherAvatar SVG component (maestro/maestra)"
```

---

## Task 6 — AvatarModal Component

**Files:**
- Create: `client/src/components/AvatarModal.jsx`

This replaces the existing `OnboardingModal` in App.jsx. It has two steps:
1. Choose Maestro or Maestra
2. Enter name, school, CCT

- [ ] **Step 1: Create AvatarModal.jsx**

Create `profeia/client/src/components/AvatarModal.jsx`:

```jsx
import { useState } from 'react'
import { Sparkle } from 'lucide-react'
import TeacherAvatar from './TeacherAvatar'

/**
 * AvatarModal
 * Props:
 *   onCreate: ({ nombre, escuela, clave_escuela, genero }) => void
 */
function AvatarModal({ onCreate }) {
  const [step, setStep] = useState(1)          // 1 = choose avatar, 2 = enter data
  const [genero, setGenero] = useState(null)   // 'maestro' | 'maestra'
  const [nombre, setNombre] = useState('')
  const [escuela, setEscuela] = useState('')
  const [clave, setClave] = useState('')

  const handleChoose = (g) => {
    setGenero(g)
    setStep(2)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre || !escuela || !clave) return
    // Save gender preference to localStorage
    const prefs = { genero, nombre }
    localStorage.setItem('profeia_prefs', JSON.stringify(prefs))
    onCreate({ nombre, escuela, clave_escuela: clave, genero })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-scale-in overflow-hidden">

        {/* ── Step 1: Choose avatar ── */}
        {step === 1 && (
          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4285F4] via-[#A142F4] to-[#FF6B9D] mx-auto flex items-center justify-center mb-3 shadow-lg relative animate-float">
                <span className="text-2xl font-extrabold text-white">P</span>
                <Sparkle className="absolute -top-1 -right-1 w-5 h-5 text-[#FBBC04]" strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-extrabold text-[#202124]">Bienvenido a Profeia</h2>
              <p className="text-sm text-[#5f6368] mt-1">¿Cómo te identificas?</p>
            </div>

            {/* Avatar cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { g: 'maestra', label: 'Maestra', color: '#00BCD4', bg: 'rgba(0,188,212,0.06)' },
                { g: 'maestro', label: 'Maestro', color: '#3F51B5', bg: 'rgba(63,81,181,0.06)' }
              ].map(({ g, label, color, bg }) => (
                <button
                  key={g}
                  onClick={() => handleChoose(g)}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-[#e8eaed] hover:border-[#4285F4] transition-all duration-200 hover:shadow-lg group"
                  style={{ background: bg }}
                >
                  <div className="group-hover:scale-110 transition-transform duration-200">
                    <TeacherAvatar genero={g} size={90} animated={false} />
                  </div>
                  <span
                    className="text-base font-bold"
                    style={{ color }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs text-[#9aa0a6] text-center mt-4">
              Esto personaliza tu asistente y avatar en la app.
            </p>
          </div>
        )}

        {/* ── Step 2: Enter data ── */}
        {step === 2 && (
          <div className="p-8">
            {/* Back button + avatar preview */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setStep(1)}
                className="text-[#5f6368] hover:text-[#202124] text-sm flex items-center gap-1"
              >
                ← Cambiar
              </button>
              <div className="flex items-center gap-3 ml-auto">
                <TeacherAvatar genero={genero} size={48} animated={false} />
                <div>
                  <p className="text-sm font-semibold text-[#202124] capitalize">{genero}</p>
                  <p className="text-xs text-[#9aa0a6]">Avatar seleccionado</p>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-[#202124] mb-1">Cuéntanos de ti</h2>
            <p className="text-sm text-[#5f6368] mb-5">Necesitamos algunos datos para personalizar tu espacio.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Nombre completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="input-google"
                  placeholder={genero === 'maestra' ? 'Prof. María González' : 'Prof. Juan Pérez'}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Escuela</label>
                <input
                  type="text"
                  value={escuela}
                  onChange={e => setEscuela(e.target.value)}
                  className="input-google"
                  placeholder="Telesecundaria Benito Juárez"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Clave de centro de trabajo</label>
                <input
                  type="text"
                  value={clave}
                  onChange={e => setClave(e.target.value)}
                  className="input-google"
                  placeholder="01DTV0001A"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full py-3 text-base mt-2">
                Comenzar →
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default AvatarModal
```

- [ ] **Step 2: Smoke test**

Temporarily in App.jsx render `<AvatarModal onCreate={console.log} />` over everything. Verify:
- Both avatar cards are visible and styled
- Clicking Maestra/Maestro advances to step 2
- Back button returns to step 1
- Form submits with `{ nombre, escuela, clave_escuela, genero }` logged to console
- `localStorage('profeia_prefs')` is set after submit

- [ ] **Step 3: Commit**

```bash
cd profeia
git add client/src/components/AvatarModal.jsx
git commit -m "feat: add AvatarModal two-step onboarding (avatar choice + data form)"
```

---

## Task 7 — ProfeIA Chat Component

**Files:**
- Create: `client/src/components/ProfeIAChat.jsx`

- [ ] **Step 1: Create ProfeIAChat.jsx**

Create `profeia/client/src/components/ProfeIAChat.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { sendProfeIAMessage } from '../api'

const QUICK_PROMPTS = [
  '¿Qué vemos hoy?',
  'Genera una planeación',
  'Ayuda con la bitácora',
  'Próximo proyecto NEM'
]

const INITIAL_MSG = {
  id: 0,
  role: 'ai',
  text: '¡Hola! Soy ProfeIA, tu asistente inteligente. ¿En qué te puedo ayudar hoy?'
}

/**
 * ProfeIAChat
 * Props:
 *   docenteId: number | null
 *   grado: number | null
 */
function ProfeIAChat({ docenteId, grado }) {
  const [messages, setMessages] = useState([INITIAL_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg = { id: Date.now(), role: 'user', text: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const result = await sendProfeIAMessage({
        mensaje: trimmed,
        docenteId,
        fecha: new Date().toISOString().split('T')[0],
        grado
      })
      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        text: typeof result === 'string' ? result : (result.respuesta || JSON.stringify(result))
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'error',
        text: 'Sin conexión con el asistente. Configura el webhook en el Panel de Admin.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  // Auto-resize textarea
  const handleInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
  }

  return (
    <div className="profe-ia-wrap">
      {/* Header */}
      <div className="profe-ia-bar">
        <Sparkles className="w-3.5 h-3.5 text-[#4285F4] flex-shrink-0" />
        <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-widest">ProfeIA</span>
      </div>

      {/* Messages */}
      <div className="profe-ia-msgs">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-row chat-row-${msg.role}`}>
            {msg.role === 'user' && (
              <div className="bubble-user">{msg.text}</div>
            )}
            {msg.role === 'ai' && (
              <div className="bubble-ai">{msg.text}</div>
            )}
            {msg.role === 'error' && (
              <div className="bubble-error">{msg.text}</div>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-row chat-row-ai">
            <div className="bubble-ai">
              <span className="typing-dots"><span/><span/><span/></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="profe-ia-chips">
        {QUICK_PROMPTS.map(p => (
          <button key={p} className="chip" onClick={() => send(p)}>{p}</button>
        ))}
      </div>

      {/* Input area */}
      <div className="profe-ia-input-row">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKey}
          placeholder="Escribe un mensaje…"
          className="profe-ia-textarea"
          rows={1}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="profe-ia-send"
          aria-label="Enviar"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default ProfeIAChat
```

- [ ] **Step 2: Commit**

```bash
cd profeia
git add client/src/components/ProfeIAChat.jsx
git commit -m "feat: add ProfeIAChat component with webhook integration and quick prompts"
```

---

## Task 8 — Sidebar Component

**Files:**
- Create: `client/src/components/Sidebar.jsx`

The sidebar wraps TeacherAvatar + greeting + reminders (top), ProfeIAChat (middle, flex-1), and quick tool buttons (bottom). Collapsible via a toggle arrow.

- [ ] **Step 1: Create Sidebar.jsx**

Create `profeia/client/src/components/Sidebar.jsx`:

```jsx
import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight,
  CalendarCheck, BookOpen, FileText, Settings
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TeacherAvatar from './TeacherAvatar'
import ProfeIAChat from './ProfeIAChat'

const GREETINGS = [
  { from: 6,  to: 12, text: 'Buenos días' },
  { from: 12, to: 19, text: 'Buenas tardes' },
  { from: 0,  to: 6,  text: 'Buenas noches' },
  { from: 19, to: 24, text: 'Buenas noches' }
]

const REMINDERS = [
  '¿Ya registraste la asistencia de hoy?',
  'Recuerda actualizar la bitácora',
  'Revisa tus planeaciones de esta semana',
  'El trimestre avanza — verifica tu cobertura',
  '¿Hay algún alumno que necesite seguimiento?',
  'Comparte avances con los padres de familia',
  'Consulta el calendario de evaluaciones',
  'ProfeIA puede ayudarte a planear mañana'
]

function getGreeting() {
  const h = new Date().getHours()
  return GREETINGS.find(g => h >= g.from && h < g.to)?.text || 'Buenas noches'
}

/**
 * Sidebar
 * Props:
 *   prefs: { genero, nombre } | null
 *   docenteId: number | null
 */
function Sidebar({ prefs, docenteId }) {
  const [collapsed, setCollapsed] = useState(false)
  const [reminderIdx, setReminderIdx] = useState(0)
  const [reminderVisible, setReminderVisible] = useState(true)
  const navigate = useNavigate()

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    if (mq.matches) setCollapsed(true)
    const handler = (e) => { if (e.matches) setCollapsed(true) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Rotate reminders every 5 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setReminderVisible(false)
      setTimeout(() => {
        setReminderIdx(i => (i + 1) % REMINDERS.length)
        setReminderVisible(true)
      }, 400)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const genero = prefs?.genero || 'maestro'
  const nombre = prefs?.nombre?.split(' ')[0] || 'Profe'
  const greeting = getGreeting()

  const TOOLS = [
    { icon: CalendarCheck, label: 'Asistencia', color: '#34A853' },
    { icon: BookOpen, label: 'Bitácora', color: '#FBBC04' },
    { icon: FileText, label: 'Planeación', color: '#4285F4' }
  ]

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="sidebar-toggle"
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-4 h-4" />
          : <ChevronLeft className="w-4 h-4" />
        }
      </button>

      {/* ── TOP: Avatar + Greeting ── */}
      <div className={`sidebar-top ${collapsed ? 'sidebar-top-collapsed' : ''}`}>
        <div className="flex justify-center">
          <TeacherAvatar genero={genero} size={collapsed ? 40 : 72} animated />
        </div>

        {!collapsed && (
          <>
            <div className="text-center mt-2">
              <p className="text-sm font-bold text-[#202124]">
                {greeting}, {nombre}
              </p>
              <p className="text-[10px] text-[#9aa0a6] capitalize">{genero}</p>
            </div>
            <div
              className="reminder-chip"
              style={{ opacity: reminderVisible ? 1 : 0 }}
            >
              {REMINDERS[reminderIdx]}
            </div>
          </>
        )}
      </div>

      {/* ── MIDDLE: ProfeIA Chat ── */}
      {!collapsed && (
        <div className="sidebar-chat">
          <ProfeIAChat docenteId={docenteId} grado={null} />
        </div>
      )}

      {/* ── BOTTOM: Quick Tools ── */}
      <div className={`sidebar-tools ${collapsed ? 'sidebar-tools-collapsed' : ''}`}>
        {TOOLS.map(({ icon: Icon, label, color }) => (
          <button
            key={label}
            className="tool-btn"
            title={label}
            aria-label={label}
          >
            <Icon className="w-5 h-5" style={{ color }} />
            {!collapsed && <span className="tool-label">{label}</span>}
          </button>
        ))}
        <button
          className="tool-btn"
          title="Admin"
          aria-label="Panel de Admin"
          onClick={() => navigate('/admin')}
        >
          <Settings className="w-5 h-5 text-[#9aa0a6]" />
          {!collapsed && <span className="tool-label text-[#9aa0a6]">Admin</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
```

- [ ] **Step 2: Commit**

```bash
cd profeia
git add client/src/components/Sidebar.jsx
git commit -m "feat: add collapsible Sidebar with greeting, reminders, and quick tools"
```

---

## Task 9 — Notification Dropdown

**Files:**
- Create: `client/src/components/NotificationDropdown.jsx`

- [ ] **Step 1: Create NotificationDropdown.jsx**

Create `profeia/client/src/components/NotificationDropdown.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react'
import { Bell, AlertTriangle, Clock, Lightbulb, X, Check } from 'lucide-react'

const TABS = [
  { key: 'urgente',      label: 'Urgente',      icon: AlertTriangle, color: '#EA4335' },
  { key: 'recordatorio', label: 'Recordatorio',  icon: Clock,         color: '#FBBC04' },
  { key: 'sugerencia',   label: 'Sugerencia',    icon: Lightbulb,     color: '#4285F4' }
]

// Map prioridad → tab
function mapTab(prioridad) {
  if (prioridad === 'urgente') return 'urgente'
  if (prioridad === 'alta' || prioridad === 'media') return 'recordatorio'
  return 'sugerencia'
}

/**
 * NotificationDropdown
 * Props:
 *   notifications: array of sugerencia objects (from existing API)
 *   onAccept: (id) => void
 *   onDismiss: (id) => void
 */
function NotificationDropdown({ notifications = [], onAccept, onDismiss }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('urgente')
  const [read, setRead] = useState(new Set())
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifications.filter(n => !read.has(n.id)).length

  const markRead = (id) => setRead(prev => new Set([...prev, id]))

  const tabItems = notifications.filter(n => mapTab(n.prioridad) === activeTab)

  const tabDot = (tabKey) => {
    const count = notifications.filter(n => mapTab(n.prioridad) === tabKey && !read.has(n.id)).length
    return count > 0 ? count : null
  }

  return (
    <div className="notif-root" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="notif-bell"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="notif-dropdown animate-slide-down">
          {/* Header */}
          <div className="notif-header">
            <h3 className="font-bold text-[#202124] text-sm">Notificaciones</h3>
            <button
              onClick={() => { notifications.forEach(n => markRead(n.id)); setOpen(false) }}
              className="text-xs text-[#4285F4] hover:underline"
            >
              Marcar todo como leído
            </button>
          </div>

          {/* Tabs */}
          <div className="notif-tabs">
            {TABS.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`notif-tab ${activeTab === key ? 'notif-tab-active' : ''}`}
                style={activeTab === key ? { color, borderBottomColor: color } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {tabDot(key) && (
                  <span className="notif-tab-dot" style={{ background: color }}>
                    {tabDot(key)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="notif-items">
            {tabItems.length === 0 ? (
              <div className="notif-empty">
                <Bell className="w-8 h-8 text-[#e8eaed] mx-auto mb-2" />
                <p className="text-sm text-[#9aa0a6]">Sin notificaciones</p>
              </div>
            ) : (
              tabItems.map(n => {
                const TabIcon = TABS.find(t => t.key === mapTab(n.prioridad))?.icon || Lightbulb
                const color = TABS.find(t => t.key === mapTab(n.prioridad))?.color || '#4285F4'
                return (
                  <div
                    key={n.id}
                    className={`notif-item ${!read.has(n.id) ? 'notif-item-unread' : ''}`}
                    onClick={() => markRead(n.id)}
                  >
                    <TabIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#202124] truncate">{n.titulo}</p>
                      <p className="text-xs text-[#5f6368] mt-0.5 line-clamp-2">{n.descripcion}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {onAccept && (
                        <button
                          onClick={e => { e.stopPropagation(); markRead(n.id); onAccept(n.id) }}
                          className="p-1 rounded-full hover:bg-[#34A853]/10 text-[#34A853]"
                          title="Aceptar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); markRead(n.id); onDismiss?.(n.id) }}
                        className="p-1 rounded-full hover:bg-[#f1f3f4] text-[#9aa0a6]"
                        title="Descartar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
```

- [ ] **Step 2: Commit**

```bash
cd profeia
git add client/src/components/NotificationDropdown.jsx
git commit -m "feat: add NotificationDropdown with tabbed categories (Urgente/Recordatorio/Sugerencia)"
```

---

## Task 10 — Admin Panel Page

**Files:**
- Create: `client/src/pages/AdminPanel.jsx`

- [ ] **Step 1: Create AdminPanel.jsx**

Create `profeia/client/src/pages/AdminPanel.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileText, Trash2, ArrowLeft,
  CheckCircle, Clock, AlertCircle, Settings, Save, ChevronDown
} from 'lucide-react'
import { uploadDocument, getDocuments, deleteDocument, getWebhookUrl, saveWebhookUrl } from '../api'

const CATEGORIAS = ['NEM', 'Leyes', 'Normas', 'Recursos', 'Planes de Estudio', 'Otro']

const ESTADO_ICON = {
  listo:       { icon: CheckCircle,  color: '#34A853', label: 'Listo' },
  procesando:  { icon: Clock,        color: '#FBBC04', label: 'Procesando' },
  error:       { icon: AlertCircle,  color: '#EA4335', label: 'Error' }
}

function AdminPanel() {
  const navigate = useNavigate()
  const [docs, setDocs] = useState([])
  const [categoria, setCategoria] = useState('NEM')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [showConfig, setShowConfig] = useState(false)
  const [webhookInput, setWebhookInput] = useState('')
  const [webhookSaved, setWebhookSaved] = useState(false)

  useEffect(() => {
    loadDocs()
    setWebhookInput(getWebhookUrl())
  }, [])

  const loadDocs = async () => {
    try { setDocs(await getDocuments()) } catch { /* server may not be running */ }
  }

  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return
    setUploading(true)
    setUploadError(null)
    try {
      await uploadDocument(accepted[0], categoria)
      await loadDocs()
    } catch (err) {
      setUploadError(err.message || 'Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }, [categoria])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading
  })

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este documento?')) return
    try { await deleteDocument(id); await loadDocs() } catch {}
  }

  const handleSaveWebhook = () => {
    saveWebhookUrl(webhookInput)
    setWebhookSaved(true)
    setTimeout(() => setWebhookSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Header */}
      <header className="bg-white border-b border-[#e8eaed] px-6 py-3 flex items-center gap-4 sticky top-0 z-40">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-[#5f6368] hover:text-[#202124] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Profeia
        </button>
        <span className="text-[#e8eaed]">|</span>
        <h1 className="text-base font-bold text-[#202124]">Panel de Administración</h1>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* ── Upload Zone ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-[#e8eaed] p-6">
          <h2 className="text-base font-bold text-[#202124] mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#4285F4]" />
            Subir documento PDF
          </h2>

          {/* Category selector */}
          <div className="mb-4">
            <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Categoría</label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="input-google"
            >
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`admin-dropzone ${isDragActive ? 'admin-dropzone-active' : ''} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-[#4285F4]' : 'text-[#9aa0a6]'}`} />
            {uploading ? (
              <p className="text-sm text-[#4285F4] font-medium">Subiendo…</p>
            ) : isDragActive ? (
              <p className="text-sm text-[#4285F4] font-medium">Suelta el PDF aquí</p>
            ) : (
              <>
                <p className="text-sm text-[#5f6368]">
                  Arrastra un PDF aquí o <span className="text-[#4285F4] font-medium cursor-pointer">busca en tu equipo</span>
                </p>
                <p className="text-xs text-[#9aa0a6] mt-1">Solo PDF · Máximo 50 MB</p>
              </>
            )}
          </div>

          {uploadError && (
            <p className="text-sm text-[#EA4335] mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />{uploadError}
            </p>
          )}
        </section>

        {/* ── Document Library ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-[#e8eaed] p-6">
          <h2 className="text-base font-bold text-[#202124] mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4285F4]" />
            Librería de documentos
            <span className="ml-auto text-xs text-[#9aa0a6] font-normal">{docs.length} documentos</span>
          </h2>

          {docs.length === 0 ? (
            <div className="text-center py-10 text-[#9aa0a6]">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay documentos aún. Sube el primero arriba.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f1f3f4] text-xs text-[#9aa0a6] uppercase tracking-wider">
                    <th className="text-left py-2 font-medium">Nombre</th>
                    <th className="text-left py-2 font-medium">Categoría</th>
                    <th className="text-left py-2 font-medium">Fecha</th>
                    <th className="text-left py-2 font-medium">Estado</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {docs.map(doc => {
                    const st = ESTADO_ICON[doc.estado] || ESTADO_ICON.procesando
                    const Icon = st.icon
                    return (
                      <tr key={doc.id} className="border-b border-[#f8f9fa] hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-3 pr-4 max-w-[220px]">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#EA4335] flex-shrink-0" />
                            <span className="truncate text-[#202124]">{doc.nombre}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#4285F4]/08 text-[#4285F4]">
                            {doc.categoria}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-[#5f6368] text-xs whitespace-nowrap">
                          {new Date(doc.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: st.color }}>
                            <Icon className="w-3.5 h-3.5" />{st.label}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 rounded-lg hover:bg-[#EA4335]/08 text-[#9aa0a6] hover:text-[#EA4335] transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Webhook Config ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-[#e8eaed] overflow-hidden">
          <button
            onClick={() => setShowConfig(c => !c)}
            className="w-full px-6 py-4 flex items-center gap-2 text-left hover:bg-[#f8f9fa] transition-colors"
          >
            <Settings className="w-4 h-4 text-[#9aa0a6]" />
            <h2 className="text-base font-bold text-[#202124]">Configuración del Asistente</h2>
            <ChevronDown className={`w-4 h-4 text-[#9aa0a6] ml-auto transition-transform ${showConfig ? 'rotate-180' : ''}`} />
          </button>

          {showConfig && (
            <div className="px-6 pb-6 pt-2 border-t border-[#f1f3f4]">
              <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">
                URL del Webhook de ProfeIA (n8n)
              </label>
              <p className="text-xs text-[#9aa0a6] mb-3">
                Esta URL se usa para comunicar ProfeIA con tu flujo de n8n. Puedes cambiarla sin tocar el código.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookInput}
                  onChange={e => setWebhookInput(e.target.value)}
                  className="input-google flex-1"
                  placeholder="https://n8n.tudominio.com/webhook/profeia-chat"
                />
                <button
                  onClick={handleSaveWebhook}
                  className="btn-primary flex items-center gap-2 px-4 whitespace-nowrap"
                >
                  <Save className="w-4 h-4" />
                  {webhookSaved ? '¡Guardado!' : 'Guardar'}
                </button>
              </div>
              <p className="text-xs text-[#9aa0a6] mt-2">
                Prioridad: valor guardado aquí {'>'} variable VITE_N8N_WEBHOOK_URL {'>'} URL de prueba.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default AdminPanel
```

- [ ] **Step 2: Commit**

```bash
cd profeia
git add client/src/pages/AdminPanel.jsx
git commit -m "feat: add AdminPanel with drag-drop upload, document library, and webhook config"
```

---

## Task 11 — Refactor App.jsx + Update main.jsx

**Files:**
- Modify: `client/src/main.jsx`
- Rewrite: `client/src/App.jsx`

- [ ] **Step 1: Update main.jsx**

Replace the entire content of `profeia/client/src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 2: Rewrite App.jsx**

Replace the entire content of `profeia/client/src/App.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import Calendar from './components/Calendar'
import DayPanel from './components/DayPanel'
import Sidebar from './components/Sidebar'
import AvatarModal from './components/AvatarModal'
import NotificationDropdown from './components/NotificationDropdown'
import AdminPanel from './pages/AdminPanel'
import GeoShapes from './components/GeoShapes'
import { api } from './api'
import {
  ChevronLeft, ChevronRight, Sparkle
} from 'lucide-react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// ── Load prefs from localStorage ──
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem('profeia_prefs')) } catch { return null }
}

function MainLayout() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [docente, setDocente] = useState(null)
  const [prefs, setPrefs] = useState(loadPrefs)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showDayPanel, setShowDayPanel] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [stats, setStats] = useState({ planeaciones: 0, bitacora: 0, eventos: 0, sugerenciasPendientes: 0 })

  const mesActual = currentDate.getMonth()
  const anioActual = currentDate.getFullYear()

  useEffect(() => {
    const init = async () => {
      try {
        const docentes = await api.getDocentes()
        if (docentes.length === 0) {
          setShowOnboarding(true)
        } else {
          const d = docentes[0]
          setDocente(d)
          // Sync name into prefs if missing
          if (!prefs?.nombre) {
            const p = { genero: prefs?.genero || 'maestro', nombre: d.nombre }
            localStorage.setItem('profeia_prefs', JSON.stringify(p))
            setPrefs(p)
          }
          loadSuggestions(d.id)
          loadStats(d.id)
        }
      } catch (e) {
        console.error('Init error:', e)
      }
    }
    init()
  }, [])

  const loadSuggestions = useCallback(async (id) => {
    try { setSuggestions(await api.getRecomendaciones(id)) } catch {}
  }, [])

  const loadStats = useCallback(async (id) => {
    try { setStats(await api.getStats(id)) } catch {}
  }, [])

  const handleCreateDocente = async ({ nombre, escuela, clave_escuela, genero }) => {
    try {
      const d = await api.createDocente({ nombre, escuela, clave_escuela })
      setDocente(d)
      setShowOnboarding(false)
      const p = { genero, nombre }
      setPrefs(p)
      localStorage.setItem('profeia_prefs', JSON.stringify(p))
      loadSuggestions(d.id)
      loadStats(d.id)
    } catch (e) {
      console.error('Create docente error:', e)
    }
  }

  const handleAcceptSuggestion = async (id) => {
    try { await api.aceptarSugerencia(docente?.id, id); loadSuggestions(docente?.id) } catch {}
  }

  const handleDismissSuggestion = async (id) => {
    try { await api.rechazarSugerencia(docente?.id, id); loadSuggestions(docente?.id) } catch {}
  }

  return (
    <div className="app-root">
      <div className="bg-mesh" />
      <GeoShapes />

      {showOnboarding && <AvatarModal onCreate={handleCreateDocente} />}

      {/* ── Sidebar ── */}
      <Sidebar prefs={prefs} docenteId={docente?.id} />

      {/* ── Main Area ── */}
      <div className="main-area">
        {/* Header */}
        <header className="main-header">
          <div className="flex items-center gap-3">
            <div className="logo-container">
              <div className="logo-bg">
                <span className="logo-p">P</span>
              </div>
              <Sparkle className="logo-sparkle" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="hero-title text-xl">
                {'Profeia'.split('').map((letter, i) => (
                  <span key={i} className="hero-letter" style={{ animationDelay: `${i * 0.08}s` }}>
                    {letter}
                  </span>
                ))}
              </h1>
              <p className="text-[9px] text-[#5f6368] tracking-wider -mt-0.5 hidden sm:block">
                ASISTENTE INTELIGENTE · TELESECUNDARIA
              </p>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date(anioActual, mesActual - 1, 1))}
              className="p-1.5 rounded-full hover:bg-[#f1f3f4] transition-colors text-[#5f6368]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[140px]">
              <h2 className="text-base font-bold text-[#202124]">
                {MESES[mesActual]} <span className="text-[#5f6368] font-normal text-sm">{anioActual}</span>
              </h2>
            </div>
            <button
              onClick={() => setCurrentDate(new Date(anioActual, mesActual + 1, 1))}
              className="p-1.5 rounded-full hover:bg-[#f1f3f4] transition-colors text-[#5f6368]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => { const t = new Date(); setCurrentDate(t); setSelectedDate(t) }}
              className="ml-1 px-3 py-1 rounded-full bg-[#4285F4]/10 text-[#4285F4] text-xs font-medium hover:bg-[#4285F4]/15 transition-colors"
            >
              Hoy
            </button>
          </div>

          {/* Right: Stats + Bell */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 text-xs text-[#5f6368]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                <span className="font-medium">{stats.planeaciones}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FBBC04]" />
                <span className="font-medium">{stats.bitacora}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#A142F4]" />
                <span className="font-medium">{stats.eventos}</span>
              </span>
            </div>
            <NotificationDropdown
              notifications={suggestions}
              onAccept={handleAcceptSuggestion}
              onDismiss={handleDismissSuggestion}
            />
          </div>
        </header>

        {/* Calendar */}
        <main className="main-content">
          <Calendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            docenteId={docente?.id}
            onDayClick={(date) => { setSelectedDate(date); setShowDayPanel(true) }}
          />
        </main>
      </div>

      {showDayPanel && docente && (
        <DayPanel
          date={selectedDate}
          docenteId={docente.id}
          onClose={() => setShowDayPanel(false)}
          onRefresh={() => { loadSuggestions(docente.id); loadStats(docente.id) }}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  )
}

export default App
```

- [ ] **Step 3: Smoke test — start both server and client**

```bash
# Terminal 1
cd profeia/server && node index.js

# Terminal 2
cd profeia/client && npm run dev
```

Open http://localhost:3000 and verify:
- If no docente in DB: AvatarModal appears (two avatar cards visible)
- After onboarding: sidebar visible on left (avatar + greeting + ProfeIA area)
- Calendar renders on the right
- Bell icon in header shows notification dropdown on click
- Navigating to http://localhost:3000/admin renders the Admin Panel

- [ ] **Step 4: Commit**

```bash
cd profeia
git add client/src/main.jsx client/src/App.jsx
git commit -m "feat: new sidebar+main layout with router, AvatarModal, and NotificationDropdown"
```

---

## Task 12 — CSS: New Styles

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Append styles to index.css**

Add the following at the very end of `profeia/client/src/index.css`:

```css
/* ===== App Root Layout ===== */
.app-root {
  display: flex;
  min-height: 100vh;
  position: relative;
}

/* ===== Sidebar ===== */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 300px;
  background: var(--surface);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  z-index: 40;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-toggle {
  position: absolute;
  top: 50%;
  right: -14px;
  transform: translateY(-50%);
  z-index: 50;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}

.sidebar-toggle:hover {
  background: var(--g-blue);
  color: white;
  border-color: var(--g-blue);
}

/* Sidebar sections */
.sidebar-top {
  padding: 20px 12px 12px;
  border-bottom: 1px solid var(--border-light);
}

.sidebar-top-collapsed {
  padding: 16px 10px;
  display: flex;
  justify-content: center;
}

.sidebar-chat {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-tools {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 8px 12px;
  border-top: 1px solid var(--border-light);
}

.sidebar-tools-collapsed {
  align-items: center;
  padding: 8px 0 12px;
}

/* Reminder chip */
.reminder-chip {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(66, 133, 244, 0.06);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
  transition: opacity 0.35s ease;
  line-height: 1.4;
}

/* Tool buttons */
.tool-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
  color: var(--text-secondary);
  text-align: left;
  width: 100%;
}

.tool-btn:hover {
  background: var(--surface-hover);
}

.tool-label {
  font-size: 13px;
  font-weight: 500;
}

/* ===== Main Area ===== */
.main-area {
  margin-left: 300px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Adjust for collapsed sidebar — JS adds data attribute */
.sidebar-collapsed ~ .main-area,
[data-sidebar-collapsed="true"] .main-area {
  margin-left: 60px;
}

.main-header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-light);
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.main-content {
  flex: 1;
  padding: 20px;
  padding-bottom: 40px;
}

/* ===== ProfeIA Chat ===== */
.profe-ia-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.profe-ia-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
  background: rgba(66,133,244,0.03);
  flex-shrink: 0;
}

.profe-ia-msgs {
  flex: 1;
  overflow-y: auto;
  padding: 10px 10px 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-row { display: flex; }
.chat-row-user { justify-content: flex-end; }
.chat-row-ai,
.chat-row-error { justify-content: flex-start; }

.bubble-user {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 16px 16px 4px 16px;
  background: var(--g-blue);
  color: white;
  font-size: 12px;
  line-height: 1.5;
}

.bubble-ai {
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 16px 16px 16px 4px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.5;
  box-shadow: var(--shadow-sm);
}

.bubble-error {
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 16px 16px 16px 4px;
  background: rgba(234,67,53,0.06);
  border: 1px solid rgba(234,67,53,0.2);
  font-size: 11px;
  color: var(--g-red);
  line-height: 1.5;
}

/* Typing dots */
.typing-dots {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 16px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-tertiary);
  animation: typingBounce 1.2s ease-in-out infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-6px); opacity: 1; }
}

/* Quick prompt chips */
.profe-ia-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 10px;
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
}

.chip {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.chip:hover {
  border-color: var(--g-blue);
  color: var(--g-blue);
  background: rgba(66,133,244,0.04);
}

/* Input area */
.profe-ia-input-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
}

.profe-ia-textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--surface);
  outline: none;
  line-height: 1.4;
  max-height: 96px;
  overflow-y: auto;
  transition: border-color 0.15s ease;
}

.profe-ia-textarea:focus {
  border-color: var(--g-blue);
  box-shadow: 0 0 0 2px rgba(66,133,244,0.1);
}

.profe-ia-textarea::placeholder { color: var(--text-tertiary); font-size: 11px; }

.profe-ia-send {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--g-blue);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.profe-ia-send:hover:not(:disabled) {
  background: #3367d6;
  transform: scale(1.05);
}

.profe-ia-send:disabled {
  background: var(--border);
  cursor: not-allowed;
}

/* ===== Notifications ===== */
.notif-root {
  position: relative;
}

.notif-bell {
  position: relative;
  padding: 8px;
  border-radius: 50%;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-bell:hover { background: var(--surface-hover); }

.notif-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  background: var(--g-red);
  border-radius: var(--radius-full);
  font-size: 9px;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border: 1.5px solid white;
}

.notif-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 340px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  z-index: 200;
  overflow: hidden;
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-light);
}

.notif-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-light);
}

.notif-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 10px 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.notif-tab:hover { background: var(--surface-hover); color: var(--text-primary); }
.notif-tab-active { font-weight: 600; }

.notif-tab-dot {
  min-width: 14px;
  height: 14px;
  border-radius: var(--radius-full);
  font-size: 9px;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.notif-items {
  max-height: 320px;
  overflow-y: auto;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.15s ease;
}

.notif-item:hover { background: var(--surface-hover); }
.notif-item:last-child { border-bottom: none; }

.notif-item-unread { background: rgba(66,133,244,0.03); }

.notif-empty {
  padding: 32px 16px;
  text-align: center;
}

/* ===== Admin Dropzone ===== */
.admin-dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--surface-hover);
}

.admin-dropzone:hover {
  border-color: var(--g-blue);
  background: rgba(66,133,244,0.03);
}

.admin-dropzone-active {
  border-color: var(--g-blue);
  background: rgba(66,133,244,0.06);
  box-shadow: 0 0 0 4px rgba(66,133,244,0.1);
}

/* animate-spin-slow for sparkle in AvatarModal */
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin-slow { animation: spin-slow 4s linear infinite; }
```

- [ ] **Step 2: Verify no broken layout**

Open http://localhost:3000 in browser. Verify:
- Sidebar is visible on the left, calendar on the right
- In collapsed state (click toggle), sidebar shrinks to 60px
- Chat messages show correct bubble styles
- Admin panel at `/admin` shows correct layout

- [ ] **Step 3: Commit**

```bash
cd profeia
git add client/src/index.css
git commit -m "feat: add sidebar, chat, notification, dropzone, and admin CSS styles"
```

---

## Task 13 — Supabase Setup SQL

**Files:**
- Create: `docs/supabase-setup.sql`

- [ ] **Step 1: Create the SQL file**

Create `profeia/docs/supabase-setup.sql` (note: inside the `profeia/` directory, alongside the existing `docs/` at repo root):

Actually, create it at repo root: `docs/supabase-setup.sql`

```sql
-- ============================================================
-- ProfeIA — Supabase Production Schema
-- PostgreSQL 15 + pgvector
-- ============================================================
-- Embedding model: text-embedding-v2 (Alibaba / Dashscope)
-- Dimensions: 1536
-- Cosine similarity recommended for semantic search
-- ============================================================

-- Enable pgvector extension (run as superuser)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- DOMAIN: Schools & Users
-- ============================================================

CREATE TABLE IF NOT EXISTS schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  cct        TEXT UNIQUE,        -- Clave de Centro de Trabajo
  zone       TEXT,
  state      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  role       TEXT DEFAULT 'teacher',   -- teacher | admin | coordinator
  grade      INT,                       -- 1, 2 or 3 (telesecundaria)
  group_label TEXT,                     -- e.g. "A", "B"
  genero     TEXT DEFAULT 'maestro',    -- maestro | maestra (UI preference)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  academic_context     TEXT,   -- free-text description of group context
  group_strengths      TEXT,
  group_challenges     TEXT,
  estimated_pace       TEXT DEFAULT 'normal',  -- slow | normal | fast
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DOMAIN: Structured Curriculum (NEM)
-- ============================================================

CREATE TABLE IF NOT EXISTS curriculum_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,   -- e.g. "Lenguajes", "Saberes y Pensamiento Científico"
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curriculum_phases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id     UUID REFERENCES curriculum_fields(id) ON DELETE CASCADE,
  phase_number INT NOT NULL CHECK (phase_number BETWEEN 1 AND 6),
  grade_range  TEXT,    -- e.g. "7-9"
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academic_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id        UUID REFERENCES curriculum_fields(id),
  phase_id        UUID REFERENCES curriculum_phases(id),
  trimester       INT CHECK (trimester BETWEEN 1 AND 3),
  sequence_number INT,
  name            TEXT NOT NULL,
  description     TEXT,
  suggested_days  INT,
  priority        INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  is_flexible     BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partial_projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_project_id UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  sequence_order      INT,
  suggested_days      INT
);

CREATE TABLE IF NOT EXISTS pda_catalog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id    UUID REFERENCES curriculum_fields(id),
  code        TEXT,
  description TEXT NOT NULL,
  level       TEXT,   -- inicial | en desarrollo | logrado
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_pda_links (
  project_id      UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  pda_id          UUID REFERENCES pda_catalog(id) ON DELETE CASCADE,
  relevance_score NUMERIC(3,2) DEFAULT 1.0,
  PRIMARY KEY (project_id, pda_id)
);

CREATE TABLE IF NOT EXISTS project_dependencies (
  project_id             UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  depends_on_project_id  UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, depends_on_project_id)
);

-- ============================================================
-- DOMAIN: Calendar
-- ============================================================

CREATE TABLE IF NOT EXISTS school_years (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  total_working_days INT,
  label             TEXT    -- e.g. "2025-2026"
);

CREATE TABLE IF NOT EXISTS school_calendar_days (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id UUID REFERENCES school_years(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('working','holiday','suspension','event')),
  label          TEXT,
  UNIQUE (school_year_id, date)
);

CREATE TABLE IF NOT EXISTS teacher_calendars (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  school_year_id UUID REFERENCES school_years(id),
  generated_at   TIMESTAMPTZ DEFAULT now(),
  version        INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS calendar_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_calendar_id UUID REFERENCES teacher_calendars(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  entry_type          TEXT NOT NULL CHECK (entry_type IN (
                        'academic_project','codesign','extracurricular','recovery','buffer')),
  academic_project_id UUID REFERENCES academic_projects(id),
  codesign_id         UUID,    -- FK to codesigns added below
  time_start          TIME,
  time_end            TIME,
  status              TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','skipped','rescheduled')),
  notes               TEXT
);

CREATE TABLE IF NOT EXISTS calendar_adjustments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_calendar_id UUID REFERENCES teacher_calendars(id) ON DELETE CASCADE,
  triggered_at        TIMESTAMPTZ DEFAULT now(),
  reason              TEXT,
  affected_entries_count INT,
  adjustment_type     TEXT CHECK (adjustment_type IN ('shift','compress','drop','codesign_insert')),
  impact_summary      TEXT
);

-- ============================================================
-- DOMAIN: Codiseño
-- ============================================================

CREATE TABLE IF NOT EXISTS codesigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  cultural_trigger  TEXT,
  pda_justification TEXT,
  suggested_days    INT,
  created_by        TEXT DEFAULT 'teacher' CHECK (created_by IN ('teacher','ai')),
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','completed','cancelled')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Add FK to calendar_entries after codesigns is created
ALTER TABLE calendar_entries
  ADD CONSTRAINT fk_codesign
  FOREIGN KEY (codesign_id) REFERENCES codesigns(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS codesign_pda_links (
  codesign_id UUID REFERENCES codesigns(id) ON DELETE CASCADE,
  pda_id      UUID REFERENCES pda_catalog(id) ON DELETE CASCADE,
  PRIMARY KEY (codesign_id, pda_id)
);

-- ============================================================
-- DOMAIN: Live Teaching Context
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,
  date                  DATE NOT NULL,
  narrative             TEXT,
  advances              TEXT,
  difficulties          TEXT,
  participation_level   INT CHECK (participation_level BETWEEN 1 AND 5),
  behavior_notes        TEXT,
  group_needs           TEXT,
  ideas_for_tomorrow    TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  total_students  INT,
  present         INT,
  absent_ids      UUID[],   -- array of student UUIDs
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS evaluation_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id  UUID,
  date        DATE NOT NULL,
  criteria    TEXT,
  score       NUMERIC(5,2),
  observation TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interest_signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  detected_at  TIMESTAMPTZ DEFAULT now(),
  signal_type  TEXT CHECK (signal_type IN ('cultural','topic','trend','teacher_note')),
  description  TEXT NOT NULL,
  strength     INT DEFAULT 3 CHECK (strength BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS pedagogical_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  alert_type      TEXT CHECK (alert_type IN ('rezago','interest_spike','pace_risk','coverage_risk')),
  severity        TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  message         TEXT NOT NULL,
  suggested_action TEXT,
  resolved        BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- DOMAIN: RAG — Document Store with pgvector
-- ============================================================
-- Embedding model: Alibaba text-embedding-v2
-- API: DashScope (https://dashscope.aliyuncs.com)
-- Endpoint: POST /api/v1/services/embeddings/text-embedding/text-embedding
-- Dimensions: 1536 (fixed for text-embedding-v2)
-- Similarity metric: cosine
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  source_type       TEXT CHECK (source_type IN (
                      'libro_proyectos','pda','recurso','ley','norma','plan_estudio','otro')),
  field_id          UUID REFERENCES curriculum_fields(id),
  grade             INT,
  trimester         INT,
  file_path         TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
                      'pending','processing','completed','error')),
  uploaded_by       UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID REFERENCES documents(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  chunk_index    INT,
  page_number    INT,
  section_title  TEXT,
  metadata       JSONB DEFAULT '{}',
  -- Embedding: Alibaba text-embedding-v2, 1536 dimensions
  embedding      vector(1536),
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- IVFFlat index for approximate nearest neighbor (cosine similarity)
-- nlist=100 works well for up to ~1M vectors; increase for larger corpora
CREATE INDEX IF NOT EXISTS idx_chunk_embedding
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE IF NOT EXISTS chunk_tags (
  chunk_id   UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
  tag_type   TEXT CHECK (tag_type IN ('field','project','pda','grade','activity_type')),
  tag_value  TEXT,
  PRIMARY KEY (chunk_id, tag_type, tag_value)
);

CREATE TABLE IF NOT EXISTS retrieval_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id),
  query               TEXT NOT NULL,
  retrieved_chunk_ids UUID[],
  model_used          TEXT,
  response_summary    TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (skeleton — enable per table as needed)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_logs ENABLE ROW LEVEL SECURITY;

-- Example policy: teachers see only their own data
-- Replace 'auth.uid()' with your Supabase auth function
-- CREATE POLICY "users_own_data" ON teacher_calendars
--   FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- USEFUL QUERY: Semantic search with cosine similarity
-- ============================================================
-- SELECT
--   dc.content,
--   dc.section_title,
--   d.title AS document_title,
--   1 - (dc.embedding <=> '[...your 1536-dim vector...]'::vector) AS similarity
-- FROM document_chunks dc
-- JOIN documents d ON dc.document_id = d.id
-- WHERE 1 - (dc.embedding <=> '[...vector...]'::vector) > 0.75
-- ORDER BY dc.embedding <=> '[...vector...]'::vector
-- LIMIT 5;
-- ============================================================
```

- [ ] **Step 2: Commit**

```bash
cd profeia
git add docs/supabase-setup.sql
git commit -m "feat: add Supabase pgvector schema with text-embedding-v2 (1536 dims)"
```

---

## Task 14 — Push to GitHub

- [ ] **Step 1: Final verification — run both server and client**

```bash
# Terminal 1
cd profeia/server && node index.js
# Expected: 🚀 Profeia API running on port 3001

# Terminal 2
cd profeia/client && npm run dev
# Expected: Local: http://localhost:3000/
```

Open browser and verify the complete flow:
1. Clear localStorage (`localStorage.clear()` in console) to trigger AvatarModal
2. Choose Maestra → enter data → verify sidebar appears with avatar + greeting
3. Type a message in ProfeIA chat → verify error bubble (no n8n yet, expected)
4. Navigate to `/admin` → verify upload zone + categories + webhook config
5. Go back to `/` → sidebar still visible
6. Bell icon → click → verify notification dropdown opens with 3 tabs

- [ ] **Step 2: Push to origin**

```bash
cd /path/to/PIEM  # repo root
git push origin main
```

- [ ] **Step 3: Confirm push**

```bash
git log --oneline -10
```

Expected: all 12+ commits visible in log.

---

## Self-Review Checklist

**Spec coverage:**
- [x] Avatar modal (Maestro/Maestra, localStorage) → Tasks 5, 6
- [x] Greeting system (hour-based, rotating reminders every 5s) → Task 8
- [x] Notifications (Bell, badge, 3 tabs) → Task 9
- [x] Admin Panel (/admin, drag&drop, categories, library) → Task 10
- [x] Webhook config in Admin Panel → Task 10
- [x] VITE_N8N_WEBHOOK_URL env var → Task 2
- [x] ProfeIA sidebar chat + quick prompts + context-aware → Tasks 7, 8
- [x] Supabase SQL with pgvector + 1536 dims → Task 13
- [x] Collapsible sidebar (300px/60px) → Task 8
- [x] react-router-dom for /admin route → Tasks 1, 11
- [x] multer for PDF upload → Tasks 1, 4

**Placeholder scan:** None found.

**Type consistency:**
- `prefs: { genero, nombre }` — consistent across AvatarModal, Sidebar, App.jsx
- `sendProfeIAMessage({ mensaje, docenteId, fecha, grado })` — matches ProfeIAChat call
- `getWebhookUrl()` / `saveWebhookUrl(url)` — exported from api.js, used in AdminPanel and ProfeIAChat
- `uploadDocument(file, categoria)` / `getDocuments()` / `deleteDocument(id)` — matches server routes
- CSS classes `.sidebar`, `.sidebar-collapsed`, `.main-area`, `.profe-ia-wrap`, `.notif-dropdown` — consistent throughout
