import nodemailer from 'nodemailer';
import { getDb } from './db.js';

export interface MailerConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export async function getMailerConfig(): Promise<MailerConfig> {
  let dbSettings: Record<string, string> = {};
  try {
    const db = getDb();
    const rows = await db.execute("SELECT key, value FROM system_settings WHERE key LIKE 'smtp_%'");
    for (const r of rows.rows) {
      dbSettings[r.key as string] = r.value as string;
    }
  } catch {
    // fallback to env
  }

  const host = dbSettings['smtp_host'] || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(dbSettings['smtp_port'] || process.env.SMTP_PORT || '587', 10);
  const user = dbSettings['smtp_user'] || process.env.SMTP_USER || '';
  const pass = dbSettings['smtp_pass'] || process.env.SMTP_PASS || '';
  const from = dbSettings['smtp_from'] || process.env.EMAIL_FROM || 'Consultorio Psicológico <notificaciones@consultorio.com>';

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from,
  };
}

export async function createTransporter(customConfig?: Partial<MailerConfig>) {
  const config = { ...(await getMailerConfig()), ...customConfig };
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? {
      user: config.user,
      pass: config.pass,
    } : undefined,
  });
}

export async function testSmtpConnection(customConfig?: Partial<MailerConfig>): Promise<{ success: boolean; message: string }> {
  try {
    const config = { ...(await getMailerConfig()), ...customConfig };
    if (!config.user || !config.pass) {
      return {
        success: false,
        message: 'Faltan credenciales de usuario o contraseña de aplicación (App Password) de Google.',
      };
    }
    const transporter = await createTransporter(config);
    await transporter.verify();
    return {
      success: true,
      message: `Conexión SMTP exitosa con el servidor ${config.host}:${config.port} usando la cuenta ${config.user}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error de conexión SMTP: ${err.message || 'Error desconocido al conectar con el servidor de correo.'}`,
    };
  }
}

export async function sendPasswordResetEmail(email: string, userName: string, resetToken: string, code: string): Promise<{ sent: boolean; message: string; previewCode?: string }> {
  const config = await getMailerConfig();

  const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/#reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
      <div style="border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 700;">PsicoGestión · Consultorio Clínico</h2>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Sistema Seguro de Gestión Psicológica</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hola <strong>${userName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta del consultorio.</p>
      
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600;">Código de verificación temporal</span>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 0.15em; color: #0f172a; font-family: monospace; margin-top: 6px;">${code}</div>
        <p style="font-size: 12px; color: #94a3b8; margin: 6px 0 0 0;">Válido por 30 minutos</p>
      </div>

      <div style="margin: 28px 0; text-align: center;">
        <a href="${resetLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Restablecer Contraseña Directamente</a>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura. Tu clave actual permanecerá inalterada.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">PsicoGestión · Cumplimiento de Confidencialidad y Seguridad Médica</p>
    </div>
  `;

  if (!config.user || !config.pass) {
    console.log(`[SMTP Not Configured] Reset code for ${email}: ${code}. Link: ${resetLink}`);
    return {
      sent: false,
      message: 'El servidor SMTP de Google no tiene credenciales configuradas aún. El código de reseteo ha sido registrado para acceso inmediato.',
      previewCode: code,
    };
  }

  try {
    const transporter = await createTransporter(config);
    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: `Código de recuperación de contraseña: ${code} - PsicoGestión`,
      html: htmlContent,
    });
    return { sent: true, message: 'Correo de recuperación enviado exitosamente.' };
  } catch (err: any) {
    console.error('[SMTP Error] Failed to send reset email:', err);
    return {
      sent: false,
      message: `Error al enviar email por SMTP (${err.message}). Puedes usar el código generado.`,
      previewCode: code,
    };
  }
}

export async function sendInvoiceEmail(data: {
  patientEmail: string;
  patientName: string;
  therapistName: string;
  invoiceNumber: string;
  issueDate: string;
  sessionCost: number;
  totalAmount: number;
  currency: string;
  notes?: string;
}): Promise<{ sent: boolean; message: string }> {
  const config = await getMailerConfig();

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between;">
        <div>
          <h2 style="margin: 0; color: #0f172a; font-size: 20px;">Factura de Honorarios Profesionales</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Comprobante Nº: <strong>${data.invoiceNumber}</strong></p>
        </div>
      </div>
      
      <p style="font-size: 14px; color: #334155;">Estimado/a <strong>${data.patientName}</strong>,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">Adjunto remitimos los detalles de su comprobante por los servicios de psicoterapia prestados por <strong>${data.therapistName}</strong>.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;">
            <th style="padding: 10px 12px; color: #475569;">Concepto</th>
            <th style="padding: 10px 12px; color: #475569; text-align: right;">Fecha</th>
            <th style="padding: 10px 12px; color: #475569; text-align: right;">Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px; color: #1e293b;">Sesión de Psicoterapia Clínica Individual</td>
            <td style="padding: 12px; text-align: right; color: #64748b;">${data.issueDate}</td>
            <td style="padding: 12px; text-align: right; font-family: monospace; font-weight: 600;">${data.sessionCost.toFixed(2)} ${data.currency}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid #e2e8f0; font-weight: 700;">
            <td colspan="2" style="padding: 12px; text-align: right; color: #0f172a;">TOTAL:</td>
            <td style="padding: 12px; text-align: right; font-family: monospace; color: #0f172a; font-size: 16px;">${data.totalAmount.toFixed(2)} ${data.currency}</td>
          </tr>
        </tfoot>
      </table>

      ${data.notes ? `<p style="font-size: 13px; color: #64748b; background: #f8fafc; padding: 10px 14px; border-radius: 6px;"><strong>Observaciones:</strong> ${data.notes}</p>` : ''}

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">Gracias por su confianza en nuestro acompañamiento profesional.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">PsicoGestión · Comprobante generado electrónicamente</p>
    </div>
  `;

  if (!config.user || !config.pass) {
    console.log(`[SMTP Not Configured] Invoice ${data.invoiceNumber} email simulated for ${data.patientEmail}`);
    return {
      sent: false,
      message: 'Configura las credenciales SMTP de Google en Ajustes para enviar emails reales a pacientes. La factura ha sido registrada en el sistema.',
    };
  }

  try {
    const transporter = await createTransporter(config);
    await transporter.sendMail({
      from: config.from,
      to: data.patientEmail,
      subject: `Factura ${data.invoiceNumber} - Consulta Psicológica`,
      html: htmlContent,
    });
    return { sent: true, message: 'Factura enviada al paciente por correo exitosamente.' };
  } catch (err: any) {
    console.error('[SMTP Error] Failed to send invoice email:', err);
    return { sent: false, message: `Error al enviar por SMTP: ${err.message}` };
  }
}
