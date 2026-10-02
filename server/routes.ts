import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb, getDatabaseStatus, initDatabase, bootstrapDatabase } from './db.js';
import { getActiveAIConfig, updateAIConfig, processNotesSOAP, analyzeSessionClinicalInsights, polishClinicalNote } from './ai.js';
import { getMailerConfig, testSmtpConnection, sendPasswordResetEmail, sendInvoiceEmail } from './mailer.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'psicogestion_secure_jwt_secret_2025';

export interface AuthPayload {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'therapist';
  name: string;
  clinic_name?: string | null;
}

// Auth middleware that resolves authenticated user
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido para acceder a los recursos.' });
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Sesión expirada o token inválido.' });
    }

    try {
      (req as any).user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
        name: decoded.name,
        clinic_name: decoded.clinic_name || null,
      } as AuthPayload;

      next();
    } catch (e: any) {
      return res.status(500).json({ error: 'Error al verificar perfil de usuario.' });
    }
  });
}

// ----------------------------------------------------
// 1. AUTHENTICATION ROUTES (USERS)
// ----------------------------------------------------

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, clinic_name, clinicName, role = 'user' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, contraseña y nombre completo son obligatorios.' });
    }

    const db = getDb();
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email.toLowerCase().trim()],
    });

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe una cuenta de usuario registrada con este correo electrónico.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const finalClinicName = (clinic_name || clinicName || 'Mi Consultorio Psicológico').trim();

    await db.execute({
      sql: 'INSERT INTO users (id, email, password_hash, name, clinic_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      args: [userId, email.toLowerCase().trim(), passwordHash, name.trim(), finalClinicName, assignedRole],
    });

    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), role: assignedRole, name: name.trim(), clinic_name: finalClinicName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Cuenta de usuario creada con éxito.',
      token,
      user: { id: userId, email: email.toLowerCase().trim(), name: name.trim(), clinic_name: finalClinicName, role: assignedRole },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Error al registrar usuario.' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos.' });
    }

    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT id, email, password_hash, name, clinic_name, role FROM users WHERE email = ?',
      args: [email.toLowerCase().trim()],
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo o regístrate como nuevo usuario.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash as string);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas. Contraseña incorrecta.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, clinic_name: user.clinic_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        clinic_name: user.clinic_name,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Error al iniciar sesión.' });
  }
});

// Demo access route (returns token for demo user account)
router.post('/auth/demo', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT id, email, name, clinic_name, role FROM users WHERE email = 'doctora.elena@consultorio.com' LIMIT 1",
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario demo no encontrado en el sistema.' });
    }

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, clinic_name: user.clinic_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Sesión demo iniciada.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        clinic_name: user.clinic_name,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT id, email, name, clinic_name, role, created_at FROM users WHERE id = ?',
      args: [authUser.id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const thResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM therapists WHERE user_id = ?',
      args: [authUser.id],
    });

    res.json({
      user: result.rows[0],
      therapistsCount: Number(thResult.rows[0]?.count || 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Ingresa tu correo electrónico registrado.' });
    }

    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT id, name, email FROM users WHERE email = ?',
      args: [email.toLowerCase().trim()],
    });

    if (result.rows.length === 0) {
      return res.json({
        message: 'Si la cuenta existe, se ha generado y enviado el código de restablecimiento por correo.',
      });
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const sixDigitCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await db.execute({
      sql: 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      args: [`${resetToken}:${sixDigitCode}`, expires, user.id],
    });

    const mailResult = await sendPasswordResetEmail(user.email as string, user.name as string, resetToken, sixDigitCode);

    res.json({
      message: mailResult.message,
      emailSent: mailResult.sent,
      previewCode: mailResult.previewCode,
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: err.message || 'Error al procesar recuperación.' });
  }
});

router.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, código/token y nueva contraseña son obligatorios.' });
    }

    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT id, reset_token, reset_token_expires FROM users WHERE email = ?',
      args: [email.toLowerCase().trim()],
    });

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Solicitud inválida o expirada.' });
    }

    const user = result.rows[0];
    if (!user.reset_token || !user.reset_token_expires) {
      return res.status(400).json({ error: 'No hay ninguna solicitud de recuperación activa para esta cuenta.' });
    }

    const now = new Date();
    const expires = new Date(user.reset_token_expires as string);
    if (now > expires) {
      return res.status(400).json({ error: 'El código de recuperación ha expirado. Solicita uno nuevo.' });
    }

    const [storedToken, storedCode] = (user.reset_token as string).split(':');
    const inputCode = code.trim();

    if (inputCode !== storedCode && inputCode !== storedToken) {
      return res.status(400).json({ error: 'El código o token de verificación es incorrecto.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.execute({
      sql: 'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      args: [passwordHash, user.id],
    });

    res.json({ message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva clave.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar contraseña.' });
  }
});

// ----------------------------------------------------
// 2. THERAPISTS & AGENDAS (USER MULTI-TENANCY)
// ----------------------------------------------------

// Admin sees all therapists; normal user sees all therapists they have created
router.get('/therapists', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    if (user.role === 'admin') {
      const result = await db.execute('SELECT * FROM therapists ORDER BY full_name ASC');
      return res.json(result.rows);
    }

    // Regular user: returns all therapists belonging to their consultorio
    const result = await db.execute({
      sql: 'SELECT * FROM therapists WHERE user_id = ? ORDER BY full_name ASC',
      args: [user.id],
    });
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ANY USER CAN REGISTER MULTIPLE THERAPISTS FOR THEIR CLINIC!
router.post('/therapists', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const { full_name, license_number, specialty, phone, email, hourly_rate, currency = 'USD', bio } = req.body;
    if (!full_name || !email) {
      return res.status(400).json({ error: 'Nombre completo y correo del terapeuta son requeridos.' });
    }

    const db = getDb();
    const therapistId = `th_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ownerUserId = user.role === 'admin' && req.body.user_id ? req.body.user_id : user.id;

    await db.execute({
      sql: `INSERT INTO therapists (id, user_id, full_name, license_number, specialty, phone, email, hourly_rate, currency, bio, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [therapistId, ownerUserId, full_name.trim(), license_number || '', specialty || '', phone || '', email.trim(), Number(hourly_rate) || 50.0, currency, bio || ''],
    });

    // Default schedules (Monday to Friday, 09:00 - 18:00)
    for (let day = 1; day <= 5; day++) {
      await db.execute({
        sql: `INSERT INTO therapist_schedules (id, therapist_id, day_of_week, start_time, end_time, slot_duration_minutes, break_start, break_end, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [`sch_${therapistId}_${day}`, therapistId, day, '09:00', '18:00', 50, '13:00', '14:00', 1],
      });
    }

    res.status(201).json({ message: 'Terapeuta registrado con éxito.', id: therapistId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/therapists/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    if (user.role !== 'admin') {
      const check = await db.execute({
        sql: 'SELECT user_id FROM therapists WHERE id = ?',
        args: [req.params.id],
      });
      if (check.rows.length === 0 || check.rows[0].user_id !== user.id) {
        return res.status(403).json({ error: 'No tienes permisos para modificar este terapeuta.' });
      }
    }

    const { full_name, license_number, specialty, phone, email, hourly_rate, currency, bio, is_active } = req.body;

    await db.execute({
      sql: `UPDATE therapists SET full_name = ?, license_number = ?, specialty = ?, phone = ?, email = ?, hourly_rate = ?, currency = ?, bio = ?, is_active = ?
            WHERE id = ?`,
      args: [full_name, license_number, specialty, phone, email, Number(hourly_rate), currency, bio, is_active ? 1 : 0, req.params.id],
    });

    res.json({ message: 'Información del terapeuta actualizada.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/therapists/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    if (user.role !== 'admin') {
      const check = await db.execute({
        sql: 'SELECT user_id FROM therapists WHERE id = ?',
        args: [req.params.id],
      });
      if (check.rows.length === 0 || check.rows[0].user_id !== user.id) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar este terapeuta.' });
      }
    }

    await db.execute({
      sql: 'DELETE FROM therapists WHERE id = ?',
      args: [req.params.id],
    });

    res.json({ message: 'Terapeuta eliminado exitosamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schedules/:therapistId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    if (user.role !== 'admin') {
      const check = await db.execute({
        sql: 'SELECT user_id FROM therapists WHERE id = ?',
        args: [req.params.therapistId],
      });
      if (check.rows.length === 0 || check.rows[0].user_id !== user.id) {
        return res.status(403).json({ error: 'No tienes permisos para ver la agenda de este terapeuta.' });
      }
    }

    const result = await db.execute({
      sql: 'SELECT * FROM therapist_schedules WHERE therapist_id = ? ORDER BY day_of_week ASC',
      args: [req.params.therapistId],
    });
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/schedules/:therapistId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    if (user.role !== 'admin') {
      const check = await db.execute({
        sql: 'SELECT user_id FROM therapists WHERE id = ?',
        args: [req.params.therapistId],
      });
      if (check.rows.length === 0 || check.rows[0].user_id !== user.id) {
        return res.status(403).json({ error: 'No tienes permisos para modificar la agenda de este terapeuta.' });
      }
    }

    const { schedules } = req.body;
    const therapistId = req.params.therapistId;

    await db.execute({
      sql: 'DELETE FROM therapist_schedules WHERE therapist_id = ?',
      args: [therapistId],
    });

    for (const item of schedules) {
      await db.execute({
        sql: `INSERT INTO therapist_schedules (id, therapist_id, day_of_week, start_time, end_time, slot_duration_minutes, break_start, break_end, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `sch_${therapistId}_${item.day_of_week}`,
          therapistId,
          item.day_of_week,
          item.start_time,
          item.end_time,
          item.slot_duration_minutes || 50,
          item.break_start || null,
          item.break_end || null,
          item.is_active ? 1 : 0,
        ],
      });
    }

    res.json({ message: 'Horarios de atención guardados correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate available slots
router.get('/schedules/:therapistId/available-slots', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { therapistId } = req.params;
    const dateStr = req.query.date as string;
    if (!dateStr) {
      return res.status(400).json({ error: 'Parámetro de fecha requerido (YYYY-MM-DD).' });
    }

    const dateObj = new Date(dateStr + 'T12:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();

    const db = getDb();
    const schResult = await db.execute({
      sql: 'SELECT * FROM therapist_schedules WHERE therapist_id = ? AND day_of_week = ? AND is_active = 1',
      args: [therapistId, dayOfWeek],
    });

    if (schResult.rows.length === 0) {
      return res.json({ available: false, slots: [], message: 'El terapeuta no tiene atención programada para este día.' });
    }

    const schedule = schResult.rows[0];
    const durationMins = Number(schedule.slot_duration_minutes || 50);

    const appResult = await db.execute({
      sql: `SELECT start_time, end_time FROM appointments
            WHERE therapist_id = ? AND appointment_date = ? AND status != 'cancelada'`,
      args: [therapistId, dateStr],
    });

    const bookedRanges = appResult.rows.map((r) => ({
      start: r.start_time as string,
      end: r.end_time as string,
    }));

    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toHHMM = (m: number) => {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const min = (m % 60).toString().padStart(2, '0');
      return `${h}:${min}`;
    };

    const startMins = toMins(schedule.start_time as string);
    const endMins = toMins(schedule.end_time as string);
    const breakStartMins = schedule.break_start ? toMins(schedule.break_start as string) : -1;
    const breakEndMins = schedule.break_end ? toMins(schedule.break_end as string) : -1;

    const slots: Array<{ startTime: string; endTime: string; isBooked: boolean }> = [];

    for (let current = startMins; current + durationMins <= endMins; current += 60) {
      const slotEnd = current + durationMins;

      const overlapsBreak =
        breakStartMins !== -1 &&
        ((current >= breakStartMins && current < breakEndMins) ||
          (slotEnd > breakStartMins && slotEnd <= breakEndMins));

      if (overlapsBreak) continue;

      const slotStartStr = toHHMM(current);
      const slotEndStr = toHHMM(slotEnd);

      const isBooked = bookedRanges.some((b) => {
        return (slotStartStr >= b.start && slotStartStr < b.end) || (slotEndStr > b.start && slotEndStr <= b.end);
      });

      slots.push({
        startTime: slotStartStr,
        endTime: slotEndStr,
        isBooked,
      });
    }

    res.json({ available: true, slots });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. PATIENTS & CLINICAL HISTORY (USER MULTI-TENANCY)
// ----------------------------------------------------

router.get('/patients', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const { search, therapistId, status } = req.query;
    const db = getDb();

    let sql = `
      SELECT p.*, t.full_name as assigned_therapist_name,
        (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id AND a.status = 'realizada') as completed_sessions_count
      FROM patients p
      LEFT JOIN therapists t ON p.assigned_therapist_id = t.id
      WHERE 1=1
    `;
    const args: any[] = [];

    // RBAC: If not admin, only show patients belonging to this user or assigned to this user's therapists
    if (user.role !== 'admin') {
      sql += ` AND (p.user_id = ? OR p.assigned_therapist_id IN (SELECT id FROM therapists WHERE user_id = ?))`;
      args.push(user.id, user.id);
    }

    if (therapistId) {
      sql += ` AND p.assigned_therapist_id = ?`;
      args.push(therapistId);
    }

    if (search) {
      sql += ` AND (p.full_name LIKE ? OR p.document_number LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)`;
      const term = `%${search}%`;
      args.push(term, term, term, term);
    }

    if (status) {
      sql += ` AND p.status = ?`;
      args.push(status);
    }

    sql += ' ORDER BY p.full_name ASC';

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/patients', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const {
      full_name,
      document_type = 'DNI',
      document_number,
      email,
      phone,
      date_of_birth,
      gender,
      emergency_contact_name,
      emergency_contact_phone,
      reason_for_consultation,
      medical_history,
      psychological_history,
      assigned_therapist_id,
      status = 'activo',
    } = req.body;

    if (!full_name || !document_number) {
      return res.status(400).json({ error: 'Nombre completo y documento de identidad son requeridos.' });
    }

    const db = getDb();
    const patientId = `pat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.execute({
      sql: `INSERT INTO patients (
        id, user_id, full_name, document_type, document_number, email, phone, date_of_birth,
        gender, emergency_contact_name, emergency_contact_phone, reason_for_consultation,
        medical_history, psychological_history, assigned_therapist_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        patientId,
        user.id,
        full_name.trim(),
        document_type,
        document_number.trim(),
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        date_of_birth || null,
        gender || 'No especificado',
        emergency_contact_name || null,
        emergency_contact_phone || null,
        reason_for_consultation || null,
        medical_history || null,
        psychological_history || null,
        assigned_therapist_id || null,
        status,
      ],
    });

    res.status(201).json({ message: 'Paciente registrado exitosamente.', id: patientId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/patients/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    const patientResult = await db.execute({
      sql: `SELECT p.*, t.full_name as assigned_therapist_name, t.hourly_rate as therapist_rate, t.currency as therapist_currency
            FROM patients p
            LEFT JOIN therapists t ON p.assigned_therapist_id = t.id
            WHERE p.id = ?`,
      args: [req.params.id],
    });

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado.' });
    }

    const patient = patientResult.rows[0];

    // RBAC: Check user ownership
    if (user.role !== 'admin' && patient.user_id !== user.id) {
      const thCheck = await db.execute({
        sql: 'SELECT id FROM therapists WHERE id = ? AND user_id = ?',
        args: [patient.assigned_therapist_id || '', user.id],
      });
      if (thCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No tienes acceso al expediente clínico de este paciente.' });
      }
    }

    // Fetch history
    let historySql = `
      SELECT a.id as appointment_id, a.appointment_date, a.start_time, a.end_time, a.session_type, a.status as appointment_status,
             a.agreed_fee, a.notes as appointment_notes,
             t.full_name as therapist_name,
             s.id as session_id, s.subjective_notes, s.objective_notes, s.assessment_notes, s.plan_notes,
             s.private_notes, s.ai_summary, s.ai_risk_factors, s.ai_next_goals,
             i.id as invoice_id, i.invoice_number, i.payment_status as invoice_payment_status, i.total_amount as invoice_amount
      FROM appointments a
      JOIN therapists t ON a.therapist_id = t.id
      LEFT JOIN psychotherapy_sessions s ON a.id = s.appointment_id
      LEFT JOIN invoices i ON a.id = i.appointment_id
      WHERE a.patient_id = ?
    `;
    const historyArgs: any[] = [req.params.id];

    if (user.role !== 'admin') {
      historySql += ` AND (a.user_id = ? OR a.therapist_id IN (SELECT id FROM therapists WHERE user_id = ?))`;
      historyArgs.push(user.id, user.id);
    }

    historySql += ` ORDER BY a.appointment_date DESC, a.start_time DESC`;

    const historyResult = await db.execute({
      sql: historySql,
      args: historyArgs,
    });

    res.json({
      patient,
      history: historyResult.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/patients/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    if (user.role !== 'admin') {
      const check = await db.execute({
        sql: 'SELECT user_id, assigned_therapist_id FROM patients WHERE id = ?',
        args: [req.params.id],
      });
      if (check.rows.length === 0 || (check.rows[0].user_id && check.rows[0].user_id !== user.id)) {
        return res.status(403).json({ error: 'No tienes permisos para editar los datos de este paciente.' });
      }
    }

    const {
      full_name,
      document_type,
      document_number,
      email,
      phone,
      date_of_birth,
      gender,
      emergency_contact_name,
      emergency_contact_phone,
      reason_for_consultation,
      medical_history,
      psychological_history,
      assigned_therapist_id,
      status,
    } = req.body;

    await db.execute({
      sql: `UPDATE patients SET
        full_name = ?, document_type = ?, document_number = ?, email = ?, phone = ?,
        date_of_birth = ?, gender = ?, emergency_contact_name = ?, emergency_contact_phone = ?,
        reason_for_consultation = ?, medical_history = ?, psychological_history = ?,
        assigned_therapist_id = ?, status = ?
        WHERE id = ?`,
      args: [
        full_name,
        document_type,
        document_number,
        email,
        phone,
        date_of_birth,
        gender,
        emergency_contact_name,
        emergency_contact_phone,
        reason_for_consultation,
        medical_history,
        psychological_history,
        assigned_therapist_id || null,
        status,
        req.params.id,
      ],
    });

    res.json({ message: 'Paciente actualizado exitosamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/patients/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    if (user.role !== 'admin') {
      const check = await db.execute({
        sql: 'SELECT user_id FROM patients WHERE id = ?',
        args: [req.params.id],
      });
      if (check.rows.length === 0 || (check.rows[0].user_id && check.rows[0].user_id !== user.id)) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar a este paciente.' });
      }
    }

    await db.execute({
      sql: 'DELETE FROM patients WHERE id = ?',
      args: [req.params.id],
    });
    res.json({ message: 'Paciente eliminado del sistema.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. APPOINTMENTS (USER MULTI-TENANCY)
// ----------------------------------------------------

router.get('/appointments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const { date, therapistId, patientId, status } = req.query;
    const db = getDb();

    let sql = `
      SELECT a.*, p.full_name as patient_name, p.document_number as patient_document, p.email as patient_email, p.phone as patient_phone,
             t.full_name as therapist_name, t.currency as therapist_currency,
             s.id as session_id,
             i.id as invoice_id, i.invoice_number, i.payment_status as invoice_status
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN therapists t ON a.therapist_id = t.id
      LEFT JOIN psychotherapy_sessions s ON a.id = s.appointment_id
      LEFT JOIN invoices i ON a.id = i.appointment_id
      WHERE 1=1
    `;
    const args: any[] = [];

    // RBAC: If not admin, restrict to appointments of this user's consultorio
    if (user.role !== 'admin') {
      sql += ' AND (a.user_id = ? OR a.therapist_id IN (SELECT id FROM therapists WHERE user_id = ?))';
      args.push(user.id, user.id);
    }

    if (therapistId) {
      sql += ' AND a.therapist_id = ?';
      args.push(therapistId);
    }

    if (date) {
      sql += ' AND a.appointment_date = ?';
      args.push(date);
    }
    if (patientId) {
      sql += ' AND a.patient_id = ?';
      args.push(patientId);
    }
    if (status) {
      sql += ' AND a.status = ?';
      args.push(status);
    }

    sql += ' ORDER BY a.appointment_date DESC, a.start_time DESC';

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/appointments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const {
      patient_id,
      therapist_id,
      appointment_date,
      start_time,
      end_time,
      session_type = 'individual',
      agreed_fee,
      notes,
    } = req.body;

    if (!patient_id || !therapist_id || !appointment_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Paciente, terapeuta, fecha, hora inicio y fin son obligatorios.' });
    }

    const db = getDb();

    // Verify therapist belongs to user or user is admin
    if (user.role !== 'admin') {
      const thCheck = await db.execute({
        sql: 'SELECT id FROM therapists WHERE id = ? AND user_id = ?',
        args: [therapist_id, user.id],
      });
      if (thCheck.rows.length === 0) {
        return res.status(403).json({ error: 'El terapeuta seleccionado no pertenece a tu consultorio.' });
      }
    }

    // Check for collision
    const collisionCheck = await db.execute({
      sql: `SELECT id FROM appointments
            WHERE therapist_id = ? AND appointment_date = ? AND status != 'cancelada'
            AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))`,
      args: [therapist_id, appointment_date, start_time, start_time, end_time, end_time],
    });

    if (collisionCheck.rows.length > 0) {
      return res.status(400).json({ error: 'El terapeuta ya tiene una cita agendada en ese rango horario.' });
    }

    const aptId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.execute({
      sql: `INSERT INTO appointments (id, user_id, patient_id, therapist_id, appointment_date, start_time, end_time, session_type, status, agreed_fee, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'programada', ?, ?)`,
      args: [aptId, user.id, patient_id, therapist_id, appointment_date, start_time, end_time, session_type, Number(agreed_fee) || 50.0, notes || null],
    });

    res.status(201).json({ message: 'Cita programada con éxito.', id: aptId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/appointments/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    // RBAC: Check ownership
    if (user.role !== 'admin') {
      const check = await db.execute({
        sql: `SELECT a.user_id, a.therapist_id FROM appointments a
              LEFT JOIN therapists t ON a.therapist_id = t.id
              WHERE a.id = ? AND (a.user_id = ? OR t.user_id = ?)`,
        args: [req.params.id, user.id, user.id],
      });
      if (check.rows.length === 0) {
        return res.status(403).json({ error: 'No tienes permisos para modificar citas de otro consultorio.' });
      }
    }

    const { appointment_date, start_time, end_time, session_type, status, agreed_fee, notes, cancellation_reason } = req.body;

    await db.execute({
      sql: `UPDATE appointments SET
        appointment_date = COALESCE(?, appointment_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        session_type = COALESCE(?, session_type),
        status = COALESCE(?, status),
        agreed_fee = COALESCE(?, agreed_fee),
        notes = COALESCE(?, notes),
        cancellation_reason = COALESCE(?, cancellation_reason)
        WHERE id = ?`,
      args: [
        appointment_date || null,
        start_time || null,
        end_time || null,
        session_type || null,
        status || null,
        agreed_fee !== undefined ? Number(agreed_fee) : null,
        notes !== undefined ? notes : null,
        cancellation_reason !== undefined ? cancellation_reason : null,
        req.params.id,
      ],
    });

    res.json({ message: 'Cita actualizada exitosamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. PSYCHOTHERAPY SESSIONS & CLINICAL NOTES (USER MULTI-TENANCY)
// ----------------------------------------------------

router.get('/sessions/appointment/:appointmentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    const result = await db.execute({
      sql: `SELECT s.*, a.appointment_date, a.session_type, a.status as appointment_status,
                   p.full_name as patient_name, p.document_number as patient_document, p.reason_for_consultation,
                   t.full_name as therapist_name, a.therapist_id, a.user_id as appointment_user_id
            FROM psychotherapy_sessions s
            JOIN appointments a ON s.appointment_id = a.id
            JOIN patients p ON s.patient_id = p.id
            JOIN therapists t ON s.therapist_id = t.id
            WHERE s.appointment_id = ?`,
      args: [req.params.appointmentId],
    });

    if (result.rows.length === 0) {
      const apt = await db.execute({
        sql: `SELECT a.*, p.full_name as patient_name, p.document_number as patient_document, p.reason_for_consultation,
                     t.full_name as therapist_name, t.user_id as therapist_user_id
              FROM appointments a
              JOIN patients p ON a.patient_id = p.id
              JOIN therapists t ON a.therapist_id = t.id
              WHERE a.id = ?`,
        args: [req.params.appointmentId],
      });

      if (apt.rows.length === 0) {
        return res.status(404).json({ error: 'Cita no encontrada.' });
      }

      if (user.role !== 'admin' && apt.rows[0].user_id !== user.id && apt.rows[0].therapist_user_id !== user.id) {
        return res.status(403).json({ error: 'No tienes acceso a las notas clínicas de esta sesión.' });
      }

      return res.json({ session: null, appointment: apt.rows[0] });
    }

    const session = result.rows[0];
    if (user.role !== 'admin') {
      const thCheck = await db.execute({
        sql: 'SELECT user_id FROM therapists WHERE id = ?',
        args: [session.therapist_id],
      });
      if (session.appointment_user_id !== user.id && thCheck.rows[0]?.user_id !== user.id) {
        return res.status(403).json({ error: 'No tienes acceso a las notas clínicas de esta sesión.' });
      }
    }

    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const {
      appointment_id,
      patient_id,
      therapist_id,
      session_date,
      subjective_notes,
      objective_notes,
      assessment_notes,
      plan_notes,
      private_notes,
      ai_summary,
      ai_risk_factors,
      ai_next_goals,
    } = req.body;

    const db = getDb();

    // Verify appointment ownership
    const aptCheck = await db.execute({
      sql: `SELECT a.user_id, a.therapist_id, a.patient_id, t.user_id as therapist_user_id
            FROM appointments a
            JOIN therapists t ON a.therapist_id = t.id
            WHERE a.id = ?`,
      args: [appointment_id],
    });

    if (aptCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }

    if (user.role !== 'admin' && aptCheck.rows[0].user_id !== user.id && aptCheck.rows[0].therapist_user_id !== user.id) {
      return res.status(403).json({ error: 'No puedes redactar notas para una sesión de otro consultorio.' });
    }

    const effectiveTherapistId = therapist_id || aptCheck.rows[0].therapist_id;
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.execute({
      sql: `INSERT INTO psychotherapy_sessions (
        id, appointment_id, patient_id, therapist_id, session_date,
        subjective_notes, objective_notes, assessment_notes, plan_notes,
        private_notes, ai_summary, ai_risk_factors, ai_next_goals, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(appointment_id) DO UPDATE SET
        subjective_notes = excluded.subjective_notes,
        objective_notes = excluded.objective_notes,
        assessment_notes = excluded.assessment_notes,
        plan_notes = excluded.plan_notes,
        private_notes = excluded.private_notes,
        ai_summary = excluded.ai_summary,
        ai_risk_factors = excluded.ai_risk_factors,
        ai_next_goals = excluded.ai_next_goals,
        updated_at = CURRENT_TIMESTAMP`,
      args: [
        sessionId,
        appointment_id,
        patient_id || aptCheck.rows[0].patient_id,
        effectiveTherapistId,
        session_date || new Date().toISOString().split('T')[0],
        subjective_notes || '',
        objective_notes || '',
        assessment_notes || '',
        plan_notes || '',
        private_notes || '',
        ai_summary || '',
        ai_risk_factors || '',
        ai_next_goals || '',
      ],
    });

    await db.execute({
      sql: `UPDATE appointments SET status = 'realizada' WHERE id = ? AND status != 'realizada'`,
      args: [appointment_id],
    });

    res.json({ message: 'Notas clínicas guardadas con éxito.' });
  } catch (err: any) {
    console.error('Session save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. AI CLINICAL PROCESSING (GEMINI 2.5 FLASH)
// ----------------------------------------------------

router.post('/ai/soap', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { rawNotes, patientContext } = req.body;
    if (!rawNotes || rawNotes.trim().length === 0) {
      return res.status(400).json({ error: 'Ingresa las notas tomadas durante la sesión para procesar.' });
    }
    const result = await processNotesSOAP(rawNotes, patientContext);
    res.json(result);
  } catch (err: any) {
    console.error('AI SOAP Error:', err);
    res.status(500).json({ error: err.message || 'Error al procesar con Gemini 2.5 Flash.' });
  }
});

router.post('/ai/insights', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { subjective, objective, assessment, plan } = req.body;
    const result = await analyzeSessionClinicalInsights({
      subjective: subjective || '',
      objective: objective || '',
      assessment: assessment || '',
      plan: plan || '',
    });
    res.json(result);
  } catch (err: any) {
    console.error('AI Insights Error:', err);
    res.status(500).json({ error: err.message || 'Error al generar análisis clínico con Gemini.' });
  }
});

router.post('/ai/polish', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Texto requerido para pulir.' });
    }
    const polished = await polishClinicalNote(text);
    res.json({ polished });
  } catch (err: any) {
    console.error('AI Polish Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. INVOICES & BILLING (USER MULTI-TENANCY)
// ----------------------------------------------------

router.get('/invoices', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    let sql = `
      SELECT i.*, p.full_name as patient_name, p.document_number as patient_document, p.email as patient_email,
             t.full_name as therapist_name, a.appointment_date, a.session_type
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      JOIN therapists t ON i.therapist_id = t.id
      JOIN appointments a ON i.appointment_id = a.id
    `;
    const args: any[] = [];

    // RBAC: If not admin, only return this user's consultorio invoices
    if (user.role !== 'admin') {
      sql += ' WHERE (i.user_id = ? OR i.therapist_id IN (SELECT id FROM therapists WHERE user_id = ?))';
      args.push(user.id, user.id);
    }

    sql += ' ORDER BY i.issue_date DESC, i.created_at DESC';

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invoices/from-appointment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const { appointment_id, tax_rate = 0, notes, payment_method = 'transferencia', payment_status = 'pendiente' } = req.body;

    if (!appointment_id) {
      return res.status(400).json({ error: 'ID de cita requerido.' });
    }

    const db = getDb();
    const aptResult = await db.execute({
      sql: `SELECT a.*, p.id as patient_id, t.id as therapist_id, t.currency, t.user_id as therapist_user_id
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN therapists t ON a.therapist_id = t.id
            WHERE a.id = ?`,
      args: [appointment_id],
    });

    if (aptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }

    const apt = aptResult.rows[0];

    // RBAC: Check ownership
    if (user.role !== 'admin' && apt.user_id !== user.id && apt.therapist_user_id !== user.id) {
      return res.status(403).json({ error: 'No tienes permisos para emitir facturas de citas de otro consultorio.' });
    }

    const sessionCost = Number(apt.agreed_fee || 50.0);
    const taxRateNum = Number(tax_rate || 0);
    const taxAmount = (sessionCost * taxRateNum) / 100;
    const totalAmount = sessionCost + taxAmount;

    const year = new Date().getFullYear();
    const countCheck = await db.execute('SELECT COUNT(*) as count FROM invoices');
    const nextNum = (Number(countCheck.rows[0]?.count || 0) + 1).toString().padStart(4, '0');
    const invoiceNumber = `FAC-${year}-${nextNum}`;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    await db.execute({
      sql: `INSERT INTO invoices (
        id, user_id, invoice_number, appointment_id, patient_id, therapist_id,
        issue_date, due_date, session_cost, tax_rate, tax_amount, total_amount,
        currency, payment_status, payment_method, notes, sent_via_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      args: [
        invoiceId,
        user.id,
        invoiceNumber,
        appointment_id,
        apt.patient_id,
        apt.therapist_id,
        todayStr,
        todayStr,
        sessionCost,
        taxRateNum,
        taxAmount,
        totalAmount,
        apt.currency || 'USD',
        payment_status,
        payment_method,
        notes || 'Honorarios profesionales por atención psicoterapéutica.',
      ],
    });

    res.status(201).json({ message: 'Factura generada exitosamente.', id: invoiceId, invoiceNumber });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invoices/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();
    const result = await db.execute({
      sql: `
        SELECT i.*, p.full_name as patient_name, p.document_number as patient_document, p.email as patient_email, p.phone as patient_phone,
               t.full_name as therapist_name, t.license_number as therapist_license, t.email as therapist_email, t.phone as therapist_phone,
               t.user_id as therapist_user_id,
               a.appointment_date, a.start_time, a.end_time, a.session_type
        FROM invoices i
        JOIN patients p ON i.patient_id = p.id
        JOIN therapists t ON i.therapist_id = t.id
        JOIN appointments a ON i.appointment_id = a.id
        WHERE i.id = ?
      `,
      args: [req.params.id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada.' });
    }

    const inv = result.rows[0];
    if (user.role !== 'admin' && inv.user_id !== user.id && inv.therapist_user_id !== user.id) {
      return res.status(403).json({ error: 'No tienes permisos para ver comprobantes de otro consultorio.' });
    }

    res.json(inv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/invoices/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();

    if (user.role !== 'admin') {
      const check = await db.execute({
        sql: `SELECT i.user_id, t.user_id as therapist_user_id
              FROM invoices i
              JOIN therapists t ON i.therapist_id = t.id
              WHERE i.id = ?`,
        args: [req.params.id],
      });
      if (check.rows.length === 0 || (check.rows[0].user_id !== user.id && check.rows[0].therapist_user_id !== user.id)) {
        return res.status(403).json({ error: 'No tienes permisos para modificar facturas de otro consultorio.' });
      }
    }

    const { payment_status, payment_method } = req.body;
    await db.execute({
      sql: 'UPDATE invoices SET payment_status = ?, payment_method = COALESCE(?, payment_method) WHERE id = ?',
      args: [payment_status, payment_method || null, req.params.id],
    });
    res.json({ message: 'Estado de factura actualizado.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invoices/:id/send-email', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();
    const result = await db.execute({
      sql: `
        SELECT i.*, p.full_name as patient_name, p.email as patient_email,
               t.full_name as therapist_name, t.user_id as therapist_user_id
        FROM invoices i
        JOIN patients p ON i.patient_id = p.id
        JOIN therapists t ON i.therapist_id = t.id
        WHERE i.id = ?
      `,
      args: [req.params.id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada.' });
    }

    const inv = result.rows[0];
    if (user.role !== 'admin' && inv.user_id !== user.id && inv.therapist_user_id !== user.id) {
      return res.status(403).json({ error: 'No puedes despachar facturas de otro consultorio.' });
    }

    if (!inv.patient_email) {
      return res.status(400).json({ error: 'El paciente no tiene un correo electrónico registrado en su ficha.' });
    }

    const sendRes = await sendInvoiceEmail({
      patientEmail: inv.patient_email as string,
      patientName: inv.patient_name as string,
      therapistName: inv.therapist_name as string,
      invoiceNumber: inv.invoice_number as string,
      issueDate: inv.issue_date as string,
      sessionCost: Number(inv.session_cost),
      totalAmount: Number(inv.total_amount),
      currency: inv.currency as string,
      notes: (inv.notes as string) || undefined,
    });

    if (sendRes.sent) {
      await db.execute({
        sql: 'UPDATE invoices SET sent_via_email = 1, email_sent_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [req.params.id],
      });
    }

    res.json(sendRes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. GLOBAL SEARCH (USER MULTI-TENANCY)
// ----------------------------------------------------

router.get('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const query = ((req.query.q as string) || '').trim();
    if (!query || query.length < 2) {
      return res.json({ patients: [], therapists: [] });
    }

    const db = getDb();
    const term = `%${query}%`;

    let patientsSql = `SELECT id, full_name, document_type, document_number, email, phone, status
                       FROM patients
                       WHERE (full_name LIKE ? OR document_number LIKE ? OR email LIKE ? OR phone LIKE ?)`;
    const patientsArgs: any[] = [term, term, term, term];

    // RBAC: Non-admin only searches their own patients
    if (user.role !== 'admin') {
      patientsSql += ` AND (user_id = ? OR assigned_therapist_id IN (SELECT id FROM therapists WHERE user_id = ?))`;
      patientsArgs.push(user.id, user.id);
    }

    patientsSql += ` LIMIT 8`;
    const patientsResult = await db.execute({ sql: patientsSql, args: patientsArgs });

    let therapistsSql = `SELECT id, full_name, license_number, specialty, email, phone, hourly_rate, currency
                         FROM therapists
                         WHERE (full_name LIKE ? OR license_number LIKE ? OR email LIKE ? OR specialty LIKE ?)`;
    const therapistsArgs: any[] = [term, term, term, term];

    // RBAC: Non-admin searches their own therapists
    if (user.role !== 'admin') {
      therapistsSql += ` AND user_id = ?`;
      therapistsArgs.push(user.id);
    }

    therapistsSql += ` LIMIT 8`;
    const therapistsResult = await db.execute({ sql: therapistsSql, args: therapistsArgs });

    res.json({
      patients: patientsResult.rows,
      therapists: therapistsResult.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. SETTINGS & SYSTEM STATUS
// ----------------------------------------------------

router.get('/settings/status', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const dbStatus = getDatabaseStatus();
    const aiConfig = await getActiveAIConfig();
    const mailerConfig = await getMailerConfig();

    res.json({
      database: dbStatus,
      ai: {
        configured: Boolean(aiConfig.apiKey),
        model: aiConfig.model,
        hasBaseUrl: Boolean(aiConfig.baseUrl),
        apiKeyMasked: aiConfig.apiKey ? `${aiConfig.apiKey.substring(0, 4)}...${aiConfig.apiKey.substring(aiConfig.apiKey.length - 4)}` : 'No configurada',
      },
      smtp: {
        configured: Boolean(mailerConfig.user && mailerConfig.pass),
        host: mailerConfig.host,
        port: mailerConfig.port,
        user: mailerConfig.user || 'No configurado',
        hasPass: Boolean(mailerConfig.pass),
        from: mailerConfig.from,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings/turso', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede reconfigurar la base de datos principal.' });
    }

    const { url, token } = req.body;
    initDatabase(url, token);
    await bootstrapDatabase();

    res.json({
      success: true,
      message: 'Conexión a Turso actualizada y esquemas sincronizados correctamente.',
      database: getDatabaseStatus(),
    });
  } catch (err: any) {
    console.error('Turso config error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settings/gemini', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede alterar las credenciales del modelo Gemini.' });
    }

    const { apiKey, model, baseUrl } = req.body;
    await updateAIConfig({ apiKey, model, baseUrl });
    res.json({
      success: true,
      message: 'Configuración de Gemini actualizada con éxito.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settings/smtp', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede modificar las credenciales del servidor SMTP.' });
    }

    const { host, port, user: smtpUser, pass, from } = req.body;
    const db = getDb();

    if (host !== undefined) {
      await db.execute({
        sql: "INSERT INTO system_settings (key, value) VALUES ('smtp_host', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [host],
      });
    }
    if (port !== undefined) {
      await db.execute({
        sql: "INSERT INTO system_settings (key, value) VALUES ('smtp_port', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [String(port)],
      });
    }
    if (smtpUser !== undefined) {
      await db.execute({
        sql: "INSERT INTO system_settings (key, value) VALUES ('smtp_user', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [smtpUser],
      });
    }
    if (pass !== undefined) {
      await db.execute({
        sql: "INSERT INTO system_settings (key, value) VALUES ('smtp_pass', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [pass],
      });
    }
    if (from !== undefined) {
      await db.execute({
        sql: "INSERT INTO system_settings (key, value) VALUES ('smtp_from', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [from],
      });
    }

    res.json({ success: true, message: 'Configuración de Google SMTP guardada con éxito.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settings/smtp/test', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { host, port, user: smtpUser, pass } = req.body;
    const result = await testSmtpConnection({
      host: host || undefined,
      port: port ? Number(port) : undefined,
      user: smtpUser || undefined,
      pass: pass || undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 10. DASHBOARD STATS (RBAC FILTERED)
// ----------------------------------------------------

router.get('/dashboard/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Admin sees all clinic data; regular therapist sees only their own metrics
    if (user.role === 'admin') {
      const [patientsCount, todayApts, pendingInvoices, completedSessions] = await Promise.all([
        db.execute("SELECT COUNT(*) as count FROM patients WHERE status = 'activo'"),
        db.execute({
          sql: `SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status != 'cancelada'`,
          args: [today],
        }),
        db.execute("SELECT COUNT(*) as count, SUM(total_amount) as total FROM invoices WHERE payment_status = 'pendiente'"),
        db.execute("SELECT COUNT(*) as count FROM psychotherapy_sessions"),
      ]);

      const recentApts = await db.execute(`
        SELECT a.*, p.full_name as patient_name, t.full_name as therapist_name, s.id as session_id
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN therapists t ON a.therapist_id = t.id
        LEFT JOIN psychotherapy_sessions s ON a.id = s.appointment_id
        ORDER BY a.appointment_date DESC, a.start_time DESC
        LIMIT 6
      `);

      return res.json({
        scope: 'admin',
        activePatients: Number(patientsCount.rows[0]?.count || 0),
        todayAppointments: Number(todayApts.rows[0]?.count || 0),
        pendingInvoicesCount: Number(pendingInvoices.rows[0]?.count || 0),
        pendingInvoicesTotal: Number(pendingInvoices.rows[0]?.total || 0),
        completedSessionsCount: Number(completedSessions.rows[0]?.count || 0),
        recentAppointments: recentApts.rows,
      });
    }

    // Regular user scope (all therapists & patients belonging to this user)
    const [patientsCount, todayApts, pendingInvoices, completedSessions] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) as count FROM patients WHERE status = 'activo' AND (user_id = ? OR assigned_therapist_id IN (SELECT id FROM therapists WHERE user_id = ?))`,
        args: [user.id, user.id],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM appointments WHERE (user_id = ? OR therapist_id IN (SELECT id FROM therapists WHERE user_id = ?)) AND appointment_date = ? AND status != 'cancelada'`,
        args: [user.id, user.id, today],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count, SUM(total_amount) as total FROM invoices WHERE (user_id = ? OR therapist_id IN (SELECT id FROM therapists WHERE user_id = ?)) AND payment_status = 'pendiente'`,
        args: [user.id, user.id],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM psychotherapy_sessions WHERE therapist_id IN (SELECT id FROM therapists WHERE user_id = ?)`,
        args: [user.id],
      }),
    ]);

    const recentApts = await db.execute({
      sql: `
        SELECT a.*, p.full_name as patient_name, t.full_name as therapist_name, s.id as session_id
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN therapists t ON a.therapist_id = t.id
        LEFT JOIN psychotherapy_sessions s ON a.id = s.appointment_id
        WHERE (a.user_id = ? OR a.therapist_id IN (SELECT id FROM therapists WHERE user_id = ?))
        ORDER BY a.appointment_date DESC, a.start_time DESC
        LIMIT 6
      `,
      args: [user.id, user.id],
    });

    res.json({
      scope: 'user',
      activePatients: Number(patientsCount.rows[0]?.count || 0),
      todayAppointments: Number(todayApts.rows[0]?.count || 0),
      pendingInvoicesCount: Number(pendingInvoices.rows[0]?.count || 0),
      pendingInvoicesTotal: Number(pendingInvoices.rows[0]?.total || 0),
      completedSessionsCount: Number(completedSessions.rows[0]?.count || 0),
      recentAppointments: recentApts.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
