const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'profeia.db'));

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS docentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    escuela TEXT NOT NULL,
    clave_escuela TEXT UNIQUE,
    primer_acceso INTEGER DEFAULT 1,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS planeaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docente_id INTEGER REFERENCES docentes(id),
    fecha DATE NOT NULL,
    materia TEXT NOT NULL,
    grado INTEGER NOT NULL,
    grupo TEXT,
    tema TEXT NOT NULL,
    objetivo TEXT,
    actividades TEXT,
    recursos TEXT,
    evaluacion TEXT,
    tipo TEXT DEFAULT 'normal',
    estado TEXT DEFAULT 'pendiente',
    reprogramada_de INTEGER REFERENCES planeaciones(id),
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bitacora (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docente_id INTEGER REFERENCES docentes(id),
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    gravedad INTEGER DEFAULT 1,
    alumnos_involucrados TEXT,
    acciones_tomadas TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS asistencia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docente_id INTEGER REFERENCES docentes(id),
    fecha DATE NOT NULL,
    alumno_nombre TEXT NOT NULL,
    grado INTEGER NOT NULL,
    grupo TEXT,
    presente INTEGER DEFAULT 1,
    justificacion TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docente_id INTEGER REFERENCES docentes(id),
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    hora_inicio TEXT,
    hora_fin TEXT,
    lugar TEXT,
    participantes TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sugerencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docente_id INTEGER REFERENCES docentes(id),
    fecha_generada DATE NOT NULL,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    acciones_sugeridas TEXT,
    aceptada INTEGER DEFAULT 0,
    rechazada INTEGER DEFAULT 0,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS normas_institucionales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_caso TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    protocolo TEXT,
    referencia_legal TEXT
  );

  CREATE TABLE IF NOT EXISTS codiseos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docente_id INTEGER REFERENCES docentes(id),
    fecha DATE NOT NULL,
    tema TEXT NOT NULL,
    descripcion TEXT,
    actividades TEXT,
    aceptado INTEGER DEFAULT 0,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Insert default institutional norms
const normsCount = db.prepare('SELECT COUNT(*) as count FROM normas_institucionales').get().count;
if (normsCount === 0) {
  db.exec(`
    INSERT INTO normas_institucionales (tipo_caso, titulo, descripcion, protocolo, referencia_legal) VALUES
    ('bullying', 'Protocolo de Atención a Bullying', 'Ante cualquier caso de acoso escolar, el docente debe actuar de inmediato siguiendo el protocolo establecido.', 
     '1. Separar a los involucrados\n2. Escuchar a cada parte por separado\n3. Documentar el incidente en bitácora\n4. Notificar al director\n5. Citar a padres o tutores\n6. Canalizar con apoyo técnico (psicología si es posible)\n7. Dar seguimiento semanal al caso',
     'Art. 42 de la Ley General de Educación, Lineamientos SEP 2024'),
    
    ('violencia', 'Protocolo ante Violencia Escolar', 'En casos de violencia física o verbal entre alumnos, se debe intervenir inmediatamente para garantizar la integridad de todos.',
     '1. Intervener de inmediato\n2. Garantizar la seguridad de todos\n3. Documentar en bitácora con detalle\n4. Informar al director y autoridades escolares\n5. Citar a padres de ambos involucrados\n6. Activar protocolo de protección\n7. Reportar a supervisión escolar',
     'Art. 34, 35 de la Ley General de Educación, Protocolos de Protección Civil SEP'),
    
    ('ausencias', 'Protocolo de Atención a Inasistencias', 'Cuando un alumno acumula inasistencias, es necesario investigar las causas y actuar preventivamente.',
     '1. Registrar inasistencias en sistema\n2. Al 3 faltas: diálogo con alumno\n3. Al 5 faltas: contacto con padre/tutor\n4. Al 7 faltas: cita formal con padres\n5. Al 10 faltas: reporte a supervisión\n6. Documentar todas las acciones',
     'Art. 52 de la Ley General de Educación, Control Escolar SEP'),
    
    ('mal_trato', 'Protocolo ante Mal Trato entre Alumnos', 'Ante situaciones de maltrato verbal, psicológico o físico, el docente debe actuar conforme a las normas de convivencia escolar.',
     '1. Intervener en el momento\n2. Separar a los involucrados\n3. Aplicar medidas disciplinarias según reglamento interno\n4. Documentar en bitácora\n5. Informar a padres\n6. Dar seguimiento al caso\n7. Si persiste: canalizar a instancia superior',
     'Ley General de los Derechos de Niñas, Niños y Adolescentes'),
    
    ('emergencia', 'Protocolo de Emergencias Escolares', 'En caso de emergencias (sismos, incendios, accidentes graves), seguir los protocolos de protección civil escolar.',
     '1. Mantener la calma\n2. Activar alarma si aplica\n3. Seguir rutas de evacuación\n4. Contar alumnos en punto de reunión\n5. Reportar novedades\n6. No reintegrar actividades hasta autorización',
     'Programa Escolar de Protección Civil SEP')
  `);
}

// Seed telesecundaria default data
function seedTelesecundariaData(docenteId, cicloEscolar = '2025-2026') {
  const insertPlaneacion = db.prepare(`
    INSERT OR IGNORE INTO planeaciones (docente_id, fecha, materia, grado, grupo, tema, objetivo, actividades, recursos, evaluacion, tipo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const materias = ['Español', 'Matemáticas', 'Ciencias', 'Geografía', 'Historia', 'Formación Cívica y Ética', 'Educación Artística', 'Educación Física', 'Tecnología', 'Lo Humano y lo Comunitario'];
  
  // Generate planeaciones for current cycle (Feb-Jul 2026 and Sep-Dec 2026)
  const meses = [
    { mes: 1, anio: 2026 }, { mes: 2, anio: 2026 }, { mes: 3, anio: 2026 },
    { mes: 4, anio: 2026 }, { mes: 5, anio: 2026 }, { mes: 6, anio: 2026 },
    { mes: 8, anio: 2026 }, { mes: 9, anio: 2026 }, { mes: 10, anio: 2026 },
    { mes: 11, anio: 2026 }, { mes: 12, anio: 2026 }
  ];

  const temasPorMateria = {
    'Español': ['Tipos de textos narrativos', 'El reportaje', 'La argumentación', 'Poesía y literatura', 'Textos expositivos', 'Comprensión lectora'],
    'Matemáticas': ['Números con signo', 'Ecuaciones lineales', 'Proporcionalidad', 'Figuras geométricas', 'Estadística básica', 'Probabilidad'],
    'Ciencias': ['Biodiversidad', 'Ecosistemas mexicanos', 'Ciclo del agua', 'Sustancias y mezclas', 'Fuerza y movimiento', 'Energía y sus transformaciones'],
    'Geografía': ['Cartografía', 'Relieve y clima', 'Población mundial', 'Migración', 'Recursos naturales', 'Desarrollo sustentable'],
    'Historia': ['El mundo medieval', 'El Renacimiento', 'Independencia de México', 'México independiente', 'Revolución Mexicana', 'México contemporáneo'],
    'Formación Cívica y Ética': ['Derechos humanos', 'Valores ciudadanos', 'Participación democrática', 'Convivencia pacífica', 'Identidad nacional', 'Responsabilidades sociales'],
    'Lo Humano y lo Comunitario': ['Proyecto de vida', 'Comunidad y territorio', 'Resolución de conflictos', 'Interculturalidad', 'Participación comunitaria', 'Desarrollo sostenible'],
    'Educación Artística': ['Expresión corporal', 'Artes visuales', 'Música y ritmo', 'Teatro', 'Danza folklórica', 'Creatividad'],
    'Educación Física': ['Habilidades motrices', 'Juegos cooperativos', 'Actividad física y salud', 'Deportes', 'Expresión corporal', 'Condición física'],
    'Tecnología': ['Herramientas digitales', 'Proyectos tecnológicos', 'Resolución de problemas', 'Diseño de soluciones', 'Información y comunicación', 'Innovación']
  };

  for (const { mes, anio } of meses) {
    const diasEnMes = new Date(anio, mes, 0).getDate();
    
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(anio, mes - 1, dia);
      const diaSemana = fecha.getDay();
      
      // Skip weekends
      if (diaSemana === 0 || diaSemana === 6) continue;
      
      const fechaStr = fecha.toISOString().split('T')[0];
      
      // 3-4 classes per day, different subjects
      const materiasDelDia = [];
      const materiasDisponibles = [...materias];
      const numMaterias = 3 + Math.floor(Math.random() * 2);
      
      for (let i = 0; i < numMaterias && materiasDisponibles.length > 0; i++) {
        const idx = Math.floor(Math.random() * materiasDisponibles.length);
        materiasDelDia.push(materiasDisponibles.splice(idx, 1)[0]);
      }
      
      const insertMany = db.transaction((planes) => {
        for (const plane of planes) {
          insertPlaneacion.run(plane);
        }
      });

      const planes = materiasDelDia.map(materia => ({
        docente_id: docenteId,
        fecha: fechaStr,
        materia,
        grado: 1 + Math.floor(Math.random() * 3),
        grupo: 'Único',
        tema: temasPorMateria[materia][Math.floor(Math.random() * temasPorMateria[materia].length)],
        objetivo: `Que los alumnos comprendan y apliquen los conceptos fundamentales de ${materia.toLowerCase()}`,
        actividades: '1. Inicio: Activación de conocimientos previos\n2. Desarrollo: Explicación y práctica guiada\n3. Cierre: Reflexión y aplicación',
        recursos: 'Libro de texto, cuaderno, material didáctico',
        evaluacion: 'Participación en clase, ejercicios prácticos, producto final',
        tipo: 'normal'
      }));

      insertMany.run(planes);
    }
  }

  // Insert default events
  const eventosDefault = [
    { fecha: '2026-02-03', tipo: 'reunion', titulo: 'Consejo Técnico Escolar', descripcion: 'Reunión ordinaria de consejo técnico', hora_inicio: '14:00', hora_fin: '17:00' },
    { fecha: '2026-02-24', tipo: 'efemeride', titulo: 'Día de la Bandera', descripcion: 'Ceremonia cívica conmemorativa', hora_inicio: '08:00', hora_fin: '09:00' },
    { fecha: '2026-03-16', tipo: 'efemeride', titulo: 'Natalicio de Benito Juárez', descripcion: 'Conmemoración del natalicio', hora_inicio: '08:00', hora_fin: '09:00' },
    { fecha: '2026-03-21', tipo: 'efemeride', titulo: 'Día Internacional de la Tierra', descripcion: 'Actividades ecológicas', hora_inicio: '10:00', hora_fin: '12:00' },
    { fecha: '2026-04-30', tipo: 'evento', titulo: 'Día del Niño', descripcion: 'Celebración del día del niño con actividades recreativas', hora_inicio: '09:00', hora_fin: '13:00' },
    { fecha: '2026-05-10', tipo: 'evento', titulo: 'Día de las Madres', descripcion: 'Homenaje a las madres', hora_inicio: '10:00', hora_fin: '12:00' },
    { fecha: '2026-05-15', tipo: 'efemeride', titulo: 'Día del Maestro', descripcion: 'Conmemoración del día del maestro', hora_inicio: '08:00', hora_fin: '09:00' },
    { fecha: '2026-06-05', tipo: 'evento', titulo: 'Día Mundial del Medio Ambiente', descripcion: 'Actividades de concientización ambiental', hora_inicio: '10:00', hora_fin: '12:00' },
    { fecha: '2026-09-15', tipo: 'efemeride', titulo: 'Independencia de México', descripcion: 'Ceremonia cívica y actividades patrias', hora_inicio: '08:00', hora_fin: '12:00' },
    { fecha: '2026-09-25', tipo: 'reunion', titulo: 'Consejo Técnico Escolar', descripcion: 'Reunión ordinaria de consejo técnico septiembre', hora_inicio: '14:00', hora_fin: '17:00' },
    { fecha: '2026-10-31', tipo: 'evento', titulo: 'Día de Muertos - Festival', descripcion: 'Celebración tradicional con ofrendas y actividades culturales', hora_inicio: '09:00', hora_fin: '13:00' },
    { fecha: '2026-11-20', tipo: 'efemeride', titulo: 'Revolución Mexicana', descripcion: 'Ceremonia cívica conmemorativa', hora_inicio: '08:00', hora_fin: '09:00' },
    { fecha: '2026-12-12', tipo: 'efemeride', titulo: 'Día de la Virgen de Guadalupe', descripcion: 'Conmemoración religiosa-cultural', hora_inicio: '08:00', hora_fin: '09:00' },
    { fecha: '2026-12-19', tipo: 'evento', titulo: 'Posada Navideña', descripcion: 'Celebración de posada con la comunidad escolar', hora_inicio: '10:00', hora_fin: '14:00' }
  ];

  const insertEvento = db.prepare(`
    INSERT OR IGNORE INTO eventos (docente_id, fecha, tipo, titulo, descripcion, hora_inicio, hora_fin)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const evento of eventosDefault) {
    insertEvento.run(docenteId, evento.fecha, evento.tipo, evento.titulo, evento.descripcion, evento.hora_inicio, evento.hora_fin);
  }

  // Insert general bitacora template entries
  const insertBitacora = db.prepare(`
    INSERT INTO bitacora (docente_id, fecha, tipo, descripcion, gravedad)
    VALUES (?, ?, ?, ?, ?)
  `);

  const hoy = new Date().toISOString().split('T')[0];
  insertBitacora.run(docenteId, hoy, 'general', 'Inicio del ciclo escolar - Preparación de materiales y revisión de planeaciones', 1);
  insertBitacora.run(docenteId, hoy, 'asunto', 'Verificar lista de alumnos inscritos por grado', 2);
  insertBitacora.run(docenteId, hoy, 'general', 'Revisión de libros de texto entregados y materiales didácticos', 1);
}

module.exports = { db, seedTelesecundariaData };
