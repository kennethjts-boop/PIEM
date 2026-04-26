const express = require('express');
const cors = require('cors');
const { db, seedTelesecundariaData } = require('./db');
const { getAIRecommendations, processBitacoraEntry, reschedulePlaneaciones, checkDateBasedSuggestions, checkAbsenceAlerts } = require('./ai-engine');
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
  limits: { fileSize: 50 * 1024 * 1024 }
});

const app = express();
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.param('docenteId', (req, res, next, docenteId) => {
  const docente = db.prepare('SELECT id FROM docentes WHERE id = ?').get(docenteId);
  if (!docente) {
    return res.status(404).json({ error: 'Docente no encontrado' });
  }
  next();
});

// ===== DOCENTES =====
app.get('/api/docentes', (req, res) => {
  const docentes = db.prepare('SELECT * FROM docentes').all();
  res.json(docentes);
});

app.post('/api/docentes', (req, res) => {
  const { nombre, escuela, clave_escuela } = req.body;
  const result = db.prepare('INSERT INTO docentes (nombre, escuela, clave_escuela) VALUES (?, ?, ?)').run(nombre, escuela, clave_escuela);
  
  // Auto-populate on first access
  seedTelesecundariaData(result.lastInsertRowid);
  
  const docente = db.prepare('SELECT * FROM docentes WHERE id = ?').get(result.lastInsertRowid);
  res.json(docente);
});

app.get('/api/docentes/:id', (req, res) => {
  const docente = db.prepare('SELECT * FROM docentes WHERE id = ?').get(req.params.id);
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
  const { tema, objetivo, actividades, recursos, evaluacion, tipo, estado } = req.body;
  db.prepare(`
    UPDATE planeaciones SET tema = COALESCE(?, tema), objetivo = COALESCE(?, objetivo),
    actividades = COALESCE(?, actividades), recursos = COALESCE(?, recursos),
    evaluacion = COALESCE(?, evaluacion), tipo = COALESCE(?, tipo), estado = COALESCE(?, estado)
    WHERE id = ?
  `).run(tema, objetivo, actividades, recursos, evaluacion, tipo, estado, req.params.id);
  
  const updated = db.prepare('SELECT * FROM planeaciones WHERE id = ?').get(req.params.id);
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
  db.prepare('UPDATE sugerencias SET aceptada = 1 WHERE id = ?').run(req.params.sugerenciaId);
  
  // Apply the suggestion - reschedule planeaciones
  const sugerencia = db.prepare('SELECT * FROM sugerencias WHERE id = ?').get(req.params.sugerenciaId);
  reschedulePlaneaciones(req.params.docenteId, sugerencia);
  
  res.json({ success: true });
});

app.post('/api/docentes/:docenteId/sugerencias/:sugerenciaId/rechazar', (req, res) => {
  db.prepare('UPDATE sugerencias SET rechazada = 1 WHERE id = ?').run(req.params.sugerenciaId);
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
  db.prepare('DELETE FROM evaluaciones WHERE id = ?').run(req.params.id);
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
  const fields = [
    'nombre','curp','fecha_nacimiento','sexo','direccion','telefono_familiar',
    'nombre_tutor','telefono_tutor','email_tutor','grado','grupo','numero_lista',
    'ciclo_escolar','nivel_lectura','nivel_matematicas','observaciones_generales',
    'necesidades_especiales','situacion_socioemocional','fecha_diagnostico'
  ];
  const sets = fields.map(f => `${f} = COALESCE(?, ${f})`).join(', ');
  const vals = fields.map(f => req.body[f] !== undefined ? req.body[f] : null);
  db.prepare(`UPDATE alumnos SET ${sets} WHERE id = ?`).run(...vals, req.params.id);
  res.json(db.prepare('SELECT * FROM alumnos WHERE id = ?').get(req.params.id));
});

app.delete('/api/alumnos/:id', (req, res) => {
  db.prepare('UPDATE alumnos SET activo = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/alumnos/:alumnoId/diagnosticos', (req, res) => {
  res.json(db.prepare('SELECT * FROM diagnosticos_trimestrales WHERE alumno_id = ? ORDER BY trimestre ASC').all(req.params.alumnoId));
});

app.post('/api/alumnos/:alumnoId/diagnosticos', (req, res) => {
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
