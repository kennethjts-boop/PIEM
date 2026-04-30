/**
 * DEMO SEED DATA for ProfeIA Pilot
 * 
 * This module creates realistic demo data for testing and presentations.
 * All data is clearly marked as DEMO and can be easily removed.
 * 
 * WARNING: This is for pilot/demo purposes only. Do not use in production.
 */

// Demo data constants
const DEMO_SCHOOL = {
  nombre: 'Escuela Secundaria Demo "Benito Juárez"',
  clave: 'DEMO-SEC-001',
  tipo: 'Telesecundaria'
};

const DEMO_TEACHER = {
  nombre: 'Maestra María Elena García',
  email: 'demo@profeia.mx'
};

const DEMO_STUDENTS = [
  { nombre: 'Ana Lucía Martínez', grado: 1, grupo: 'A', condicion: 'regular' },
  { nombre: 'Carlos Alberto Ruiz', grado: 1, grupo: 'A', condicion: 'regular' },
  { nombre: 'Diana Michelle Herrera', grado: 1, grupo: 'A', condicion: 'regular' },
  { nombre: 'Eduardo Sebastián López', grado: 1, grupo: 'A', condicion: 'regular' },
  { nombre: 'Fernanda Isabel Castillo', grado: 1, grupo: 'A', condicion: 'regular' },
  { nombre: 'Gabriel Alejandro Soto', grado: 1, grupo: 'A', condicion: 'riesgo' },
  { nombre: 'Helena María Fernández', grado: 1, grupo: 'A', condicion: 'regular' },
  { nombre: 'Ian Alejandro Mendoza', grado: 1, grupo: 'A', condicion: 'regular' },
  { nombre: 'Juliana Sofía Vargas', grado: 1, grupo: 'A', condicion: 'excelente' },
  { nombre: 'Kevin Adrián Morales', grado: 1, grupo: 'A', condicion: 'regular' }
];

const DEMO_PROJECTS = [
  {
    titulo: 'El Ciclo del Agua en Nuestra Comunidad',
    tema: 'Ciencias Naturales',
    descripcion: 'Investigación sobre el ciclo hidrológico y su impacto en el entorno local',
    objetivos: 'Comprender el ciclo del agua, identificar fuentes locales, crear conciencia ambiental',
    evidencias_requeridas: 'Infografía, muestra de agua, entrevista a adultos mayores',
    status: 'ejecucion'
  },
  {
    titulo: 'Tradiciones Orales de Mi Familia',
    tema: 'Lengua Materna y Literatura',
    descripcion: 'Recopilación de leyendas, cuentos y refranes transmitidos generacionalmente',
    objetivos: 'Valorar tradición oral, desarrollar habilidades de entrevista, preservar memoria cultural',
    evidencias_requeridas: 'Audio de entrevista, cuaderno de campo, narrativa propia',
    status: 'planificacion'
  },
  {
    titulo: 'Matemáticas en la Cocina',
    tema: 'Matemáticas',
    descripcion: 'Aplicación de fracciones, proporciones y medidas en recetas tradicionales',
    objetivos: 'Aplicar fracciones en contexto real, valorar saberes ancestrales, desarrollar pensamiento matemático',
    evidencias_requeridas: 'Receta adaptada, fotos del proceso, presentación a la clase',
    status: 'ejecucion'
  }
];

const DEMO_DOCUMENTS = [
  {
    titulo: 'Guía del Estudiante de Telesecundaria',
    tipo: 'reglamento',
    contenido_resumen: 'Contiene los lineamientos de convivencia, derechos y obligaciones del estudiante, procedimientos de evaluación y acreditación.'
  },
  {
    titulo: 'Programa de Estudios 2024 - Matemáticas I',
    tipo: 'planeacion',
    contenido_resumen: 'Aprendizajes esperados, contenidos, orientaciones didácticas y criterios de evaluación para Matemáticas de Primer Grado.'
  },
  {
    titulo: 'Proyecto "La Biodiversidad de Mi Región"',
    tipo: 'proyecto',
    contenido_resumen: 'Guía completa para desarrollar el proyecto de ciencias sobre flora y fauna local, incluye rúbricas y ejemplos de evidencias.'
  }
];

/**
 * Check if demo data already exists
 */
function hasDemoData(db, authUserId) {
  try {
    const existing = db.prepare(`
      SELECT d.id
      FROM docentes d
      WHERE d.auth_user_id = ?
        AND (
          d.clave_escuela LIKE 'DEMO-%'
          OR EXISTS (
            SELECT 1
            FROM alumnos a
            WHERE a.docente_id = d.id
              AND a.observaciones_generales LIKE '[DEMO]%'
          )
          OR EXISTS (
            SELECT 1
            FROM teacher_documents td
            WHERE td.docente_id = d.id
              AND td.file_path LIKE '/demo/%'
          )
        )
      LIMIT 1
    `).get(authUserId);
    return !!existing;
  } catch {
    return false;
  }
}

/**
 * Create demo data for a user
 */
function seedDemoData(db, authUserId) {
  if (hasDemoData(db, authUserId)) {
    return { success: false, message: 'Demo data already exists for this user', alreadyExists: true };
  }

  try {
    // Reuse existing teacher when auth_user_id already exists to avoid UNIQUE collisions.
    const existingTeacher = db.prepare(`
      SELECT id
      FROM docentes
      WHERE auth_user_id = ?
      LIMIT 1
    `).get(authUserId);

    let docenteId;
    if (existingTeacher?.id) {
      docenteId = Number(existingTeacher.id);
    } else {
      const teacherResult = db.prepare(`
        INSERT INTO docentes (auth_user_id, nombre, escuela, clave_escuela, primer_acceso)
        VALUES (?, ?, ?, ?, 0)
      `).run(authUserId, DEMO_TEACHER.nombre, DEMO_SCHOOL.nombre, DEMO_SCHOOL.clave);
      docenteId = Number(teacherResult.lastInsertRowid);
    }

    // Create students in alumnos table
    DEMO_STUDENTS.forEach((student, idx) => {
      db.prepare(`
        INSERT INTO alumnos (docente_id, nombre, grado, grupo, numero_lista, activo, observaciones_generales)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(
        docenteId,
        student.nombre,
        student.grado,
        student.grupo,
        idx + 1,
        `[DEMO] Condición académica inicial: ${student.condicion}`
      );
    });

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

    // Create attendance records for demo
    const attendanceDays = [today, yesterday, twoDaysAgo];
    
    DEMO_STUDENTS.forEach((student, index) => {
      attendanceDays.forEach((date, dayIndex) => {
        // Some students absent on different days for realistic data
        const isPresent = !(index === 5 && dayIndex === 0) && !(index === 9 && dayIndex === 1);
        
        db.prepare(`
          INSERT INTO asistencia (docente_id, fecha, alumno_nombre, grado, grupo, presente, justificacion)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          docenteId,
          date,
          student.nombre,
          student.grado,
          student.grupo,
          isPresent ? 1 : 0,
          isPresent ? null : (dayIndex === 0 ? 'Enfermedad' : 'Sin justificar')
        );
      });
    });

    // Create bitacora entries
    const bitacoraEntries = [
      {
        fecha: today,
        tipo: 'observacion',
        descripcion: 'Gabriel Alejandro Soto mostró dificultades de concentración durante la clase de matemáticas.',
        gravedad: 2,
        alumnos: 'Gabriel Alejandro Soto',
        acciones: 'Se acercó para explicar individualmente, ofrecer apoyo adicional.'
      },
      {
        fecha: yesterday,
        tipo: 'participacion',
        descripcion: 'Juliana Sofía Vargas compartió investigación sobre el ciclo del agua con la clase.',
        gravedad: 1,
        alumnos: 'Juliana Sofía Vargas',
        acciones: 'Reconocimiento público, invitación a presentar en asamblea.'
      },
      {
        fecha: twoDaysAgo,
        tipo: 'incidente',
        descripcion: 'Discusión verbal entre dos estudiantes durante receso.',
        gravedad: 3,
        alumnos: 'Carlos Alberto Ruiz, Kevin Adrián Morales',
        acciones: 'Mediación, diálogo restaurativo, acuerdos de convivencia.'
      }
    ];

    bitacoraEntries.forEach(entry => {
      db.prepare(`
        INSERT INTO bitacora (docente_id, fecha, tipo, descripcion, gravedad, alumnos_involucrados, acciones_tomadas)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        docenteId,
        entry.fecha,
        entry.tipo,
        entry.descripcion,
        entry.gravedad,
        entry.alumnos,
        entry.acciones
      );
    });

    // Create planeaciones
    const planeaciones = [
      {
        fecha: today,
        materia: 'Ciencias Naturales',
        grado: 1,
        grupo: 'A',
        tema: 'El Ciclo del Agua',
        objetivo: 'Comprender los procesos de evaporación, condensación y precipitación',
        actividades: 'Experimento con agua caliente y fría, dibujo del ciclo, discusión grupal',
        recursos: 'Recipiente transparente, agua, plástico, hielo, colores',
        evaluacion: 'Rúbrica de dibujo del ciclo, participación en experimento',
        estado: 'completada'
      },
      {
        fecha: today,
        materia: 'Matemáticas',
        grado: 1,
        grupo: 'A',
        tema: 'Fracciones en la Vida Real',
        objetivo: 'Identificar y operar fracciones en contextos cotidianos',
        actividades: 'Medir ingredientes de recetas, dividir objetos en partes iguales',
        recursos: 'Ingredientes para receta, reglas, papel para doblar',
        evaluacion: 'Portafolio de fracciones encontradas en casa',
        estado: 'completada'
      },
      {
        fecha: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
        materia: 'Lengua Materna',
        grado: 1,
        grupo: 'A',
        tema: 'Entrevistas y Tradición Oral',
        objetivo: 'Elaborar guía de entrevista, practicar escucha activa',
        actividades: 'Modelado de entrevista, práctica en parejas, planeación de entrevista real',
        recursos: 'Guía de entrevista, grabadora, cuaderno de campo',
        evaluacion: 'Guía de entrevista completada, registro de práctica',
        estado: 'pendiente'
      }
    ];

    planeaciones.forEach(p => {
      db.prepare(`
        INSERT INTO planeaciones (docente_id, fecha, materia, grado, grupo, tema, objetivo, actividades, recursos, evaluacion, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        docenteId, p.fecha, p.materia, p.grado, p.grupo, p.tema, p.objetivo,
        p.actividades, p.recursos, p.evaluacion, p.estado
      );
    });

    // Create evaluaciones (check if table exists first)
    try {
      DEMO_STUDENTS.slice(0, 5).forEach((student, i) => {
        db.prepare(`
          INSERT INTO evaluaciones (docente_id, fecha, alumno_nombre, grado, grupo, tipo, calificacion, observaciones)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          docenteId,
          today,
          student.nombre,
          student.grado,
          student.grupo,
          'participacion',
          8 + (i % 3), // 8, 9, 10
          i === 2 ? 'Participación destacada en proyecto' : 'Participación regular'
        );
      });
    } catch (e) {
      // Evaluaciones table might not exist, skip
    }

    // Create projects
    DEMO_PROJECTS.forEach((proj, idx) => {
      db.prepare(`
        INSERT INTO proyectos_pedagogicos (
          docente_id, titulo, tema, descripcion, objetivos, evidencias_requeridas,
          status, progreso, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        docenteId,
        proj.titulo,
        proj.tema,
        proj.descripcion,
        proj.objetivos,
        proj.evidencias_requeridas,
        proj.status,
        idx === 0 ? 55 : (idx === 1 ? 25 : 70)
      );
    });

    // Create teacher documents + basic chunks (RAG)
    DEMO_DOCUMENTS.forEach((doc, docIndex) => {
      const insertDoc = db.prepare(`
        INSERT INTO teacher_documents (
          docente_id, title, content, content_summary, document_type,
          file_path, mime_type, processing_status, chunks_count, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
      `).run(
        docenteId,
        doc.titulo,
        `[DEMO] Documento de prueba: ${doc.titulo}. ${doc.contenido_resumen}`,
        doc.contenido_resumen,
        doc.tipo,
        `/demo/${doc.tipo}-${docIndex + 1}.pdf`,
        'application/pdf',
        2
      );

      const documentId = insertDoc.lastInsertRowid;
      db.prepare(`
        INSERT INTO teacher_doc_chunks (document_id, chunk_index, content, metadata)
        VALUES (?, ?, ?, ?)
      `).run(
        documentId,
        0,
        `[DEMO][Chunk 1] ${doc.contenido_resumen}`,
        JSON.stringify({ section: 'resumen', source: doc.titulo })
      );

      db.prepare(`
        INSERT INTO teacher_doc_chunks (document_id, chunk_index, content, metadata)
        VALUES (?, ?, ?, ?)
      `).run(
        documentId,
        1,
        `[DEMO][Chunk 2] Evidencias sugeridas para "${doc.titulo}" y aplicación en aula.`,
        JSON.stringify({ section: 'evidencias', source: doc.titulo })
      );
    });

    return {
      success: true,
      message: 'Demo data created successfully',
      docenteId,
      stats: {
        students: DEMO_STUDENTS.length,
        attendanceDays: attendanceDays.length,
        bitacoraEntries: bitacoraEntries.length,
        planeaciones: planeaciones.length,
        projects: DEMO_PROJECTS.length,
        documents: DEMO_DOCUMENTS.length
      }
    };

  } catch (error) {
    return {
      success: false,
      message: error.message,
      error: error.toString()
    };
  }
}

/**
 * Clear demo data for a user
 */
function clearDemoData(db, authUserId) {
  try {
    // Find demo teacher
    const teacher = db.prepare(
      'SELECT id FROM docentes WHERE auth_user_id = ? AND clave_escuela LIKE ?'
    ).get(authUserId, 'DEMO-%');

    if (!teacher) {
      return { success: false, message: 'No demo data found for this user' };
    }

    const docenteId = teacher.id;

    // Delete related data
    db.prepare('DELETE FROM asistencia WHERE docente_id = ?').run(docenteId);
    db.prepare('DELETE FROM bitacora WHERE docente_id = ?').run(docenteId);
    db.prepare('DELETE FROM planeaciones WHERE docente_id = ?').run(docenteId);
    db.prepare('DELETE FROM evaluaciones WHERE docente_id = ?').run(docenteId);
    db.prepare('DELETE FROM proyectos_pedagogicos WHERE docente_id = ?').run(docenteId);
    db.prepare('DELETE FROM teacher_doc_chunks WHERE document_id IN (SELECT id FROM teacher_documents WHERE docente_id = ?)').run(docenteId);
    db.prepare('DELETE FROM teacher_documents WHERE docente_id = ?').run(docenteId);
    db.prepare('DELETE FROM alumnos WHERE docente_id = ?').run(docenteId);
    db.prepare('DELETE FROM eventos WHERE docente_id = ?').run(docenteId);
    db.prepare('DELETE FROM sugerencias WHERE docente_id = ?').run(docenteId);
    
    // Delete teacher
    db.prepare('DELETE FROM docentes WHERE id = ?').run(docenteId);

    return { success: true, message: 'Demo data cleared successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  seedDemoData,
  clearDemoData,
  hasDemoData,
  DEMO_SCHOOL,
  DEMO_TEACHER,
  DEMO_STUDENTS,
  DEMO_PROJECTS,
  DEMO_DOCUMENTS
};
