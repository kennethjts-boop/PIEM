const { db } = require('./db');

// ===== AI Recommendation Engine =====

function toAISuggestionStubShape(suggestion, fallbackTipo = 'sugerencia') {
  const acciones = suggestion?.acciones_sugeridas || suggestion?.acciones || {};
  const prioridad = (suggestion?.prioridad || 'media').toLowerCase();
  return {
    tipo: suggestion?.tipo || fallbackTipo,
    titulo: suggestion?.titulo || 'Sugerencia pedagógica',
    descripcion: suggestion?.descripcion || 'Revisa esta recomendación generada para tu contexto.',
    prioridad,
    origen: 'ia_stub',
    modelo_version: 'stub-v1',
    acciones_sugeridas: acciones,
    ...suggestion,
    prioridad,
    origen: 'ia_stub',
    modelo_version: 'stub-v1',
    acciones_sugeridas: acciones,
  };
}

function generateAISuggestionStub(docenteId, context = {}) {
  void context;
  const recommendations = [];
  
  // Check for pending suggestions
  const pendingSuggestions = db.prepare(`
    SELECT * FROM sugerencias WHERE docente_id = ? AND aceptada = 0 AND rechazada = 0
  `).all(docenteId);
  
  if (pendingSuggestions.length > 0) {
    recommendations.push({
      tipo: 'sugerencia_pendiente',
      titulo: 'Tienes sugerencias sin responder',
      descripcion: `Tienes ${pendingSuggestions.length} sugerencia(s) pendiente(s) de revisión.`,
      prioridad: 'media',
      acciones_sugeridas: { revisar_pendientes: true, total: pendingSuggestions.length },
    });
  }
  
  // Check for absence alerts
  const now = new Date();
  const treintaDias = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const alumnosAusentes = db.prepare(`
    SELECT alumno_nombre, grado, grupo, COUNT(*) as faltas
    FROM asistencia
    WHERE docente_id = ? AND presente = 0 AND fecha >= ?
    GROUP BY alumno_nombre, grado
    HAVING faltas >= 3
    ORDER BY faltas DESC
  `).all(docenteId, treintaDias);
  
  if (alumnosAusentes.length > 0) {
    const alumno = alumnosAusentes[0];
    recommendations.push({
      tipo: 'ausencias',
      titulo: 'Alumno con ausencias frecuentes',
      descripcion: `${alumno.alumno_nombre} (Grado ${alumno.grado}) tiene ${alumno.faltas} faltas en los últimos 30 días. Se recomienda contactar al padre/tutor.`,
      prioridad: 'alta',
      alumno: alumno.alumno_nombre,
      grado: alumno.grado,
      acciones_sugeridas: {
        tipo: 'contacto_padres',
        alumno: alumno.alumno_nombre,
        grado: alumno.grado,
      },
    });
  }
  
  // Check for recent bullying/violence entries in bitacora
  const bitacoraReciente = db.prepare(`
    SELECT * FROM bitacora WHERE docente_id = ? AND (tipo = 'bullying' OR tipo = 'violencia' OR tipo = 'mal_trato')
    AND fecha >= ? ORDER BY creado_en DESC LIMIT 5
  `).all(docenteId, treintaDias);
  
  if (bitacoraReciente.length > 0) {
    const entry = bitacoraReciente[0];
    const norma = db.prepare('SELECT * FROM normas_institucionales WHERE tipo_caso = ?').get(entry.tipo);
    
    if (norma) {
      recommendations.push({
        tipo: 'protocolo',
        titulo: `Protocolo institucional: ${norma.titulo}`,
        descripcion: `Se detectó un incidente de "${entry.tipo}". Revisa el protocolo institucional correspondiente.`,
        prioridad: 'urgente',
        norma,
        acciones_sugeridas: {
          tipo: 'activar_protocolo',
          tipo_caso: entry.tipo,
          norma_id: norma.id,
        },
      });
    }
  }
  
  // Check date-based suggestions (Día de Muertos, etc.)
  const dateSuggestions = checkDateBasedSuggestions(docenteId);
  if (dateSuggestions.length > 0) {
    recommendations.push(...dateSuggestions);
  }

  return recommendations.map((rec) => toAISuggestionStubShape(rec));
}

function getAIRecommendations(docenteId) {
  return generateAISuggestionStub(docenteId);
}

// ===== Process Bitacora Entry =====
function processBitacoraEntry(docenteId, fecha, tipo, descripcion, gravedad) {
  const recommendations = [];
  
  // If bullying/violence detected
  if (tipo === 'bullying' || tipo === 'violencia' || tipo === 'mal_trato') {
    // Get institutional protocol
    const norma = db.prepare('SELECT * FROM normas_institucionales WHERE tipo_caso = ?').get(tipo);
    
    // Suggest PAHC (Proyecto Académico de lo Humano y lo Comunitario) project
    const existingPAHC = db.prepare(`
      SELECT * FROM planeaciones WHERE docente_id = ? AND materia = 'Lo Humano y lo Comunitario'
      AND fecha >= ? ORDER BY fecha ASC LIMIT 1
    `).all(docenteId, fecha);
    
    if (existingPAHC.length > 0) {
      recommendations.push({
        tipo: 'protocolo',
        titulo: 'Protocolo institucional activado',
        descripcion: norma ? norma.protocolo : 'Actuar conforme al protocolo establecido',
        prioridad: 'urgente',
        acciones_sugeridas: {
          tipo: 'activar_protocolo',
          tipo_caso: tipo,
        },
      });
      
      recommendations.push({
        tipo: 'sugerencia',
        titulo: 'Ajustar planeaciones - Proyecto de lo Humano y lo Comunitario',
        descripcion: 'Se sugiere dedicar la próxima sesión de "Lo Humano y lo Comunitario" a abordar este tema con los alumnos.',
        prioridad: 'alta',
        acciones_sugeridas: { moverPlaneacion: true, materia: 'Lo Humano y lo Comunitario', tema: 'Resolución de conflictos y convivencia' }
      });
    }
    
    // Add suggestion
    db.prepare(`
      INSERT INTO sugerencias (docente_id, fecha_generada, tipo, titulo, descripcion, acciones_sugeridas, prioridad, origen, modelo_version)
      VALUES (?, ?, 'protocolo', 'Protocolo de atención a incidente', ?, ?, 'urgente', 'ia_stub', 'stub-v1')
    `).run(docenteId, fecha, norma ? norma.descripcion : 'Seguir protocolo institucional', JSON.stringify(norma || {}));
  }
  
  // If general issues, analyze for patterns
  if (gravedad >= 3) {
    recommendations.push({
      tipo: 'seguimiento',
      titulo: 'Incidente de alta gravedad registrado',
      descripcion: 'Se recomienda dar seguimiento a este incidente y documentar las acciones tomadas.',
      prioridad: 'alta'
    });
  }
  
  return recommendations;
}

// ===== Reschedule Planeaciones =====
function reschedulePlaneaciones(docenteId, sugerencia) {
  try {
    const acciones = JSON.parse(sugerencia.acciones_sugeridas || '{}');
    
    if (acciones.moverPlaneacion) {
      // Find next available session for the specified materia
      const planeaciones = db.prepare(`
        SELECT * FROM planeaciones WHERE docente_id = ? AND materia = ? AND fecha >= ? AND estado = 'pendiente'
        ORDER BY fecha ASC LIMIT 3
      `).all(docenteId, acciones.materia, new Date().toISOString().split('T')[0]);
      
      if (planeaciones.length > 0) {
        // Update the first one with the new theme
        db.prepare(`
          UPDATE planeaciones SET tema = ?, objetivo = 'Abordar tema de convivencia y resolución de conflictos',
          actividades = '1. Reflexión grupal sobre el incidente\n2. Dinámica de empatía y respeto\n3. Compromiso de convivencia\n4. Reflexión final'
          WHERE id = ?
        `).run(acciones.tema, planeaciones[0].id);
      }
    }
    
    // If it's a codiseño suggestion (e.g., Día de Muertos)
    if (acciones.codiseo) {
      const planeaciones = db.prepare(`
        SELECT * FROM planeaciones WHERE docente_id = ? AND fecha >= ? AND estado = 'pendiente'
        ORDER BY fecha ASC LIMIT 5
      `).all(docenteId, new Date().toISOString().split('T')[0]);
      
      for (const p of planeaciones) {
        db.prepare(`
          UPDATE planeaciones SET tipo = 'codiseño', tema = ?
          WHERE id = ?
        `).run(acciones.tema, p.id);
      }
    }
  } catch (e) {
    console.error('Error rescheduling:', e);
  }
}

// ===== Check Date-Based Suggestions =====
function checkDateBasedSuggestions(docenteId) {
  const suggestions = [];
  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const diaActual = now.getDate();
  
  // Día de Muertos suggestion (suggest 2 weeks before Nov 2)
  if (mesActual === 10 && diaActual >= 15 && diaActual <= 25) {
    const existeSugerencia = db.prepare(`
      SELECT COUNT(*) as count FROM sugerencias WHERE docente_id = ? AND tipo = 'codiseño' 
      AND titulo LIKE '%Día de Muertos%' AND aceptada = 1
    `).get(docenteId);
    
    if (existeSugerencia.count === 0) {
      suggestions.push({
        tipo: 'codiseño',
        titulo: '🎃 Sugerencia: Codiseño de Día de Muertos',
        descripcion: 'Se acerca el 2 de noviembre. ¿Deseas agregar un codiseño sobre Día de Muertos? Se ajustarán las planeaciones automáticamente.',
        prioridad: 'media',
        acciones_sugeridas: {
          codiseo: true,
          tema: 'Día de Muertos - Tradiciones mexicanas',
          materias: ['Español', 'Historia', 'Educación Artística', 'Lo Humano y lo Comunitario']
        }
      });
      
      // Store suggestion
      db.prepare(`
        INSERT INTO sugerencias (docente_id, fecha_generada, tipo, titulo, descripcion, acciones_sugeridas, prioridad, origen, modelo_version)
        VALUES (?, ?, 'codiseño', 'Codiseño de Día de Muertos', 'Agregar codiseño sobre tradiciones de Día de Muertos', ?, 'media', 'ia_stub', 'stub-v1')
      `).run(docenteId, now.toISOString().split('T')[0], JSON.stringify({
        codiseo: true,
        tema: 'Día de Muertos - Tradiciones mexicanas',
        materias: ['Español', 'Historia', 'Educación Artística', 'Lo Humano y lo Comunitario']
      }));
    }
  }
  
  // Christmas suggestion (December)
  if (mesActual === 12 && diaActual >= 1 && diaActual <= 15) {
    const existeNavidad = db.prepare(`
      SELECT COUNT(*) as count FROM sugerencias WHERE docente_id = ? AND tipo = 'codiseño'
      AND titulo LIKE '%Navidad%' AND aceptada = 1
    `).get(docenteId);
    
    if (existeNavidad.count === 0) {
      suggestions.push({
        tipo: 'codiseño',
        titulo: '🎄 Sugerencia: Codiseño de Navidad',
        descripcion: 'Se acercan las fiestas decembrinas. ¿Deseas agregar actividades navideñas a las planeaciones?',
        prioridad: 'media',
        acciones_sugeridas: {}
      });
    }
  }
  
  // Spring equinox (March)
  if (mesActual === 3 && diaActual >= 15 && diaActual <= 22) {
    suggestions.push({
      tipo: 'codiseño',
      titulo: '🌱 Sugerencia: Primavera y equinoccio',
      descripcion: 'Se acerca el equinoccio de primavera. Podrías integrar actividades sobre la naturaleza y el medio ambiente.',
      prioridad: 'baja',
      acciones_sugeridas: {}
    });
  }
  
  return suggestions;
}

// ===== Check Absence Alerts =====
function checkAbsenceAlerts(docenteId, fecha) {
  const alerts = [];
  const treintaDias = new Date(new Date(fecha) - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const alumnosAusentes = db.prepare(`
    SELECT alumno_nombre, grado, grupo, COUNT(*) as faltas
    FROM asistencia
    WHERE docente_id = ? AND presente = 0 AND fecha >= ?
    GROUP BY alumno_nombre, grado, grupo
    HAVING faltas >= 3
    ORDER BY faltas DESC
  `).all(docenteId, treintaDias);
  
  for (const alumno of alumnosAusentes) {
    if (alumno.faltas >= 5) {
      alerts.push({
        nivel: 'critico',
        mensaje: `⚠️ ${alumno.alumno_nombre} tiene ${alumno.faltas} faltas. Se requiere cita urgente con padres/tutores.`,
        alumno: alumno.alumno_nombre,
        grado: alumno.grado,
        faltas: alumno.faltas,
        accion: 'contacto_padres'
      });
      
      // Add suggestion
      db.prepare(`
        INSERT INTO sugerencias (docente_id, fecha_generada, tipo, titulo, descripcion, acciones_sugeridas, prioridad, origen, modelo_version)
        VALUES (?, ?, 'ausencias', 'Ausencias críticas - Contacto con padres', ?, ?, 'urgente', 'ia_stub', 'stub-v1')
      `).run(docenteId, fecha, `El alumno ${alumno.alumno_nombre} acumula ${alumno.faltas} faltas. Se requiere contacto inmediato con padres o tutores.`, JSON.stringify({ tipo: 'contacto_padres', alumno: alumno.alumno_nombre }));
    } else if (alumno.faltas >= 3) {
      alerts.push({
        nivel: 'alerta',
        mensaje: `📋 ${alumno.alumno_nombre} tiene ${alumno.faltas} faltas. Se recomienda diálogo con el alumno.`,
        alumno: alumno.alumno_nombre,
        grado: alumno.grado,
        faltas: alumno.faltas,
        accion: 'dialogo_alumno'
      });
    }
  }
  
  return alerts;
}

module.exports = {
  generateAISuggestionStub,
  getAIRecommendations,
  processBitacoraEntry,
  reschedulePlaneaciones,
  checkDateBasedSuggestions,
  checkAbsenceAlerts
};
