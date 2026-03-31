import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { getEnv, getEnvNumber } from '../common/env.utils';
import { EmailSendStatus } from '../auth/email-verification.entity';
import { writeAppLog } from '../common/logging.utils';

@Injectable()
export class EmailService {
  private readonly mode: string;
  private readonly transporter?: nodemailer.Transporter;

  constructor() {
    this.mode = (getEnv('EMAIL_MODE', 'console') ?? 'console').toLowerCase();
    const nodeEnv = (getEnv('NODE_ENV', 'development') ?? 'development').toLowerCase();
    if (nodeEnv === 'production' && this.mode !== 'smtp') {
      writeAppLog({
        level: 'warn',
        event: 'email_mode_warning',
        message: 'EMAIL_MODE no es smtp en produccion',
      });
    }
    if (this.mode === 'smtp') {
      const host = getEnv('SMTP_HOST');
      const port = getEnvNumber('SMTP_PORT', 587);
      const user = getEnv('SMTP_USER');
      const pass = getEnv('SMTP_PASS');
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
  }

  async sendVerificationCode(params: {
    to: string;
    code: string;
    nombre?: string | null;
  }) {
    if (this.mode !== 'smtp' || !this.transporter) {
      writeAppLog({
        event: 'email_console_delivery',
        message: `Codigo de verificacion simulado para ${params.to}`,
        data: { code: params.code },
      });
      return { status: EmailSendStatus.Simulated };
    }

    const from = getEnv('SMTP_FROM', 'no-reply@bsm.com.mx') ?? 'no-reply@bsm.com.mx';
    const displayName = params.nombre ? ` ${params.nombre}` : '';
    const subject = 'Codigo de verificacion DMS';
    const text = `Hola${displayName}, tu codigo de verificacion es: ${params.code}. Este codigo expira pronto.`;

    try {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject,
        text,
      });
      return { status: EmailSendStatus.Sent };
    } catch (error) {
      const message = (error as Error).message ?? 'SMTP error';
      return { status: EmailSendStatus.Failed, error: message };
    }
  }
}
