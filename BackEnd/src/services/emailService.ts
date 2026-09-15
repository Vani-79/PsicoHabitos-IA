import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface PatientEmailPayload {
  to: string;
  patientName: string;
  doctorName?: string;
}

export interface PsychologistEmailPayload {
  to: string;
  psychologistName: string;
}

export interface PasswordResetEmailPayload {
  to: string;
  userName: string;
  code: string;
}

/**
 * Crea o resuelve el transportador de correo nodemailer.
 */
function getTransporter() {
  dotenv.config({ override: true });
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Plantilla HTML con diseño profesional para la bienvenida de un nuevo paciente.
 */
function getPatientWelcomeHtml(patientName: string, doctorName: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a PsicoHábitos</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F3F7F5;
      margin: 0;
      padding: 24px 16px;
      color: #1F2937;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(15, 97, 59, 0.08);
      border: 1px solid #E5EBF0;
    }
    .header {
      background: linear-gradient(135deg, #0F613B 0%, #168A54 100%);
      padding: 32px 24px;
      text-align: center;
      color: #FFFFFF;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #D1FAE5;
    }
    .content {
      padding: 32px 28px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 16px;
    }
    .info-card {
      background-color: #F0FDF4;
      border-left: 4px solid #168A54;
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .steps-box {
      background-color: #F9FAFB;
      border-radius: 10px;
      padding: 20px;
      margin: 24px 0;
      border: 1px solid #E5E7EB;
    }
    .step-item {
      display: flex;
      margin-bottom: 12px;
    }
    .step-num {
      background-color: #0F613B;
      color: #FFFFFF;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .step-text {
      font-size: 14px;
      color: #374151;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
      border-top: 1px solid #E5E7EB;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PsicoHábitos</h1>
      <p>Tu bienestar mental, un día a la vez</p>
    </div>
    <div class="content">
      <div class="greeting">¡Hola, ${patientName}! 👋</div>
      <p>Te informamos que tu especialista de salud mental, <strong>${doctorName}</strong>, ha registrado con éxito tu ficha clínica en la plataforma <strong>PsicoHábitos</strong>.</p>
      
      <div class="info-card">
        <strong>Cuenta de acceso:</strong> ${email}<br>
        <strong>Estado de la cuenta:</strong> Pendiente de creación de contraseña
      </div>

      <p>Para activar tu acceso y comenzar el seguimiento de tus hábitos y ejercicios:</p>
      
      <div class="steps-box">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-text">Abre la aplicación <strong>PsicoHábitos</strong> en tu dispositivo.</div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-text">Ingresa tu correo electrónico: <strong>${email}</strong>.</div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-text">El sistema detectará que es tu primer acceso y te solicitará crear tu <strong>contraseña personal</strong>.</div>
        </div>
      </div>

      <p style="font-size: 13px; color: #4B5563;">
        <em>Nota de seguridad: Recuerda que tu contraseña debe contener mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.</em>
      </p>
    </div>
    <div class="footer">
      Este es un correo automático enviado por PsicoHábitos bajo los lineamientos de confidencialidad clínica.<br>
      © ${new Date().getFullYear()} PsicoHábitos. Todos los derechos reservados.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Plantilla HTML para la bienvenida de un nuevo especialista.
 */
function getPsychologistWelcomeHtml(psychologistName: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido al Portal de Especialistas PsicoHábitos</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F3F7F5;
      margin: 0;
      padding: 24px 16px;
      color: #1F2937;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(15, 97, 59, 0.08);
      border: 1px solid #E5EBF0;
    }
    .header {
      background: linear-gradient(135deg, #0F613B 0%, #168A54 100%);
      padding: 32px 24px;
      text-align: center;
      color: #FFFFFF;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #D1FAE5;
    }
    .content {
      padding: 32px 28px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 16px;
    }
    .info-card {
      background-color: #F0FDF4;
      border-left: 4px solid #168A54;
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .steps-box {
      background-color: #F9FAFB;
      border-radius: 10px;
      padding: 20px;
      margin: 24px 0;
      border: 1px solid #E5E7EB;
    }
    .step-item {
      display: flex;
      margin-bottom: 12px;
    }
    .step-num {
      background-color: #0F613B;
      color: #FFFFFF;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .step-text {
      font-size: 14px;
      color: #374151;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
      border-top: 1px solid #E5E7EB;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PsicoHábitos</h1>
      <p>Portal del Especialista en Salud Mental</p>
    </div>
    <div class="content">
      <div class="greeting">¡Estimado/a ${psychologistName}! 🩺</div>
      <p>Te damos una cordial bienvenida al equipo clínico de <strong>PsicoHábitos</strong>. Tu cuenta profesional ha sido dada de alta con éxito en la plataforma.</p>
      
      <div class="info-card">
        <strong>Cuenta de acceso:</strong> ${email}<br>
        <strong>Rol:</strong> Especialista / Psicólogo/a Clínico/a<br>
        <strong>Estado de la cuenta:</strong> Pendiente de creación de contraseña
      </div>

      <p>Para activar tu acceso al Portal del Especialista y comenzar la gestión de tus pacientes:</p>
      
      <div class="steps-box">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-text">Abre la aplicación <strong>PsicoHábitos</strong> en tu dispositivo.</div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-text">Ingresa tu correo profesional: <strong>${email}</strong>.</div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-text">El sistema te solicitará crear tu <strong>contraseña personal</strong> de acceso.</div>
        </div>
      </div>

      <p style="font-size: 13px; color: #4B5563;">
        <em>Nota: Recuerda que tu contraseña debe contener mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.</em>
      </p>
    </div>
    <div class="footer">
      Este es un correo oficial enviado por PsicoHábitos para el equipo médico.<br>
      © ${new Date().getFullYear()} PsicoHábitos. Confidencialidad clínica garantizada.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Plantilla HTML para envío de código de verificación de 6 dígitos para recuperación de contraseña.
 */
function getPasswordResetHtml(userName: string, code: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificación - PsicoHábitos</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F3F7F5;
      margin: 0;
      padding: 24px 16px;
      color: #1F2937;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(15, 97, 59, 0.08);
      border: 1px solid #E5EBF0;
    }
    .header {
      background: linear-gradient(135deg, #0F613B 0%, #168A54 100%);
      padding: 30px 24px;
      text-align: center;
      color: #FFFFFF;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #D1FAE5;
    }
    .content {
      padding: 32px 28px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 17px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 14px;
    }
    .code-box {
      background: #F0FDF4;
      border: 2px dashed #168A54;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .code-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
      color: #0F613B;
      margin-bottom: 8px;
    }
    .code-digits {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #0F613B;
    }
    .warning-box {
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 12px 16px;
      border-radius: 6px;
      margin: 18px 0;
      font-size: 13px;
      color: #92400E;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
      border-top: 1px solid #E5EBF0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PsicoHábitos-IA</h1>
      <p>Recuperación de Acceso a tu Cuenta</p>
    </div>
    <div class="content">
      <div class="greeting">Hola, ${userName || 'estimado/a usuario/a'}:</div>
      <p>
        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta asociada a <strong>${email}</strong>.
      </p>
      
      <div class="code-box">
        <div class="code-label">Tu Código de Verificación</div>
        <div class="code-digits">${code}</div>
      </div>

      <div class="warning-box">
        ⏱️ Este código es de un solo uso y expirará en <strong>15 minutos</strong>.
      </div>

      <p style="font-size: 13px; color: #4B5563;">
        Ingresa este código de 6 dígitos en la aplicación para verificar tu identidad y crear tu nueva contraseña.
      </p>
      
      <p style="font-size: 12px; color: #9CA3AF; margin-top: 24px; border-top: 1px solid #F3F4F6; padding-top: 14px;">
        Si no solicitaste este cambio, puedes ignorar este mensaje con total seguridad. Tu contraseña actual no ha sido modificada.
      </p>
    </div>
    <div class="footer">
      Este es un correo automático enviado por PsicoHábitos.<br>
      © ${new Date().getFullYear()} PsicoHábitos. Confidencialidad y seguridad clínica.
    </div>
  </div>
</body>
</html>
  `.trim();
}

export const emailService = {
  /**
   * Envía un correo de confirmación de registro a un paciente.
   */
  async sendPatientWelcomeEmail(payload: PatientEmailPayload): Promise<boolean> {
    const { to, patientName, doctorName = 'tu especialista de salud' } = payload;
    const from = process.env.SMTP_FROM || '"PsicoHábitos" <notificaciones@psicohabitos.com>';
    const subject = '¡Bienvenido/a a PsicoHábitos! Tu ficha clínica ha sido creada';
    const html = getPatientWelcomeHtml(patientName, doctorName, to);

    const transporter = getTransporter();

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        console.log(`✅ [EmailService] Correo enviado exitosamente a ${to} (ID: ${info.messageId})`);
        return true;
      } catch (error) {
        console.error(`❌ [EmailService] Error al enviar correo SMTP a ${to}:`, error);
        return false;
      }
    }

    // Modo desarrollo: Imprimir notificación en consola
    console.log('\n========================================================================');
    console.log('📧 [EmailService] SIMULACIÓN DE ENVÍO DE CORREO (Modo Desarrollo)');
    console.log(`Para: ${to} (${patientName})`);
    console.log(`Asunto: ${subject}`);
    console.log(`Especialista: ${doctorName}`);
    console.log('Instrucción al paciente: Ingresar a la app y crear contraseña por primera vez.');
    console.log('========================================================================\n');
    return true;
  },

  /**
   * Envía un correo de bienvenida a un especialista.
   */
  async sendPsychologistWelcomeEmail(payload: PsychologistEmailPayload): Promise<boolean> {
    const { to, psychologistName } = payload;
    const from = process.env.SMTP_FROM || '"PsicoHábitos" <notificaciones@psicohabitos.com>';
    const subject = 'Bienvenido/a a PsicoHábitos - Portal de Especialistas';
    const html = getPsychologistWelcomeHtml(psychologistName, to);

    const transporter = getTransporter();

    if (transporter) {
      try {
        await transporter.sendMail({ from, to, subject, html });
        console.log(`✅ [EmailService] Correo de especialista enviado a ${to}`);
        return true;
      } catch (error) {
        console.error(`❌ [EmailService] Error al enviar correo de especialista a ${to}:`, error);
        return false;
      }
    }

    console.log('\n========================================================================');
    console.log('📧 [EmailService] SIMULACIÓN DE ENVÍO DE CORREO A ESPECIALISTA (Modo Desarrollo)');
    console.log(`Para: ${to} (${psychologistName})`);
    console.log(`Asunto: ${subject}`);
    console.log('========================================================================\n');
    return true;
  },

  /**
   * Envía el código de verificación de 6 dígitos para recuperación de contraseña.
   */
  async sendPasswordResetCode(payload: PasswordResetEmailPayload): Promise<boolean> {
    const { to, userName, code } = payload;
    const from = process.env.SMTP_FROM || '"PsicoHábitos" <notificaciones@psicohabitos.com>';
    const subject = `${code} es tu código de recuperación - PsicoHábitos`;
    const html = getPasswordResetHtml(userName, code, to);

    const transporter = getTransporter();

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        console.log(`✅ [EmailService] Código de recuperación enviado exitosamente a ${to} (ID: ${info.messageId})`);
        return true;
      } catch (error) {
        console.error(`❌ [EmailService] Error al enviar código SMTP a ${to}:`, error);
        return false;
      }
    }

    console.log('\n========================================================================');
    console.log('📧 [EmailService] SIMULACIÓN DE CÓDIGO DE RECUPERACIÓN (Modo Desarrollo)');
    console.log(`Para: ${to} (${userName})`);
    console.log(`Asunto: ${subject}`);
    console.log(`CÓDIGO DE 6 DÍGITOS: ${code}`);
    console.log('Vigencia: 15 minutos');
    console.log('========================================================================\n');
    return true;
  },
};
