# Profeia — Features Design Spec
**Date:** 2026-04-14  
**Status:** Approved  
**Scope:** 6 feature blocks on top of the existing Vite+React+Express+SQLite stack

---

## Context

Existing repo: `profeia/client` (Vite + React 18 + Tailwind, Google flat design system) + `profeia/server` (Express + better-sqlite3). Current features: calendar view, planeaciones, bitácora, asistencia, sugerencias IA, onboarding modal.

---

## New Layout Architecture

The current "header + main" layout is replaced by a **fixed left sidebar + right main area**.

```
┌──────────────────────────┬──────────────────────────────────────┐
│  Sidebar (300px fixed)   │  Main area (flex-1)                  │
│                          │                                      │
│  [Avatar + Greeting]     │  [Header: logo + month nav + Bell]   │
│  [Rotating reminder]     │  [Calendar (existing)]               │
│  ─────────────────────   │                                      │
│  [ProfeIA Chat — main]   │                                      │
│  ─────────────────────   │                                      │
│  [Quick tools: 3 icons]  │                                      │
└──────────────────────────┴──────────────────────────────────────┘
```

**Collapsed state (60px):** toggle arrow button, only avatar icon + 3 tool icons visible vertically.  
**Responsive:** sidebar collapses automatically on screens < 768px.

---

## Feature 1 — Avatar Selection Modal

**Trigger:** First visit (no `profeia_prefs` key in localStorage).  
**Flow:** Modal overlays the full screen. User sees two cards side-by-side:
- **Maestro** — animated SVG (Google flat style): male teacher, blue suit, book
- **Maestra** — animated SVG (Google flat style): female teacher, coral/green blouse, hair up

On selection, modal captures the teacher's name (already in DB from existing onboarding) and writes:
```json
{ "genero": "maestro" | "maestra", "nombre": "Prof. Juan Pérez" }
```
to `localStorage('profeia_prefs')`.

**Integration:** The existing `OnboardingModal` in `App.jsx` is replaced with a two-step flow:
1. Step 1 — Choose avatar (Maestro / Maestra)
2. Step 2 — Enter name + school + CCT (existing form fields)

**Files:** `AvatarModal.jsx`, `TeacherAvatar.jsx` (SVG component with `genero` prop)

---

## Feature 2 — Greeting System (inside Sidebar top section)

**Location:** Top of left sidebar, below the avatar.

**Dynamic greeting by hour:**
| Hour range | Greeting |
|---|---|
| 06:00 – 11:59 | "Buenos días" |
| 12:00 – 18:59 | "Buenas tardes" |
| 19:00 – 05:59 | "Buenas noches" |

Format: `"Buenos días, [nombre]"` (uses name from localStorage).

**Rotating reminders:** array of ~8 contextual strings rendered below the greeting, cycling every 5 seconds with a CSS opacity fade-in/out transition. Examples:
- "Tienes 3 planeaciones esta semana"
- "Recuerda actualizar la bitácora"
- "Revisa el reporte de asistencia"
- "El trimestre termina en X días"
- "¿Ya registraste asistencia de hoy?"

**Files:** Part of `Sidebar.jsx`

---

## Feature 3 — Notifications Bell + Dropdown

**Location:** Right side of the top header (replaces the current Bell that opens SuggestionsPanel).

**Behavior:** Click toggles a dropdown panel anchored to the bell icon. Closes on outside click.

**Structure:**
- 3 tabs: **Urgente** (red), **Recordatorio** (yellow), **Sugerencia** (blue)
- Badge on bell icon: count of unread items across all categories
- Each item: icon, title, description, timestamp, mark-as-read button
- Empty state per tab: friendly illustration + message

**Data mapping from existing `sugerencias`:**
| `prioridad` value | Tab |
|---|---|
| `urgente` | Urgente |
| `alta`, `media` | Recordatorio |
| `baja` | Sugerencia |

**Files:** `NotificationDropdown.jsx`

---

## Feature 4 — Admin Panel `/admin`

**Routing:** `react-router-dom` added. `/` → main app, `/admin` → Admin Panel page.

### 4a. Document Upload

- Drag & drop zone (uses `react-dropzone`) — accepts PDF only
- Before uploading, user selects category from dropdown:
  `NEM | Leyes | Normas | Recursos | Planes de Estudio | Otro`
- Progress indicator during upload
- Backend: `POST /api/admin/documents` using `multer`, saves to `profeia/server/uploads/`
- DB: new `documents` table in SQLite (see Data section below)

### 4b. Document Library

Table view of uploaded documents:
| Column | Notes |
|---|---|
| Nombre | filename |
| Categoría | badge colored per category |
| Fecha | upload timestamp |
| Estado | `procesando` / `listo` / `error` — pill badge |
| Acciones | Delete button |

### 4c. Webhook Configuration (NEW — per user request)

A "Configuración" collapsible section at the bottom of the Admin Panel:
- Input field: "URL del Webhook de ProfeIA (n8n)"
- Default value: `import.meta.env.VITE_N8N_WEBHOOK_URL` or the hardcoded placeholder
- Save button → writes to `localStorage('profeia_webhook_url')`
- ProfeIA chat reads from: `localStorage('profeia_webhook_url')` → `VITE_N8N_WEBHOOK_URL` → `'https://n8n.tudominio.com/webhook/profeia-chat'`

**New `.env` file:** `profeia/client/.env` with:
```
VITE_N8N_WEBHOOK_URL=https://n8n.tudominio.com/webhook/profeia-chat
```

**New SQLite table:**
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

**Files:** `AdminPanel.jsx`, server route additions in `server/index.js`, `server/db.js`

---

## Feature 5 — ProfeIA Chat (Sidebar center — main element)

**Location:** Center section of the sidebar, takes all remaining vertical space (flex-1, scrollable).

**UI:**
- Message list (scrollable, newest at bottom)
- User messages: right-aligned, blue bubble
- AI messages: left-aligned, white card with subtle border
- Typing indicator (3 animated dots) while waiting for webhook response
- Quick prompt chips above the input area:
  - "¿Qué vemos hoy?"
  - "Genera una planeación"
  - "Ayuda con la bitácora"
  - "Próximo proyecto NEM"
- Input: `textarea` (auto-grows 1-3 lines) + send button (arrow icon)
- Send on `Enter` (Shift+Enter for newline)

**Webhook call:**
```
POST {webhookUrl}
Content-Type: application/json

{
  "mensaje": "string",
  "docenteId": number,
  "fecha": "YYYY-MM-DD",
  "grado": number | null,
  "contexto": "profeia-chat"
}
```

Response: expects `{ respuesta: "string" }` or plain text. Handles network errors gracefully with a retry button per failed message.

**Webhook URL resolution order:**
1. `localStorage('profeia_webhook_url')` (set via Admin Panel)
2. `import.meta.env.VITE_N8N_WEBHOOK_URL`
3. Hardcoded placeholder `'https://n8n.tudominio.com/webhook/profeia-chat'`

**Files:** `ProfeIAChat.jsx`

---

## Feature 6 — Supabase Setup SQL

**File:** `docs/supabase-setup.sql`

Contains the full production schema for when the project migrates to Supabase:
- `pgvector` extension enable
- All tables from the architecture plan doc (schools, users, documents, document_chunks, etc.)
- `document_chunks.embedding vector(1536)` — compatible with Alibaba `text-embedding-v2` (1536 dims)
- `ivfflat` index for cosine similarity
- Row Level Security (RLS) policies skeleton
- Comments explaining embedding model choice

---

## New Dependencies

**Client (`profeia/client/package.json`):**
- `react-router-dom` ^6
- `react-dropzone` ^14

**Server (`profeia/server/package.json`):**
- `multer` ^1

---

## Files Changed / Created

| File | Action |
|---|---|
| `client/src/App.jsx` | Refactor: new layout with Sidebar + Router |
| `client/src/index.css` | Add: sidebar, chat bubble, dropzone, notification styles |
| `client/src/api.js` | Add: admin endpoints + webhook call |
| `client/src/main.jsx` | Add: BrowserRouter wrapper |
| `client/.env` | Create: VITE_N8N_WEBHOOK_URL placeholder |
| `client/vite.config.js` | No change needed |
| `server/index.js` | Add: /api/admin/documents routes + multer |
| `server/db.js` | Add: documents table |
| `client/src/components/Sidebar.jsx` | Create |
| `client/src/components/TeacherAvatar.jsx` | Create: SVG avatar with genero prop |
| `client/src/components/AvatarModal.jsx` | Create: replaces OnboardingModal |
| `client/src/components/ProfeIAChat.jsx` | Create |
| `client/src/components/NotificationDropdown.jsx` | Create |
| `client/src/pages/AdminPanel.jsx` | Create |
| `docs/supabase-setup.sql` | Create |

---

## Non-goals (out of scope for this implementation)

- Real PDF text extraction / chunking (pipeline is in the architecture doc, not implemented here)
- Supabase Auth or live Supabase connection (SQL file is prep work only)
- Mobile app version
- Multi-teacher accounts / login system
