import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter!: nodemailer.Transporter;
  private fromEmail: string;
  private isMockMode: boolean = false;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@yourapp.com';
    this.createTransporter();
  }

  private createTransporter() {
    // Multiple email service configurations
    const emailService = process.env.EMAIL_SERVICE?.toLowerCase();

    switch (emailService) {
      case 'gmail':
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
          console.log('⚠️ Gmail credentials not configured, using mock email service');
          this.createMockTransporter();
          return;
        }
        this.transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: process.env.EMAIL_USER!,
            pass: process.env.EMAIL_APP_PASSWORD!, // App password, not regular password
          },
          tls: {
            rejectUnauthorized: false // Allow self-signed certificates
          },
          connectionTimeout: 60000, // 60 seconds
          greetingTimeout: 30000, // 30 seconds
          socketTimeout: 60000, // 60 seconds
        });
        break;

      case 'sendgrid':
        if (!process.env.SENDGRID_API_KEY) {
          console.log('⚠️ SendGrid API key not configured, using mock email service');
          this.createMockTransporter();
          return;
        }
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY!,
          },
        });
        break;

      case 'smtp':
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
          console.log('⚠️ SMTP credentials not configured, using mock email service');
          this.createMockTransporter();
          return;
        }
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST!,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER!,
            pass: process.env.SMTP_PASS!,
          },
        } as EmailConfig);
        break;

      default:
        console.log('⚠️ No email service configured, using mock email service');
        this.createMockTransporter();
        break;
    }
  }

  private createMockTransporter() {
    // Create a mock transporter for development
    this.isMockMode = true;
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `"Your App" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Check if this is mock mode (development)
      if (this.isMockMode) {
        console.log('\n📧 MOCK EMAIL SENT:');
        console.log('=====================================');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log('-------------------------------------');
        if (options.text) {
          console.log('Text Content:');
          console.log(options.text);
        }
        console.log('=====================================\n');
      } else {
        console.log('✅ Email sent successfully:', result.messageId);
      }
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = this.getPasswordResetEmailTemplate(userName, resetUrl);
    const text = this.getPasswordResetEmailText(userName, resetUrl);

    await this.sendEmail({
      to: email,
      subject: 'Recuperación de Contraseña - Your App',
      html,
      text,
    });
  }

  private getPasswordResetEmailTemplate(userName: string, resetUrl: string): string {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .title {
                color: #2c3e50;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #3498db;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
            }
            .button:hover {
                background-color: #2980b9;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
            .link-fallback {
                word-break: break-all;
                color: #3498db;
                margin-top: 10px;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔐 Your App</div>
            </div>
            
            <h1 class="title">Recuperación de Contraseña</h1>
            
            <div class="content">
                <p>Hola ${userName},</p>
                
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Si no solicitaste este cambio, puedes ignorar este correo electrónico.</p>
                
                <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Importante:</strong>
                    <ul>
                        <li>Este enlace expirará en 1 hora por seguridad</li>
                        <li>Solo puedes usar este enlace una vez</li>
                        <li>Si no funciona el botón, copia y pega el enlace de abajo en tu navegador</li>
                    </ul>
                </div>
                
                <div class="link-fallback">
                    <strong>Enlace alternativo:</strong><br>
                    ${resetUrl}
                </div>
            </div>
            
            <div class="footer">
                <p>Si no solicitaste este cambio de contraseña, por favor ignora este correo o contacta con nuestro soporte.</p>
                <p><strong>Your App Team</strong></p>
                <p style="font-size: 12px; color: #999;">
                    Este es un correo automático, por favor no respondas a esta dirección.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getPasswordResetEmailText(userName: string, resetUrl: string): string {
    return `
Recuperación de Contraseña - Your App

Hola ${userName},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetUrl}

IMPORTANTE:
- Este enlace expirará en 1 hora por seguridad
- Solo puedes usar este enlace una vez
- Si no solicitaste este cambio, puedes ignorar este correo

Si tienes problemas con el enlace, cópialo y pégalo en tu navegador.

Your App Team

---
Este es un correo automático, por favor no respondas a esta dirección.
    `;
  }

  // Test email connectivity
  async testConnection(): Promise<boolean> {
    try {
      if (this.isMockMode) {
        console.log('📧 Email service running in mock mode (development)');
        return true;
      }
      
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const emailService = new EmailService();