const express = require('express');
const cors = require('cors');
const { db, seedTelesecundariaData } = require('./db');
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
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

const SUPABASE_JWT_SECRET = String(process.env.SUPABASE_JWT_SECRET || '').trim();
const PRIVILEGED_SCOPE_ROLES = new Set(['director', 'admin', 'superadmin']);
const DOCUMENT_WRITE_ROLES = new Set(['teacher', 'director', 'admin', 'superadmin']);
const DOCUMENT_GLOBAL_ROLES = new Set(['admin', 'superadmin']);

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

const getBearerToken = (req) => {
  const authHeader = asText(req.headers.authorization).trim();
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
};

const verifySupabaseJwt = (token) => {
  if (!SUPABASE_JWT_SECRET) {
    const err = new Error('SUPABASE_JWT_SECRET is required to validate API identity.');
    err.statusCode = 500;
    throw err;
  }

  const [headerSegment, payloadSegment, signatureSegment] = String(token || '').split('.');
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    const err = new Error('Invalid JWT format');
    err.statusCode = 401;
    throw err;
  }

  const header = decodeBase64UrlJson(headerSegment);
  if (header.alg !== 'HS256') {
    const err = new Error('Unsupported JWT algorithm');
    err.statusCode = 401;
    throw err;
  }

  const signedInput = `${headerSegment}.${payloadSegment}`;
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

  const claims = decodeBase64UrlJson(payloadSegment);
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', (req, res, next) => {
  if (isPublicApiPath(req)) return next();

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing Bearer token' });
  }

  try {
    const claims = verifySupabaseJwt(token);
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

app.get('/api/docentes/:docenteId/planeaciones/:id', (req, res) => {
  const planeacion = db.prepare('SELECT * FROM planeaciones WHERE docente_id = ? AND id = ?').get(req.params.docenteId, req.params.id);
  res.json(planeacion);
});

app.put('/api/planeaciones/:id', (req, res) => {
  const planeacionActual = db.prepare('SELECT id, docente_id FROM planeaciones WHERE id = ?').get(req.params.id);
  if (!requireRecordDocenteScope(req, res, planeacionActual?.docente_id, 'Planeación no encontrada')) return;

  const { tema, objetivo, actividades, recursos, evaluacion, tipo, estado } = req.body;
  db.prepare(`
    UPDATE planeaciones SET tema = COALESCE(?, tema), objetivo = COALESCE(?, objetivo),
    actividades = COALESCE(?, actividades), recursos = COALESCE(?, recursos),
    evaluacion = COALESCE(?, evaluacion), tipo = COALESCE(?, tipo), estado = COALESCE(?, estado)
    WHERE id = ? AND docente_id = ?
  `).run(tema, objetivo, actividades, recursos, evaluacion, tipo, estado, req.params.id, planeacionActual.docente_id);
  
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
  
  const insertMany = db.transaction((regs) => {
    for (const reg of regs) {
      db.prepare(`
        INSERT INTO asistencia (docente_id, fecha, alumno_nombre, grado, grupo, presente, justificacion)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.docenteId, fecha, reg.alumno_nombre, reg.grado, reg.grupo, reg.presente ? 1 : 0, reg.justificacion);
    }
  });
  
  insertMany.run(registros);
  
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
