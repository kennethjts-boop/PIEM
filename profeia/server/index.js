const express = require('express');
const cors = require('cors');
const { db, seedTelesecundariaData } = require('./db');
const { seedDemoData, clearDemoData, hasDemoData } = require('./demo-seed');
const { getAIRecommendations, processBitacoraEntry, reschedulePlaneaciones, checkDateBasedSuggestions, checkAbsenceAlerts } = require('./ai-engine');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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
  limits: { fileSize: 50 * 1024 * 1024 }
});

const app = express();
const normalizeOrigin = (value) => String(value || '')
  .trim()
  .replace(/^['"]|['"]$/g, '')
  .replace(/\/+$/, '');

const parseOriginHost = (origin) => {
  try {
    return new URL(origin).hostname;
  } catch {
    return '';
  }
};

const BASE_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://profeia-pilot-staging.vercel.app',
];

const rawAllowedOrigin = String(process.env.ALLOWED_ORIGIN || '');
const envAllowedOrigins = rawAllowedOrigin
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([
  ...BASE_ALLOWED_ORIGINS,
  ...envAllowedOrigins,
].map(normalizeOrigin).filter(Boolean)));

const isVercelOrigin = (origin) => {
  const host = parseOriginHost(origin);
  return Boolean(host) && host.endsWith('.vercel.app');
};

const resolveAllowedOrigin = (incomingOrigin) => {
  if (!incomingOrigin) {
    return { allowed: true, selectedOrigin: null };
  }

  const normalizedIncoming = normalizeOrigin(incomingOrigin);
  if (allowedOrigins.includes(normalizedIncoming)) {
    return { allowed: true, selectedOrigin: normalizedIncoming };
  }

  if (isVercelOrigin(normalizedIncoming)) {
    return { allowed: true, selectedOrigin: normalizedIncoming };
  }

  return { allowed: false, selectedOrigin: null };
};

const corsOptions = {
  origin(origin, callback) {
    const { allowed } = resolveAllowedOrigin(origin);
    if (!allowed) return callback(null, false);
    if (!origin) return callback(null, true);
    return callback(null, normalizeOrigin(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

const SUPABASE_JWT_SECRET = String(process.env.SUPABASE_JWT_SECRET || '').trim();
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const PRIVILEGED_SCOPE_ROLES = new Set(['director', 'admin', 'superadmin']);
const DOCUMENT_WRITE_ROLES = new Set(['teacher', 'director', 'admin', 'superadmin']);
const DOCUMENT_GLOBAL_ROLES = new Set(['admin', 'superadmin']);
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
const jwksCache = new Map();

const asText = (value) => (value == null ? '' : String(value));

const toBase64 = (base64urlValue) => {
  const base64 = String(base64urlValue || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  return pad ? `${base64}${'='.repeat(4 - pad)}` : base64;
};

const decodeBase64UrlJson = (base64urlValue) => {
  const json = Buffer.from(toBase64(base64urlValue), 'base64').toString('utf8');
  return JSON.parse(json);
};

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const buildSupabaseJwksUrl = (claims) => {
  if (SUPABASE_URL && isHttpsUrl(SUPABASE_URL)) {
    return `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
  }

  const issuer = String(claims?.iss || '').trim();
  if (!issuer || !isHttpsUrl(issuer)) return null;

  const parsedIssuer = new URL(issuer);
  if (!parsedIssuer.hostname.endsWith('.supabase.co')) return null;

  return `${parsedIssuer.origin}/auth/v1/.well-known/jwks.json`;
};

const fetchJwksByKid = async (jwksUrl, kid) => {
  const now = Date.now();
  const cached = jwksCache.get(jwksUrl);
  if (cached && now - cached.fetchedAt < JWKS_CACHE_TTL_MS) {
    const jwk = cached.keysByKid.get(kid);
    if (jwk) return jwk;
  }

  const res = await fetch(jwksUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const err = new Error(`Failed to fetch JWKS (${res.status})`);
    err.statusCode = 401;
    throw err;
  }

  const data = await res.json();
  const keys = Array.isArray(data?.keys) ? data.keys : [];
  const keysByKid = new Map();

  for (const key of keys) {
    if (key?.kid) keysByKid.set(String(key.kid), key);
  }

  jwksCache.set(jwksUrl, {
    fetchedAt: now,
    keysByKid,
  });

  return keysByKid.get(kid) || null;
};

const getBearerToken = (req) => {
  const authHeader = asText(req.headers.authorization).trim();
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
};

const verifySupabaseJwt = async (token) => {
  const [headerSegment, payloadSegment, signatureSegment] = String(token || '').split('.');
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    const err = new Error('Invalid JWT format');
    err.statusCode = 401;
    throw err;
  }

  const header = decodeBase64UrlJson(headerSegment);

  const claims = decodeBase64UrlJson(payloadSegment);
  const signedInput = `${headerSegment}.${payloadSegment}`;

  if (header.alg === 'HS256') {
    if (!SUPABASE_JWT_SECRET) {
      const err = new Error('SUPABASE_JWT_SECRET is required to validate API identity.');
      err.statusCode = 500;
      throw err;
    }

    const expectedSignature = crypto
      .createHmac('sha256', SUPABASE_JWT_SECRET)
      .update(signedInput)
      .digest('base64url');

    const provided = Buffer.from(signatureSegment);
    const expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      const err = new Error('Invalid JWT signature');
      err.statusCode = 401;
      throw err;
    }
  } else if (header.alg === 'ES256') {
    const kid = String(header.kid || '').trim();
    if (!kid) {
      const err = new Error('Missing JWT kid for ES256 token');
      err.statusCode = 401;
      throw err;
    }

    const jwksUrl = buildSupabaseJwksUrl(claims);
    if (!jwksUrl) {
      const err = new Error('Unable to resolve Supabase JWKS URL');
      err.statusCode = 401;
      throw err;
    }

    const jwk = await fetchJwksByKid(jwksUrl, kid);
    if (!jwk) {
      const err = new Error('JWT kid not found in JWKS');
      err.statusCode = 401;
      throw err;
    }

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const signature = Buffer.from(toBase64(signatureSegment), 'base64');
    const verifier = crypto.createVerify('SHA256');
    verifier.update(signedInput);
    verifier.end();

    const valid = verifier.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
    if (!valid) {
      const err = new Error('Invalid JWT signature');
      err.statusCode = 401;
      throw err;
    }
  } else {
    const err = new Error('Unsupported JWT algorithm');
    err.statusCode = 401;
    throw err;
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && now >= Number(claims.exp)) {
    const err = new Error('JWT expired');
    err.statusCode = 401;
    throw err;
  }
  return claims;
};

const normalizeRole = (claims) => {
  const declared = asText(claims.user_role || claims.app_metadata?.role || claims.role).toLowerCase();
  if (!declared || declared === 'authenticated') return 'teacher';
  return declared;
};

const getMappedDocenteId = (authUserId) => {
  const mapped = db
    .prepare(`
      SELECT COALESCE(m.docente_id, d.id) AS docente_id
      FROM docentes d
      LEFT JOIN auth_docente_map m ON m.docente_id = d.id
      WHERE m.auth_user_id = ? OR d.auth_user_id = ?
      ORDER BY d.id ASC
      LIMIT 1
    `)
    .get(authUserId, authUserId);
  return mapped?.docente_id ? Number(mapped.docente_id) : null;
};

const canAccessDocente = (auth, docenteId) => {
  if (!auth?.userId) return false;
  if (PRIVILEGED_SCOPE_ROLES.has(auth.role)) return true;
  return getMappedDocenteId(auth.userId) === Number(docenteId);
};

const requireDocenteScope = (req, res, docenteId) => {
  if (canAccessDocente(req.auth, docenteId)) return true;
  res.status(403).json({ error: 'Forbidden: docente scope mismatch' });
  return false;
};

const requireRecordDocenteScope = (req, res, docenteId, notFoundMessage) => {
  if (!docenteId) {
    res.status(404).json({ error: notFoundMessage });
    return false;
  }
  if (!requireDocenteScope(req, res, docenteId)) return false;
  return true;
};

const canManageDocumentRow = (auth, doc) => {
  if (!auth || !doc) return false;
  if (DOCUMENT_GLOBAL_ROLES.has(auth.role)) return true;
  return asText(doc.owner_user_id) === asText(auth.userId);
};

const isPublicApiPath = (req) => {
  const method = asText(req.method).toUpperCase();
  const p = asText(req.path);
  return method === 'GET' && (p === '/health' || p === '/healthz');
};

const PLANEACION_ESTADOS_VALIDOS = new Set(['pendiente', 'completado', 'reprogramado']);

const normalizePlaneacionEstado = (estado) => {
  const normalized = String(estado || '').toLowerCase().trim();
  if (!normalized) return 'pendiente';
  if (normalized === 'completada') return 'completado';
  if (normalized === 'activa' || normalized === 'actividad' || normalized === 'borrador') return 'pendiente';
  if (normalized === 'reprogramada') return 'reprogramado';
  return normalized;
};

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'profeia-server',
    cors: 'enabled',
  });
});

app.get('/cors-debug', (req, res) => {
  const incomingOrigin = req.header('Origin') || null;
  const { selectedOrigin } = resolveAllowedOrigin(incomingOrigin);
  res.json({
    ok: true,
    origin: incomingOrigin,
    allowedOrigin: selectedOrigin,
    allowedOrigins,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  if (isPublicApiPath(req)) return next();

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing Bearer token' });
  }

  try {
    const claims = await verifySupabaseJwt(token);
    const userId = asText(claims.sub || claims.user_id).trim();
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: token missing subject' });
    }

    req.auth = {
      userId,
      role: normalizeRole(claims),
      schoolId: claims.school_id || claims.app_metadata?.school_id || null,
      claims,
    };
    next();
  } catch (err) {
    const statusCode = Number(err?.statusCode || 401);
    return res.status(statusCode).json({ error: err.message || 'Unauthorized' });
  }
});

app.param('docenteId', (req, res, next, docenteId) => {
  const docente = db.prepare('SELECT id FROM docentes WHERE id = ?').get(docenteId);
  if (!docente) {
    return res.status(404).json({ error: 'Docente no encontrado' });
  }
  if (!requireDocenteScope(req, res, docenteId)) return;
  next();
});

// ===== DOCENTES =====
app.get('/api/docentes', (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (PRIVILEGED_SCOPE_ROLES.has(req.auth.role)) {
    const docentes = db.prepare('SELECT * FROM docentes').all();
    return res.json(docentes);
  }

  const scopedDocenteId = getMappedDocenteId(req.auth.userId);
  if (!scopedDocenteId) return res.json([]);

  const docente = db.prepare('SELECT * FROM docentes WHERE id = ?').get(scopedDocenteId);
  return res.json(docente ? [docente] : []);
});

app.post('/api/docentes', (req, res) => {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const existingMappedDocenteId = getMappedDocenteId(req.auth.userId);
  if (existingMappedDocenteId && !PRIVILEGED_SCOPE_ROLES.has(req.auth.role)) {
    const mappedDocente = db.prepare('SELECT * FROM docentes WHERE id = ?').get(existingMappedDocenteId);
    if (mappedDocente) {
      return res.status(200).json({ ...mappedDocente, reused: true, conflict: 'docente_scope' });
    }
  }

  const nombre = String(req.body?.nombre || '').trim();
  const escuela = String(req.body?.escuela || '').trim();
  const clave_escuela = String(req.body?.clave_escuela || '').trim();

  if (!nombre || !escuela) {
    return res.status(400).json({ error: 'nombre y escuela son requeridos' });
  }

  const findExistingDocente = () => {
    if (clave_escuela) {
      const byNameAndCct = db
        .prepare('SELECT * FROM docentes WHERE nombre = ? AND clave_escuela = ? LIMIT 1')
        .get(nombre, clave_escuela);
      if (byNameAndCct) return byNameAndCct;

      const byNameAndSchool = db
        .prepare('SELECT * FROM docentes WHERE nombre = ? AND escuela = ? LIMIT 1')
        .get(nombre, escuela);
      if (byNameAndSchool) return byNameAndSchool;

      const byCct = db
        .prepare('SELECT * FROM docentes WHERE clave_escuela = ? ORDER BY creado_en ASC LIMIT 1')
        .get(clave_escuela);
      if (byCct) return byCct;
    }

    return db
      .prepare('SELECT * FROM docentes WHERE nombre = ? AND escuela = ? ORDER BY creado_en ASC LIMIT 1')
      .get(nombre, escuela);
  };

  const linkAuthToDocente = (docenteId) => {
    db.prepare(`
      INSERT INTO auth_docente_map (auth_user_id, docente_id)
      VALUES (?, ?)
      ON CONFLICT(auth_user_id) DO UPDATE SET docente_id = excluded.docente_id
    `).run(req.auth.userId, docenteId);
    db.prepare('UPDATE docentes SET auth_user_id = COALESCE(auth_user_id, ?) WHERE id = ?').run(req.auth.userId, docenteId);
  };

  try {
    const result = db.prepare('INSERT INTO docentes (auth_user_id, nombre, escuela, clave_escuela) VALUES (?, ?, ?, ?)').run(req.auth.userId, nombre, escuela, clave_escuela || null);

    // Auto-populate on first access
    seedTelesecundariaData(result.lastInsertRowid);
    linkAuthToDocente(result.lastInsertRowid);

    const docente = db.prepare('SELECT * FROM docentes WHERE id = ?').get(result.lastInsertRowid);
    return res.json(docente);
  } catch (err) {
    const isUniqueConflict = String(err?.message || '').includes('UNIQUE constraint failed: docentes.clave_escuela');
    if (isUniqueConflict) {
      const existing = findExistingDocente();
      if (existing) {
        linkAuthToDocente(existing.id);
        return res.status(200).json({
          ...existing,
          reused: true,
          conflict: 'clave_escuela',
        });
      }
      return res.status(409).json({
        error: 'Conflicto de clave_escuela',
        detalle: 'Ya existe un docente para esa clave de escuela y no fue posible recuperarlo.',
      });
    }

    console.error('POST /api/docentes error:', err);
    return res.status(500).json({ error: 'No se pudo crear docente', detalle: err?.message });
  }
});

app.get('/api/docentes/:id', (req, res) => {
  const docente = db.prepare('SELECT * FROM docentes WHERE id = ?').get(req.params.id);
  if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });
  if (!requireDocenteScope(req, res, docente.id)) return;
  res.json(docente);
});

// ===== PLANEACIONES =====
app.get('/api/docentes/:docenteId/planeaciones', (req, res) => {
  const { mes, anio } = req.query;
  let query = 'SELECT * FROM planeaciones WHERE docente_id = ?';
  const params = [req.params.docenteId];
  
  if (mes && anio) {
    query += ` AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?`;
    params.push(String(mes).padStart(2, '0'), String(anio));
  }
  
  query += ' ORDER BY fecha ASC';
  const planeaciones = db.prepare(query).all(...params);
  res.json(planeaciones);
});

app.post('/api/docentes/:docenteId/planeaciones', async (req, res) => {
  const { docenteId } = req.params;
  const { materia, grado, tema, objetivo, actividades, materiales, recursos, evaluacion, fecha } = req.body;
  const estado = normalizePlaneacionEstado(req.body?.estado);

  if (!materia || !tema || !fecha) {
    return res.status(400).json({ error: 'materia, tema y fecha son requeridos' });
  }

  if (!PLANEACION_ESTADOS_VALIDOS.has(estado)) {
    return res.status(400).json({ error: 'estado inválido. Usa pendiente, completado o reprogramado.' });
  }

  try {
    const gradoValue = Number(grado || req.auth?.claims?.grado || 1) || 1;
    const actividadesSerialized = typeof actividades === 'object'
      ? JSON.stringify(actividades)
      : (actividades || '');

    const stmt = db.prepare(`
      INSERT INTO planeaciones (docente_id, materia, grado, tema, objetivo, actividades, recursos, evaluacion, fecha, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      docenteId,
      materia,
      gradoValue,
      tema,
      objetivo || '',
      actividadesSerialized,
      recursos || materiales || '',
      evaluacion || '',
      fecha,
      estado
    );

    const created = db.prepare('SELECT * FROM planeaciones WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/docentes/:docenteId/planeaciones/:id', (req, res) => {
  const planeacion = db.prepare('SELECT * FROM planeaciones WHERE docente_id = ? AND id = ?').get(req.params.docenteId, req.params.id);
  res.json(planeacion);
});

app.put('/api/planeaciones/:id', (req, res) => {
  const planeacionActual = db.prepare('SELECT id, docente_id FROM planeaciones WHERE id = ?').get(req.params.id);
  if (!requireRecordDocenteScope(req, res, planeacionActual?.docente_id, 'Planeación no encontrada')) return;

  const { tema, objetivo, actividades, recursos, evaluacion, tipo, estado } = req.body;
  let estadoNormalizado = null;
  if (estado !== undefined && estado !== null) {
    estadoNormalizado = normalizePlaneacionEstado(estado);
    if (!PLANEACION_ESTADOS_VALIDOS.has(estadoNormalizado)) {
      return res.status(400).json({ error: 'estado inválido. Usa pendiente, completado o reprogramado.' });
    }
  }

  db.prepare(`
    UPDATE planeaciones SET tema = COALESCE(?, tema), objetivo = COALESCE(?, objetivo),
    actividades = COALESCE(?, actividades), recursos = COALESCE(?, recursos),
    evaluacion = COALESCE(?, evaluacion), tipo = COALESCE(?, tipo), estado = COALESCE(?, estado)
    WHERE id = ? AND docente_id = ?
  `).run(tema, objetivo, actividades, recursos, evaluacion, tipo, estadoNormalizado, req.params.id, planeacionActual.docente_id);
  
  const updated = db.prepare('SELECT * FROM planeaciones WHERE id = ? AND docente_id = ?').get(req.params.id, planeacionActual.docente_id);
  res.json(updated);
});

// ===== BITACORA =====
app.get('/api/docentes/:docenteId/bitacora', (req, res) => {
  const { fecha } = req.query;
  let query = 'SELECT * FROM bitacora WHERE docente_id = ?';
  const params = [req.params.docenteId];
  
  if (fecha) {
    query += ' AND fecha = ?';
    params.push(fecha);
  }
  
  query += ' ORDER BY creado_en DESC';
  const entries = db.prepare(query).all(...params);
  res.json(entries);
});

app.post('/api/docentes/:docenteId/bitacora', (req, res) => {
  const { fecha, tipo, descripcion, gravedad, alumnos_involucrados, acciones_tomadas } = req.body;
  
  const result = db.prepare(`
    INSERT INTO bitacora (docente_id, fecha, tipo, descripcion, gravedad, alumnos_involucrados, acciones_tomadas)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.docenteId, fecha, tipo, descripcion, gravedad || 1, alumnos_involucrados, acciones_tomadas);
  
  // AI processing
  const recommendations = processBitacoraEntry(req.params.docenteId, fecha, tipo, descripcion, gravedad);
  
  const entry = db.prepare('SELECT * FROM bitacora WHERE id = ?').get(result.lastInsertRowid);
  res.json({ entry, recommendations });
});

// ===== ASISTENCIA =====
app.get('/api/docentes/:docenteId/asistencia', (req, res) => {
  const { fecha } = req.query;
  let query = 'SELECT * FROM asistencia WHERE docente_id = ?';
  const params = [req.params.docenteId];
  
  if (fecha) {
    query += ' AND fecha = ?';
    params.push(fecha);
  }
  
  const records = db.prepare(query).all(...params);
  res.json(records);
});

app.post('/api/docentes/:docenteId/asistencia', (req, res) => {
  const { fecha, registros } = req.body; // [{alumno_nombre, grado, grupo, presente, justificacion}]

  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''));
  if (!fechaValida) {
    return res.status(400).json({ error: 'fecha inválida. Usa formato YYYY-MM-DD.' });
  }

  if (!Array.isArray(registros) || registros.length === 0) {
    return res.status(400).json({ error: 'registros debe ser un arreglo no vacío.' });
  }

  const normalizedRegistros = [];
  for (let i = 0; i < registros.length; i += 1) {
    const item = registros[i] || {};
    const alumno_nombre = String(item.alumno_nombre || '').trim();
    const grado = Number(item.grado);
    const grupo = String(item.grupo || '').trim();
    const presenteRaw = item.presente;
    const presenteValido =
      typeof presenteRaw === 'boolean' ||
      presenteRaw === 0 ||
      presenteRaw === 1 ||
      presenteRaw === '0' ||
      presenteRaw === '1';

    if (!alumno_nombre) {
      return res.status(400).json({ error: `Registro inválido en índice ${i}: alumno_nombre es obligatorio.` });
    }
    if (!Number.isFinite(grado) || grado <= 0) {
      return res.status(400).json({ error: `Registro inválido en índice ${i}: grado debe ser numérico y mayor a 0.` });
    }
    if (!grupo) {
      return res.status(400).json({ error: `Registro inválido en índice ${i}: grupo es obligatorio.` });
    }
    if (!presenteValido) {
      return res.status(400).json({ error: `Registro inválido en índice ${i}: presente debe ser booleano o 0/1.` });
    }

    normalizedRegistros.push({
      alumno_nombre,
      grado,
      grupo,
      presente: presenteRaw === true || presenteRaw === 1 || presenteRaw === '1',
      justificacion: String(item.justificacion || '').trim(),
    });
  }

  const replaceAsistencia = db.transaction((regs) => {
    db.prepare('DELETE FROM asistencia WHERE docente_id = ? AND fecha = ?')
      .run(req.params.docenteId, fecha);

    for (const reg of regs) {
      db.prepare(`
        INSERT INTO asistencia (docente_id, fecha, alumno_nombre, grado, grupo, presente, justificacion)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.docenteId, fecha, reg.alumno_nombre, reg.grado, reg.grupo, reg.presente ? 1 : 0, reg.justificacion);
    }
  });

  replaceAsistencia.run(normalizedRegistros);
  
  // Check for absence alerts
  const alerts = checkAbsenceAlerts(req.params.docenteId, fecha);
  
  res.json({ success: true, alerts });
});

// ===== EVENTOS =====
app.get('/api/docentes/:docenteId/eventos', (req, res) => {
  const { mes, anio } = req.query;
  let query = 'SELECT * FROM eventos WHERE docente_id = ?';
  const params = [req.params.docenteId];
  
  if (mes && anio) {
    query += ` AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?`;
    params.push(String(mes).padStart(2, '0'), String(anio));
  }
  
  query += ' ORDER BY fecha ASC';
  const eventos = db.prepare(query).all(...params);
  res.json(eventos);
});

app.post('/api/docentes/:docenteId/eventos', (req, res) => {
  const { fecha, tipo, titulo, descripcion, hora_inicio, hora_fin, lugar, participantes } = req.body;
  
  const result = db.prepare(`
    INSERT INTO eventos (docente_id, fecha, tipo, titulo, descripcion, hora_inicio, hora_fin, lugar, participantes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.docenteId, fecha, tipo, titulo, descripcion, hora_inicio, hora_fin, lugar, participantes);
  
  const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(result.lastInsertRowid);
  res.json(evento);
});

// ===== SUGERENCIAS =====
app.get('/api/docentes/:docenteId/sugerencias', (req, res) => {
  const sugerencias = db.prepare('SELECT * FROM sugerencias WHERE docente_id = ? ORDER BY creado_en DESC').all(req.params.docenteId);
  res.json(sugerencias);
});

app.post('/api/docentes/:docenteId/sugerencias/:sugerenciaId/aceptar', (req, res) => {
  const sugerencia = db
    .prepare('SELECT * FROM sugerencias WHERE id = ? AND docente_id = ?')
    .get(req.params.sugerenciaId, req.params.docenteId);

  if (!sugerencia) {
    return res.status(404).json({ error: 'Sugerencia no encontrada para este docente' });
  }

  if (!requireDocenteScope(req, res, sugerencia.docente_id)) return;

  db.prepare('UPDATE sugerencias SET aceptada = 1, rechazada = 0 WHERE id = ? AND docente_id = ?')
    .run(req.params.sugerenciaId, req.params.docenteId);
  
  // Apply the suggestion - reschedule planeaciones
  reschedulePlaneaciones(sugerencia.docente_id, sugerencia);
  
  res.json({ success: true });
});

app.post('/api/docentes/:docenteId/sugerencias/:sugerenciaId/rechazar', (req, res) => {
  const sugerencia = db
    .prepare('SELECT id, docente_id FROM sugerencias WHERE id = ? AND docente_id = ?')
    .get(req.params.sugerenciaId, req.params.docenteId);

  if (!sugerencia) {
    return res.status(404).json({ error: 'Sugerencia no encontrada para este docente' });
  }

  if (!requireDocenteScope(req, res, sugerencia.docente_id)) return;

  db.prepare('UPDATE sugerencias SET rechazada = 1, aceptada = 0 WHERE id = ? AND docente_id = ?')
    .run(req.params.sugerenciaId, req.params.docenteId);
  res.json({ success: true });
});

// POST /api/agent/reason — razonamiento del agente (opcional OpenAI)
function detectAgentIntentRules(mensaje) {
  const lower = String(mensaje || '').toLowerCase();
  if (/(crea una planeaci[oó]n|genera una planeaci[oó]n|hazme una clase de|planea|planeaci[oó]n de|plan de clase)/.test(lower)) return 'crear_planeacion';
  if (/(anota en bit[aá]cora|registra que hubo bullying|guarda este incidente|registra en bit[aá]cora|bit[aá]cora)/.test(lower)) return 'guardar_bitacora';
  if (/(eval[uú]a a|registra calificaci[oó]n|prepara evaluaci[oó]n|calificaci[oó]n de)/.test(lower)) return 'crear_evaluacion';
  if (/(recu[eé]rdame|crea una tarea|pendiente para ma[ñn]ana|no olvides)/.test(lower)) return 'crear_tarea_local';
  if (/(marca el aviso como le[ií]do|ya vi el aviso|marcar le[ií]do)/.test(lower)) return 'marcar_aviso_leido';
  if (/(crea un aviso|avisa que|comunica que|notifica que)/.test(lower)) return 'crear_aviso_docente_local';
  if (/(marca a todos presentes|todos presentes|toma asistencia|marca a .+ ausente|asistencia r[aá]pida)/.test(lower)) return 'tomar_asistencia_rapida';
  if (/(crea una actividad|hazme una actividad|actividad de|prepara una din[aá]mica)/.test(lower)) return 'crear_actividad';
  if (/(reporte del d[ií]a|hazme un reporte|reporte de hoy|qu[eé] pas[oó] hoy)/.test(lower)) return 'preparar_reporte_dia';
  if (/(marca la planeaci[oó]n como|actualiza el estado|la planeaci[oó]n est[aá] lista|cambia estado de planeaci[oó]n)/.test(lower)) return 'actualizar_planeacion_estado';
  if (/(prepara mensaje para el director|redacta un mensaje al director|comunica al director|avisa al director)/.test(lower)) return 'preparar_mensaje_director';
  if (/(ir a|abrir|navegar|ver|mostrar)/.test(lower)) return 'navegar';
  return 'general';
}

app.post('/api/agent/reason', async (req, res) => {
  const { mensaje, context_summary, available_tools } = req.body || {};
  if (!mensaje) return res.status(400).json({ error: 'mensaje requerido' });

  const provider = process.env.AGENT_REASONER_PROVIDER || 'rules';
  const openaiKey = process.env.OPENAI_API_KEY;

  if (provider === 'openai' && openaiKey) {
    try {
      const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
      const tools = Array.isArray(available_tools) ? available_tools : [];

      const systemPrompt = `Eres el motor de razonamiento del agente ProfeIA para docentes mexicanos de telesecundaria.
Dado un mensaje del docente y el contexto de su día, determina:
- intent: qué quiere hacer (uno de: ${tools.join(', ')}, general)
- tool_id: la herramienta a usar
- payload: campos extraídos del mensaje
- missing_fields: campos que faltan y deben pedirse al docente
- confidence: 0.0-1.0
- explanation: breve explicación en español

Responde SOLO con JSON válido. No ejecutes acciones, solo estructura la intención.`;

      const userPrompt = `Mensaje del docente: "${mensaje}"

Contexto del día:
${JSON.stringify(context_summary || {}, null, 2)}

Herramientas disponibles: ${tools.join(', ')}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 400,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
      const completion = await response.json();
      const parsed = JSON.parse(completion?.choices?.[0]?.message?.content || '{}');

      return res.json({ ...parsed, origin: 'openai', model });
    } catch (err) {
      console.error('[agent/reason] OpenAI error, falling back to rules:', err.message);
    }
  }

  const intent = detectAgentIntentRules(mensaje);

  return res.json({
    intent,
    tool_id: intent,
    confidence: 0.7,
    origin: 'rules',
    explanation: 'Detección por reglas locales',
    missing_fields: [],
  });
});

// ===== AI RECOMMENDATIONS =====
app.get('/api/docentes/:docenteId/recomendaciones', (req, res) => {
  const recommendations = getAIRecommendations(req.params.docenteId);
  res.json(recommendations);
});

app.post('/api/docentes/:docenteId/check-date-suggestions', (req, res) => {
  const suggestions = checkDateBasedSuggestions(req.params.docenteId);
  res.json(suggestions);
});

// ===== NORMAS INSTITUCIONALES =====
app.get('/api/normas', (req, res) => {
  const { tipo } = req.query;
  let query = 'SELECT * FROM normas_institucionales';
  const params = [];
  
  if (tipo) {
    query += ' WHERE tipo_caso = ?';
    params.push(tipo);
  }
  
  const normas = db.prepare(query).all(...params);
  res.json(normas);
});

// ===== CALENDAR SUMMARY (for quick view) =====
app.get('/api/docentes/:docenteId/calendar-summary', (req, res) => {
  const { mes, anio } = req.query;
  
  const planeaciones = db.prepare(`
    SELECT fecha, COUNT(*) as count, GROUP_CONCAT(DISTINCT materia) as materias
    FROM planeaciones WHERE docente_id = ? 
    AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?
    GROUP BY fecha
  `).all(req.params.docenteId, String(mes).padStart(2, '0'), String(anio));
  
  const eventos = db.prepare(`
    SELECT fecha, COUNT(*) as count
    FROM eventos WHERE docente_id = ?
    AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?
    GROUP BY fecha
  `).all(req.params.docenteId, String(mes).padStart(2, '0'), String(anio));
  
  res.json({ planeaciones, eventos });
});

// ===== STATS =====
app.get('/api/docentes/:docenteId/stats', (req, res) => {
  const docenteId = req.params.docenteId;
  
  const totalPlaneaciones = db.prepare('SELECT COUNT(*) as count FROM planeaciones WHERE docente_id = ?').get(docenteId);
  const totalBitacora = db.prepare('SELECT COUNT(*) as count FROM bitacora WHERE docente_id = ?').get(docenteId);
  const totalEventos = db.prepare('SELECT COUNT(*) as count FROM eventos WHERE docente_id = ?').get(docenteId);
  const pendientesSugerencias = db.prepare('SELECT COUNT(*) as count FROM sugerencias WHERE docente_id = ? AND aceptada = 0 AND rechazada = 0').get(docenteId);
  
  res.json({
    planeaciones: totalPlaneaciones.count,
    bitacora: totalBitacora.count,
    eventos: totalEventos.count,
    sugerenciasPendientes: pendientesSugerencias.count
  });
});

// ===== WEEKLY STATS =====
app.get('/api/docentes/:docenteId/stats-semanal', (req, res) => {
  const docenteId = req.params.docenteId;

  // Compute Mon–Fri of current week
  const today = new Date();
  const dow = today.getDay();
  const toMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + toMon);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const inicio = mon.toISOString().split('T')[0];
  const fin    = fri.toISOString().split('T')[0];

  try {
    // ── Asistencia: per-day totals ──
    const diasRaw = db.prepare(`
      SELECT fecha, COUNT(*) as total, SUM(presente) as presentes
      FROM asistencia
      WHERE docente_id = ? AND fecha BETWEEN ? AND ?
      GROUP BY fecha
      ORDER BY fecha
    `).all(docenteId, inicio, fin);

    const DIAS = ['Lun','Mar','Mié','Jue','Vie'];
    const diasAsistencia = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const f = d.toISOString().split('T')[0];
      const row = diasRaw.find(r => r.fecha === f);
      return {
        dia: DIAS[i],
        fecha: f,
        pct: row && row.total > 0 ? Math.round((row.presentes / row.total) * 100) : null,
        presentes: row ? row.presentes : 0,
        total: row ? row.total : 0,
      };
    });

    const diasConDatos = diasAsistencia.filter(d => d.pct !== null);
    const asistPct = diasConDatos.length > 0
      ? Math.round(diasConDatos.reduce((s, d) => s + d.pct, 0) / diasConDatos.length)
      : null;

    // ── Evaluaciones: count + by tipo ──
    const evalTipos = db.prepare(`
      SELECT tipo, COUNT(*) as count
      FROM evaluaciones
      WHERE docente_id = ? AND fecha BETWEEN ? AND ?
      GROUP BY tipo
    `).all(docenteId, inicio, fin);

    const evalCount = evalTipos.reduce((s, t) => s + t.count, 0);

    // ── Alumnos en riesgo: ≥2 absences this week ──
    const riesgoFaltas = db.prepare(`
      SELECT alumno_nombre, COUNT(*) as faltas
      FROM asistencia
      WHERE docente_id = ? AND fecha BETWEEN ? AND ? AND presente = 0
      GROUP BY alumno_nombre
      HAVING COUNT(*) >= 2
      ORDER BY faltas DESC
      LIMIT 5
    `).all(docenteId, inicio, fin);

    // ── Planeaciones: completadas vs total this week ──
    const planesRow = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completadas
      FROM planeaciones
      WHERE docente_id = ? AND fecha BETWEEN ? AND ?
    `).get(docenteId, inicio, fin);

    res.json({
      semana: { inicio, fin },
      asistencia: {
        pct: asistPct,
        diasConDatos: diasConDatos.length,
        dias: diasAsistencia,
      },
      evaluaciones: {
        completadas: evalCount,
        total: evalCount,          // real total; UI adds estimated target
        tipos: evalTipos,
      },
      alumnosEnRiesgo: riesgoFaltas.map(r => ({
        nombre: r.alumno_nombre,
        razon: `${r.faltas} falta${r.faltas > 1 ? 's' : ''}`,
      })),
      planeaciones: {
        completadas: planesRow.completadas || 0,
        total: planesRow.total || 0,
      },
    });
  } catch (err) {
    console.error('stats-semanal error:', err);
    res.status(500).json({ error: 'Error calculando estadísticas', detalle: err.message });
  }
});

// ===== ADMIN: DOCUMENTS =====
app.post('/api/admin/documents', upload.single('file'), (req, res) => {
  if (!DOCUMENT_WRITE_ROLES.has(req.auth?.role)) {
    return res.status(403).json({ error: 'Forbidden: role cannot upload documents' });
  }
  const { categoria } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const result = db.prepare(
    'INSERT INTO documents (owner_user_id, school_id, nombre, categoria, archivo, estado) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.auth.userId, req.auth.schoolId || null, req.file.originalname, categoria || 'Otro', req.file.filename, 'listo');
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  res.json(doc);
});

app.get('/api/admin/documents', (req, res) => {
  let docs;
  if (DOCUMENT_GLOBAL_ROLES.has(req.auth?.role)) {
    docs = db.prepare('SELECT * FROM documents ORDER BY creado_en DESC').all();
  } else {
    docs = db
      .prepare(`
        SELECT *
        FROM documents
        WHERE owner_user_id = ?
           OR (school_id IS NOT NULL AND school_id = ?)
        ORDER BY creado_en DESC
      `)
      .all(req.auth.userId, req.auth.schoolId || null);
  }
  res.json(docs);
});

app.delete('/api/admin/documents/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (!canManageDocumentRow(req.auth, doc)) {
    return res.status(403).json({ error: 'Forbidden: document scope mismatch' });
  }
  const filePath = path.join(uploadsDir, doc.archivo);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  if (DOCUMENT_GLOBAL_ROLES.has(req.auth.role)) {
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  } else {
    db.prepare('DELETE FROM documents WHERE id = ? AND owner_user_id = ?').run(req.params.id, req.auth.userId);
  }
  res.json({ success: true });
});

// ===== EVALUACIONES =====
app.get('/api/docentes/:docenteId/evaluaciones', (req, res) => {
  const { mes, anio, fecha } = req.query;
  let query = 'SELECT * FROM evaluaciones WHERE docente_id = ?';
  const params = [req.params.docenteId];
  if (fecha) {
    query += ' AND fecha = ?'; params.push(fecha);
  } else if (mes && anio) {
    query += ` AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?`;
    params.push(String(mes).padStart(2, '0'), String(anio));
  }
  query += ' ORDER BY creado_en DESC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/docentes/:docenteId/evaluaciones', (req, res) => {
  const { fecha, alumno_nombre, grado, grupo, tipo, calificacion, observaciones } = req.body;
  const result = db.prepare(`
    INSERT INTO evaluaciones (docente_id, fecha, alumno_nombre, grado, grupo, tipo, calificacion, observaciones)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.docenteId, fecha, alumno_nombre, grado || 1, grupo || 'Único', tipo, calificacion, observaciones);
  res.json(db.prepare('SELECT * FROM evaluaciones WHERE id = ?').get(result.lastInsertRowid));
});

app.delete('/api/evaluaciones/:id', (req, res) => {
  const evaluacion = db.prepare('SELECT id, docente_id FROM evaluaciones WHERE id = ?').get(req.params.id);
  if (!requireRecordDocenteScope(req, res, evaluacion?.docente_id, 'Evaluación no encontrada')) return;
  db.prepare('DELETE FROM evaluaciones WHERE id = ? AND docente_id = ?').run(req.params.id, evaluacion.docente_id);
  res.json({ success: true });
});

// ===== ALUMNOS =====
app.get('/api/docentes/:docenteId/alumnos', (req, res) => {
  const { grado, grupo, q } = req.query;
  let query = 'SELECT * FROM alumnos WHERE docente_id = ? AND activo = 1';
  const params = [req.params.docenteId];
  if (grado) { query += ' AND grado = ?'; params.push(grado); }
  if (grupo) { query += ' AND grupo = ?'; params.push(grupo); }
  if (q) { query += ' AND nombre LIKE ?'; params.push(`%${q}%`); }
  query += ' ORDER BY grado ASC, numero_lista ASC, nombre ASC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/docentes/:docenteId/alumnos', (req, res) => {
  const f = req.body;
  const result = db.prepare(`
    INSERT INTO alumnos (
      docente_id, nombre, curp, fecha_nacimiento, sexo, direccion, telefono_familiar,
      nombre_tutor, telefono_tutor, email_tutor, grado, grupo, numero_lista,
      ciclo_escolar, nivel_lectura, nivel_matematicas, observaciones_generales,
      necesidades_especiales, situacion_socioemocional, fecha_diagnostico
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    req.params.docenteId, f.nombre, f.curp, f.fecha_nacimiento, f.sexo, f.direccion, f.telefono_familiar,
    f.nombre_tutor, f.telefono_tutor, f.email_tutor, f.grado || 1, f.grupo || 'Único', f.numero_lista,
    f.ciclo_escolar || '2025-2026', f.nivel_lectura, f.nivel_matematicas, f.observaciones_generales,
    f.necesidades_especiales, f.situacion_socioemocional, f.fecha_diagnostico
  );
  res.json(db.prepare('SELECT * FROM alumnos WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/alumnos/:id', (req, res) => {
  const alumno = db.prepare('SELECT id, docente_id FROM alumnos WHERE id = ?').get(req.params.id);
  if (!requireRecordDocenteScope(req, res, alumno?.docente_id, 'Alumno no encontrado')) return;

  const fields = [
    'nombre','curp','fecha_nacimiento','sexo','direccion','telefono_familiar',
    'nombre_tutor','telefono_tutor','email_tutor','grado','grupo','numero_lista',
    'ciclo_escolar','nivel_lectura','nivel_matematicas','observaciones_generales',
    'necesidades_especiales','situacion_socioemocional','fecha_diagnostico'
  ];
  const sets = fields.map(f => `${f} = COALESCE(?, ${f})`).join(', ');
  const vals = fields.map(f => req.body[f] !== undefined ? req.body[f] : null);
  db.prepare(`UPDATE alumnos SET ${sets} WHERE id = ? AND docente_id = ?`).run(...vals, req.params.id, alumno.docente_id);
  res.json(db.prepare('SELECT * FROM alumnos WHERE id = ? AND docente_id = ?').get(req.params.id, alumno.docente_id));
});

app.delete('/api/alumnos/:id', (req, res) => {
  const alumno = db.prepare('SELECT id, docente_id FROM alumnos WHERE id = ?').get(req.params.id);
  if (!requireRecordDocenteScope(req, res, alumno?.docente_id, 'Alumno no encontrado')) return;
  db.prepare('UPDATE alumnos SET activo = 0 WHERE id = ? AND docente_id = ?').run(req.params.id, alumno.docente_id);
  res.json({ success: true });
});

app.get('/api/alumnos/:alumnoId/diagnosticos', (req, res) => {
  const alumno = db.prepare('SELECT id, docente_id FROM alumnos WHERE id = ?').get(req.params.alumnoId);
  if (!requireRecordDocenteScope(req, res, alumno?.docente_id, 'Alumno no encontrado')) return;
  res.json(db.prepare('SELECT * FROM diagnosticos_trimestrales WHERE alumno_id = ? ORDER BY trimestre ASC').all(req.params.alumnoId));
});

app.post('/api/alumnos/:alumnoId/diagnosticos', (req, res) => {
  const alumno = db.prepare('SELECT id, docente_id FROM alumnos WHERE id = ?').get(req.params.alumnoId);
  if (!requireRecordDocenteScope(req, res, alumno?.docente_id, 'Alumno no encontrado')) return;

  const { trimestre, fecha, avances, areas_oportunidad, ajuste_planeacion } = req.body;
  const existing = db.prepare('SELECT id FROM diagnosticos_trimestrales WHERE alumno_id = ? AND trimestre = ?').get(req.params.alumnoId, trimestre);
  if (existing) {
    db.prepare('UPDATE diagnosticos_trimestrales SET fecha=?,avances=?,areas_oportunidad=?,ajuste_planeacion=? WHERE id=?')
      .run(fecha, avances, areas_oportunidad, ajuste_planeacion, existing.id);
    res.json(db.prepare('SELECT * FROM diagnosticos_trimestrales WHERE id=?').get(existing.id));
  } else {
    const result = db.prepare('INSERT INTO diagnosticos_trimestrales (alumno_id,trimestre,fecha,avances,areas_oportunidad,ajuste_planeacion) VALUES (?,?,?,?,?,?)')
      .run(req.params.alumnoId, trimestre, fecha, avances, areas_oportunidad, ajuste_planeacion);
    res.json(db.prepare('SELECT * FROM diagnosticos_trimestrales WHERE id=?').get(result.lastInsertRowid));
  }
});

// ===== DEMO SEED (Pilot Only) =====
app.post('/api/demo/seed', (req, res) => {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const result = seedDemoData(db, req.auth.userId);
  if (result.success) {
    res.json({ 
      success: true, 
      message: '[DEMO] Datos de prueba creados exitosamente',
      warning: 'ESTOS SON DATOS DE DEMO - Se pueden eliminar con /api/demo/clear',
      ...result
    });
  } else if (result.alreadyExists) {
    res.status(409).json({ 
      success: false, 
      message: result.message,
      hint: 'Usa /api/demo/clear primero si quieres recrear los datos'
    });
  } else {
    res.status(500).json({ success: false, error: result.message });
  }
});

app.post('/api/demo/clear', (req, res) => {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const result = clearDemoData(db, req.auth.userId);
  if (result.success) {
    res.json({ 
      success: true, 
      message: '[DEMO] Datos de prueba eliminados'
    });
  } else {
    res.status(500).json({ success: false, error: result.message });
  }
});

app.get('/api/demo/status', (req, res) => {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const hasData = hasDemoData(db, req.auth.userId);
  res.json({ 
    hasDemoData: hasData,
    note: 'Estado de datos de DEMO para este usuario'
  });
});

// ===== RAG CONTEXT (Basic) =====
app.get('/api/rag/context', (req, res) => {
  const { docenteId, query } = req.query;
  if (!docenteId) {
    return res.status(400).json({ error: 'docenteId requerido' });
  }
  
  if (!requireDocenteScope(req, res, docenteId)) return;
  
  try {
    // Get projects
    const proyectos = db.prepare(`
      SELECT id, titulo, tema, descripcion, objetivos, status, progreso
      FROM proyectos_pedagogicos 
      WHERE docente_id = ? 
      ORDER BY updated_at DESC
    `).all(docenteId);
    
    // Get documents
    const documentos = db.prepare(`
      SELECT id, title, content_summary, document_type, processing_status
      FROM teacher_documents 
      WHERE docente_id = ? AND processing_status = 'completed'
      ORDER BY updated_at DESC
    `).all(docenteId);
    
    // Get recent chunks (basic search if query provided)
    let chunks = [];
    if (query) {
      const searchTerm = `%${query}%`;
      chunks = db.prepare(`
        SELECT c.id, c.content, c.metadata, d.title as document_title
        FROM teacher_doc_chunks c
        JOIN teacher_documents d ON c.document_id = d.id
        WHERE d.docente_id = ? AND c.content LIKE ?
        ORDER BY c.chunk_index
        LIMIT 5
      `).all(docenteId, searchTerm);
    } else {
      chunks = db.prepare(`
        SELECT c.id, c.content, c.metadata, d.title as document_title
        FROM teacher_doc_chunks c
        JOIN teacher_documents d ON c.document_id = d.id
        WHERE d.docente_id = ?
        ORDER BY c.created_at DESC
        LIMIT 10
      `).all(docenteId);
    }
    
    // Generate context summary
    const contextSummary = {
      total_proyectos: proyectos.length,
      total_documentos: documentos.length,
      temas_activos: [...new Set(proyectos.map(p => p.tema))],
      resumen_proyectos: proyectos.slice(0, 3).map(p => ({
        id: p.id,
        titulo: p.titulo,
        tema: p.tema,
        status: p.status,
        progreso: p.progreso
      })),
      resumen_documentos: documentos.slice(0, 3).map(d => ({
        id: d.id,
        title: d.title,
        type: d.document_type,
        summary: d.content_summary
      })),
      chunks_relevantes: chunks.map(c => ({
        content: c.content.substring(0, 200) + (c.content.length > 200 ? '...' : ''),
        source: c.document_title
      }))
    };
    
    // Log RAG query
    db.prepare(`
      INSERT INTO rag_context_logs (docente_id, query_type, query_text, context_used)
      VALUES (?, ?, ?, ?)
    `).run(docenteId, query ? 'search' : 'full_context', query || 'all', JSON.stringify(contextSummary));
    
    res.json({
      docente_id: docenteId,
      query: query || null,
      isDemo: true, // Flag to indicate this is pilot/demo data
      context: contextSummary,
      proyectos: proyectos.slice(0, 10),
      documentos: documentos.slice(0, 10),
      chunks: chunks
    });
    
  } catch (error) {
    console.error('RAG Context Error:', error);
    res.status(500).json({ error: 'Error al obtener contexto RAG', details: error.message });
  }
});

// ===== PROJECTS =====
app.get('/api/docentes/:docenteId/proyectos', (req, res) => {
  if (!requireDocenteScope(req, res, req.params.docenteId)) return;
  
  const proyectos = db.prepare(`
    SELECT * FROM proyectos_pedagogicos 
    WHERE docente_id = ? 
    ORDER BY updated_at DESC
  `).all(req.params.docenteId);
  
  res.json(proyectos);
});

app.get('/api/docentes/:docenteId/proyectos/:id', (req, res) => {
  if (!requireDocenteScope(req, res, req.params.docenteId)) return;
  
  const proyecto = db.prepare(`
    SELECT * FROM proyectos_pedagogicos 
    WHERE docente_id = ? AND id = ?
  `).get(req.params.docenteId, req.params.id);
  
  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(proyecto);
});

app.post('/api/docentes/:docenteId/proyectos', (req, res) => {
  if (!requireDocenteScope(req, res, req.params.docenteId)) return;
  
  const { titulo, tema, descripcion, objetivos, evidencias_requeridas, fecha_inicio, fecha_fin } = req.body;
  
  const result = db.prepare(`
    INSERT INTO proyectos_pedagogicos 
    (docente_id, titulo, tema, descripcion, objetivos, evidencias_requeridas, fecha_inicio, fecha_fin, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planificacion')
  `).run(req.params.docenteId, titulo, tema, descripcion, objetivos, evidencias_requeridas, fecha_inicio, fecha_fin);
  
  res.json(db.prepare('SELECT * FROM proyectos_pedagogicos WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/docentes/:docenteId/proyectos/:id', (req, res) => {
  if (!requireDocenteScope(req, res, req.params.docenteId)) return;
  
  const proyecto = db.prepare('SELECT id FROM proyectos_pedagogicos WHERE docente_id = ? AND id = ?')
    .get(req.params.docenteId, req.params.id);
  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
  
  const fields = ['titulo', 'tema', 'descripcion', 'objetivos', 'evidencias_requeridas', 
                  'criterios_evaluacion', 'fecha_inicio', 'fecha_fin', 'status', 'progreso'];
  const sets = fields.filter(f => req.body[f] !== undefined).map(f => `${f} = ?`).join(', ');
  const vals = fields.filter(f => req.body[f] !== undefined).map(f => req.body[f]);
  
  if (sets.length > 0) {
    db.prepare(`UPDATE proyectos_pedagogicos SET ${sets}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND docente_id = ?`).run(...vals, req.params.id, req.params.docenteId);
  }
  
  res.json(db.prepare('SELECT * FROM proyectos_pedagogicos WHERE id = ?').get(req.params.id));
});

app.delete('/api/docentes/:docenteId/proyectos/:id', (req, res) => {
  if (!requireDocenteScope(req, res, req.params.docenteId)) return;
  
  const proyecto = db.prepare('SELECT id FROM proyectos_pedagogicos WHERE docente_id = ? AND id = ?')
    .get(req.params.docenteId, req.params.id);
  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
  
  db.prepare('DELETE FROM proyectos_pedagogicos WHERE id = ? AND docente_id = ?')
    .run(req.params.id, req.params.docenteId);
  
  res.json({ success: true });
});

// ===== TEACHER DOCUMENTS (Simplified RAG) =====
app.get('/api/docentes/:docenteId/documents', (req, res) => {
  if (!requireDocenteScope(req, res, req.params.docenteId)) return;
  
  const docs = db.prepare(`
    SELECT id, title, content_summary, document_type, processing_status, created_at
    FROM teacher_documents 
    WHERE docente_id = ?
    ORDER BY created_at DESC
  `).all(req.params.docenteId);
  
  res.json(docs);
});

app.post('/api/docentes/:docenteId/documents', (req, res) => {
  if (!requireDocenteScope(req, res, req.params.docenteId)) return;
  
  const { title, content, content_summary, document_type } = req.body;
  
  const result = db.prepare(`
    INSERT INTO teacher_documents 
    (docente_id, title, content, content_summary, document_type, processing_status)
    VALUES (?, ?, ?, ?, ?, 'completed')
  `).run(req.params.docenteId, title, content, content_summary, document_type);
  
  const docId = result.lastInsertRowid;
  
  // Create simple chunks (split by paragraphs)
  if (content) {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 20);
    const insertChunk = db.prepare(`
      INSERT INTO teacher_doc_chunks (document_id, chunk_index, content, metadata)
      VALUES (?, ?, ?, ?)
    `);
    
    paragraphs.slice(0, 10).forEach((para, idx) => {
      insertChunk.run(docId, idx, para.trim(), JSON.stringify({ source: 'paragraph', index: idx }));
    });
    
    // Update chunks count
    db.prepare('UPDATE teacher_documents SET chunks_count = ? WHERE id = ?')
      .run(Math.min(paragraphs.length, 10), docId);
  }
  
  res.json(db.prepare('SELECT * FROM teacher_documents WHERE id = ?').get(docId));
});

app.delete('/api/docentes/:docenteId/documents/:id', (req, res) => {
  if (!requireDocenteScope(req, res, req.params.docenteId)) return;
  
  db.prepare('DELETE FROM teacher_documents WHERE id = ? AND docente_id = ?')
    .run(req.params.id, req.params.docenteId);
  
  res.json({ success: true });
});

// multer error handler
app.use((err, _req, res, _next) => {
  if (err.message === 'Solo se aceptan archivos PDF') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Profeia API running on port ${PORT}`);
});
