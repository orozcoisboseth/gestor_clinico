import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

let dbClient: Client | null = null;
let currentDbConfig = {
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
};

export function getDb(): Client {
  if (!dbClient) {
    initDatabase();
  }
  return dbClient!;
}

export function initDatabase(customUrl?: string, customToken?: string): Client {
  const url = customUrl !== undefined ? customUrl : (process.env.TURSO_DATABASE_URL || '');
  const authToken = customToken !== undefined ? customToken : (process.env.TURSO_AUTH_TOKEN || '');

  currentDbConfig = { url, authToken };

  if (url && url.trim().length > 0) {
    console.log(`[Database] Connecting to Turso LibSQL at: ${url.replace(/:[^:]*@/, ':***@')}`);
    dbClient = createClient({
      url: url.trim(),
      authToken: authToken.trim() || undefined,
    });
  } else {
    // Fallback to local SQLite file using @libsql/client
    const dbDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const localDbPath = path.join(dbDir, 'consultorio.db');
    console.log(`[Database] Using local SQLite file at: ${localDbPath}`);
    dbClient = createClient({
      url: `file:${localDbPath}`,
    });
  }

  return dbClient;
}

export function getDatabaseStatus() {
  const isTurso = Boolean(currentDbConfig.url && (currentDbConfig.url.startsWith('libsql://') || currentDbConfig.url.startsWith('https://') || currentDbConfig.url.startsWith('wss://')));
  return {
    isConfigured: Boolean(currentDbConfig.url),
    isTurso,
    type: isTurso ? 'Turso Cloud (LibSQL)' : 'SQLite Local (@libsql/client)',
    url: currentDbConfig.url ? currentDbConfig.url.replace(/:\/\/([^@]+@)?/, '://***@') : 'file:data/consultorio.db',
    hasAuthToken: Boolean(currentDbConfig.authToken),
  };
}

export async function bootstrapDatabase(): Promise<void> {
  const db = getDb();

  console.log('[Database] Running schema migrations...');

  // 1. Users table (Consultorio account holders / Admins)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      clinic_name TEXT,
      role TEXT DEFAULT 'user',
      reset_token TEXT,
      reset_token_expires TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Schema upgrades for existing SQLite tables if already created
  try {
    await db.execute('ALTER TABLE users ADD COLUMN clinic_name TEXT;');
  } catch (_) {}

  // 2. Therapists profile
  await db.execute(`
    CREATE TABLE IF NOT EXISTS therapists (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      full_name TEXT NOT NULL,
      license_number TEXT,
      specialty TEXT,
      phone TEXT,
      email TEXT NOT NULL,
      hourly_rate REAL DEFAULT 50.0,
      currency TEXT DEFAULT 'USD',
      bio TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 3. Therapist schedules
  await db.execute(`
    CREATE TABLE IF NOT EXISTS therapist_schedules (
      id TEXT PRIMARY KEY,
      therapist_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL, -- 0: Domingo, 1: Lunes ... 6: Sábado
      start_time TEXT NOT NULL, -- e.g. "09:00"
      end_time TEXT NOT NULL,   -- e.g. "18:00"
      slot_duration_minutes INTEGER DEFAULT 50,
      break_start TEXT,         -- e.g. "13:00"
      break_end TEXT,           -- e.g. "14:00"
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
    );
  `);

  // 4. Patients table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      full_name TEXT NOT NULL,
      document_type TEXT DEFAULT 'DNI',
      document_number TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      date_of_birth TEXT,
      gender TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      reason_for_consultation TEXT,
      medical_history TEXT,
      psychological_history TEXT,
      assigned_therapist_id TEXT,
      status TEXT DEFAULT 'activo', -- activo, inactivo, alta
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_therapist_id) REFERENCES therapists(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    await db.execute('ALTER TABLE patients ADD COLUMN user_id TEXT;');
  } catch (_) {}

  // 5. Appointments table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      patient_id TEXT NOT NULL,
      therapist_id TEXT NOT NULL,
      appointment_date TEXT NOT NULL, -- YYYY-MM-DD
      start_time TEXT NOT NULL,       -- HH:MM
      end_time TEXT NOT NULL,         -- HH:MM
      session_type TEXT DEFAULT 'individual', -- individual, pareja, infanto_juvenil, evaluacion
      status TEXT DEFAULT 'programada',       -- programada, confirmada, realizada, cancelada, reprogramada
      agreed_fee REAL DEFAULT 50.0,
      notes TEXT,
      cancellation_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    await db.execute('ALTER TABLE appointments ADD COLUMN user_id TEXT;');
  } catch (_) {}

  // 6. Psychotherapy sessions (Clinical Evolution / SOAP)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS psychotherapy_sessions (
      id TEXT PRIMARY KEY,
      appointment_id TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL,
      therapist_id TEXT NOT NULL,
      session_date TEXT NOT NULL,
      subjective_notes TEXT, -- Lo referido por el paciente
      objective_notes TEXT,  -- Observaciones clínicas del terapeuta
      assessment_notes TEXT, -- Análisis/hipótesis diagnóstica
      plan_notes TEXT,       -- Plan de tratamiento y tareas intersesión
      private_notes TEXT,    -- Notas confidenciales exclusivas del terapeuta
      ai_summary TEXT,       -- Resumen generado por Gemini 2.5 Flash
      ai_risk_factors TEXT,  -- Alertas/Factores de riesgo identificados
      ai_next_goals TEXT,    -- Metas sugeridas para siguiente sesión
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
    );
  `);

  // 7. Invoices table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      invoice_number TEXT UNIQUE NOT NULL,
      appointment_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      therapist_id TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      session_cost REAL NOT NULL,
      tax_rate REAL DEFAULT 0.0,
      tax_amount REAL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      payment_status TEXT DEFAULT 'pendiente', -- pendiente, pagada, anulada
      payment_method TEXT DEFAULT 'transferencia', -- efectivo, transferencia, tarjeta
      notes TEXT,
      sent_via_email INTEGER DEFAULT 0,
      email_sent_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    await db.execute('ALTER TABLE invoices ADD COLUMN user_id TEXT;');
  } catch (_) {}

  // 8. System settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin and initial sample data if no users exist
  await seedInitialData(db);
  console.log('[Database] Migrations and seeding completed.');
}

async function seedInitialData(db: Client) {
  const usersCheck = await db.execute('SELECT COUNT(*) as count FROM users');
  const count = Number(usersCheck.rows[0]?.count || 0);

  if (count === 0) {
    console.log('[Database] Seeding initial therapist user and sample clinic data...');
    const adminPasswordHash = await bcrypt.hash('terapeuta123', 10);
    const userId = 'usr_admin_01';
    const therapistId = 'th_01';

    // Insert user (Clinic account owner)
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, name, clinic_name, role) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [userId, 'doctora.elena@consultorio.com', adminPasswordHash, 'Dra. Elena Vasquez', 'Consultorio Psicológico Vasquez & Asociados', 'admin'],
    });

    // Insert first therapist
    await db.execute({
      sql: `INSERT INTO therapists (id, user_id, full_name, license_number, specialty, phone, email, hourly_rate, currency, bio, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        therapistId,
        userId,
        'Dra. Elena Vasquez',
        'PSI-COL-84920',
        'Psicología Clínica y Terapia Cognitivo-Conductual',
        '+34 612 345 678',
        'doctora.elena@consultorio.com',
        65.0,
        'USD',
        'Especialista en trastornos de ansiedad, depresión y regulación emocional en adultos y adolescentes.',
        1,
      ],
    });

    // Insert second therapist owned by the same user account
    const therapist2Id = 'th_02';
    await db.execute({
      sql: `INSERT INTO therapists (id, user_id, full_name, license_number, specialty, phone, email, hourly_rate, currency, bio, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        therapist2Id,
        userId,
        'Lic. Marco Antonio Silva',
        'PSI-COL-99214',
        'Terapia de Pareja, Familiar y Sistémica',
        '+34 655 432 109',
        'marco.silva@consultorio.com',
        70.0,
        'USD',
        'Especialista en mediación y dinámicas relacionales familiares.',
        1,
      ],
    });

    // Insert therapist schedules for therapist 1
    for (let day = 1; day <= 5; day++) {
      await db.execute({
        sql: `INSERT INTO therapist_schedules (id, therapist_id, day_of_week, start_time, end_time, slot_duration_minutes, break_start, break_end, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [`sch_${therapistId}_${day}`, therapistId, day, '09:00', '18:00', 50, '13:00', '14:00', 1],
      });
    }

    // Insert therapist schedules for therapist 2
    for (let day = 1; day <= 5; day++) {
      await db.execute({
        sql: `INSERT INTO therapist_schedules (id, therapist_id, day_of_week, start_time, end_time, slot_duration_minutes, break_start, break_end, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [`sch_${therapist2Id}_${day}`, therapist2Id, day, '10:00', '19:00', 50, '14:00', '15:00', 1],
      });
    }

    // Insert 2 sample patients
    const patient1Id = 'pat_01';
    const patient2Id = 'pat_02';

    await db.execute({
      sql: `INSERT INTO patients (id, user_id, full_name, document_type, document_number, email, phone, date_of_birth, gender, emergency_contact_name, emergency_contact_phone, reason_for_consultation, medical_history, psychological_history, assigned_therapist_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        patient1Id,
        userId,
        'Carlos Mendoza Ruiz',
        'DNI',
        '45892314K',
        'carlos.mendoza@email.com',
        '+34 689 112 233',
        '1992-05-14',
        'Masculino',
        'Laura Ruiz (Madre)',
        '+34 677 889 900',
        'Episodios recurrentes de ansiedad laboral y dificultades para conciliar el sueño.',
        'Sin enfermedades crónicas reportadas. Ninguna medicación actual.',
        'Tratamiento previo breve en 2021 por estrés post-universitario.',
        therapistId,
        'activo',
      ],
    });

    await db.execute({
      sql: `INSERT INTO patients (id, user_id, full_name, document_type, document_number, email, phone, date_of_birth, gender, emergency_contact_name, emergency_contact_phone, reason_for_consultation, medical_history, psychological_history, assigned_therapist_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        patient2Id,
        userId,
        'Sofía Navarro Ortiz',
        'DNI',
        '33912048M',
        'sofia.navarro@email.com',
        '+34 622 445 566',
        '1988-11-20',
        'Femenino',
        'Marcos Ortiz (Hermano)',
        '+34 633 221 100',
        'Duelo tras ruptura de pareja y baja autoestima generalizada.',
        'Hipotiroidismo controlado con levotiroxina.',
        'Sin antecedentes psiquiátricos previos.',
        therapist2Id,
        'activo',
      ],
    });

    // Insert a past completed appointment and session for patient 1
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 2);
    const pastDateStr = pastDate.toISOString().split('T')[0];

    const aptPastId = 'apt_01';
    await db.execute({
      sql: `INSERT INTO appointments (id, user_id, patient_id, therapist_id, appointment_date, start_time, end_time, session_type, status, agreed_fee, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        aptPastId,
        userId,
        patient1Id,
        therapistId,
        pastDateStr,
        '10:00',
        '10:50',
        'individual',
        'realizada',
        65.0,
        'Sesión inicial de evaluación y encuadre terapéutico.',
      ],
    });

    // Insert psychotherapy session for the past appointment
    await db.execute({
      sql: `INSERT INTO psychotherapy_sessions (id, appointment_id, patient_id, therapist_id, session_date, subjective_notes, objective_notes, assessment_notes, plan_notes, private_notes, ai_summary, ai_risk_factors, ai_next_goals)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'sess_01',
        aptPastId,
        patient1Id,
        therapistId,
        pastDateStr,
        'Carlos manifiesta sentirse abrumado en su puesto de líder técnico. Reporta opresión torácica ocasional los domingos por la tarde y rumiación nocturna.',
        'Paciente colaborador, orientado en tiempo y espacio. Contacto visual sostenido. Discurso coherente y fluido con afecto ligeramente ansioso.',
        'Sintomatología compatible con Trastorno de Ansiedad Generalizada moderado desencadenado por estresores laborales. Recursos cognitivos y red de apoyo preservados.',
        '1. Psicoeducación sobre el ciclo de la ansiedad y rumiación.\n2. Registro de pensamientos automáticos en situaciones de sobrecarga.\n3. Práctica de respiración diafragmática 10 min antes de dormir.',
        'Explorar en la próxima sesión el patrón de autoexigencia y el temor al rechazo en su entorno familiar.',
        'Sesión de encuadre donde se identificaron estresores laborales vinculados a ansiedad anticipatoria y rumiación.',
        'Nivel de riesgo bajo; sin ideación autolítica ni conductas autodestructivas. Vigilar somatizaciones.',
        'Revisión del autorregistro de pensamientos y consolidación de límites en horario laboral.',
      ],
    });

    // Insert upcoming appointment for tomorrow
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    await db.execute({
      sql: `INSERT INTO appointments (id, user_id, patient_id, therapist_id, appointment_date, start_time, end_time, session_type, status, agreed_fee, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'apt_02',
        userId,
        patient2Id,
        therapistId,
        futureDateStr,
        '11:00',
        '11:50',
        'individual',
        'confirmada',
        65.0,
        'Primera sesión tras contacto inicial telefónico.',
      ],
    });

    // Insert invoice for the past appointment
    await db.execute({
      sql: `INSERT INTO invoices (id, user_id, invoice_number, appointment_id, patient_id, therapist_id, issue_date, due_date, session_cost, tax_rate, tax_amount, total_amount, currency, payment_status, payment_method, notes, sent_via_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'inv_01',
        userId,
        'FAC-2025-001',
        aptPastId,
        patient1Id,
        therapistId,
        pastDateStr,
        pastDateStr,
        65.0,
        0,
        0,
        65.0,
        'USD',
        'pagada',
        'transferencia',
        'Honorarios profesionales correspondientes a sesión de psicoterapia clínica.',
        1,
      ],
    });
  }
}
