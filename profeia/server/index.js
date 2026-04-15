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
app.use(cors());
app.use(express.json());

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
