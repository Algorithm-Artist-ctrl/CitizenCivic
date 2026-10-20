import { Resend } from 'resend';
import { config } from '../config';

/**
 * Lazily instantiate Resend client.
 * Never leaks the key or secret contents.
 */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY || config.resendApiKey;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new Resend(apiKey.trim());
}

export interface EmailResult {
  success: boolean;
  configured: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface CaseEmailContext {
  caseNumber: string;
  categoryName: string;
  landmark: string;
  description: string;
  status: string;
  previousStatus?: string;
  reason?: string;
  karmaEarned?: number;
  language?: 'en' | 'hi';
}

/**
 * Diagnostic health check verifying whether RESEND_API_KEY is configured.
 */
export async function checkEmailHealth(): Promise<{
  configured: boolean;
  from_email: string;
  status: 'configured' | 'unconfigured';
  message: string;
}> {
  const client = getResendClient();
  const fromEmail = config.resendFromEmail || 'notifications@citizencivic.org';

  if (!client) {
    return {
      configured: false,
      from_email: fromEmail,
      status: 'unconfigured',
      message: 'RESEND_API_KEY is not configured on the server. Email notifications are gracefully disabled.',
    };
  }

  return {
    configured: true,
    from_email: fromEmail,
    status: 'configured',
    message: 'Resend email client is configured with server environment credentials.',
  };
}

/**
 * Core send helper. Non-blocking; will never crash callers if email fails.
 */
async function sendNotificationEmail(
  toEmail: string,
  subject: string,
  html: string,
  text: string
): Promise<EmailResult> {
  const timestamp = new Date().toISOString();
  const client = getResendClient();

  if (!client) {
    return {
      success: false,
      configured: false,
      error: 'RESEND_API_KEY not configured.',
      timestamp,
    };
  }

  if (!toEmail || !toEmail.includes('@')) {
    return {
      success: false,
      configured: true,
      error: 'Invalid recipient email address.',
      timestamp,
    };
  }

  try {
    const fromAddress = config.resendFromEmail || 'CitizenCivic Notifications <onboarding@resend.dev>';
    const response = await client.emails.send({
      from: fromAddress,
      to: [toEmail.trim()],
      subject,
      html,
      text,
    });

    if (response.error) {
      console.warn('[email/resend] Delivery error:', response.error.message);
      return {
        success: false,
        configured: true,
        error: response.error.message,
        timestamp,
      };
    }

    return {
      success: true,
      configured: true,
      messageId: response.data?.id,
      timestamp,
    };
  } catch (err: any) {
    console.warn('[email/resend] Exception sending email:', err.message);
    return {
      success: false,
      configured: true,
      error: err.message || 'Unknown network error communicating with Resend.',
      timestamp,
    };
  }
}

/**
 * 1. Notification: Case Submitted
 */
export async function notifyCaseSubmitted(
  toEmail: string,
  ctx: CaseEmailContext
): Promise<EmailResult> {
  const isHi = ctx.language === 'hi';
  const subject = isHi
    ? `[CitizenCivic] समस्या दर्ज की गई: ${ctx.caseNumber}`
    : `[CitizenCivic] Issue Report Registered: ${ctx.caseNumber}`;

  const html = isHi
    ? `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="margin-bottom: 20px;">
          <h2 style="color: #065f46; margin: 0 0 6px 0;">CitizenCivic</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">नागरिक जवाबदेही और समाधान प्रणाली</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 16px 0;" />
        <h3 style="color: #0f172a; margin-top: 0;">आपकी नागरिक समस्या सफलतापूर्वक दर्ज हो गई है</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">
          आपका संदर्भ क्रमांक है: <strong style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${ctx.caseNumber}</strong>
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>श्रेणी:</strong> ${ctx.categoryName}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>स्थान / लैंडमार्क:</strong> ${ctx.landmark}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>विवरण:</strong> ${ctx.description}</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          इस रिपोर्ट को निकटतम नगर निगम पर्यवेक्षक को भेज दिया गया है। जब भी स्थिति में प्रगति होगी, आपको सूचित किया जाएगा।
        </p>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 24px;">यह एक स्वचालित संदेश है। कृपया इसका उत्तर न दें।</p>
      </div>
    `
    : `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="margin-bottom: 20px;">
          <h2 style="color: #065f46; margin: 0 0 6px 0;">CitizenCivic</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Civic Accountability & Verified Resolution Engine</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 16px 0;" />
        <h3 style="color: #0f172a; margin-top: 0;">Civic Issue Report Registered</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">
          Your report has been successfully recorded under Case Reference: <strong style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${ctx.caseNumber}</strong>
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Category:</strong> ${ctx.categoryName}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Location / Landmark:</strong> ${ctx.landmark}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Description:</strong> ${ctx.description}</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          This case has entered the municipal triage workflow. You will receive real-time notifications as field dispatch and verification occur.
        </p>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 24px;">This is an automated notification from CitizenCivic. Please do not reply directly.</p>
      </div>
    `;

  const text = `${subject}\n\nCase: ${ctx.caseNumber}\nCategory: ${ctx.categoryName}\nLocation: ${ctx.landmark}\nStatus: SUBMITTED\nDescription: ${ctx.description}`;
  return sendNotificationEmail(toEmail, subject, html, text);
}

/**
 * 2. Notification: Case Status Changed
 */
export async function notifyCaseStatusChanged(
  toEmail: string,
  ctx: CaseEmailContext
): Promise<EmailResult> {
  const isHi = ctx.language === 'hi';
  const subject = isHi
    ? `[CitizenCivic] स्थिति अपडेट: ${ctx.caseNumber} (${ctx.status})`
    : `[CitizenCivic] Status Update: ${ctx.caseNumber} is now ${ctx.status}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #065f46; margin: 0 0 4px 0;">CitizenCivic</h2>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 16px 0;" />
      <h3 style="color: #0f172a; margin-top: 0;">${isHi ? 'आपकी रिपोर्ट पर नई प्रगति हुई है' : 'Progress Update on Your Civic Report'}</h3>
      <p style="color: #334155; font-size: 14px;">
        ${isHi ? 'केस नंबर' : 'Case'}: <strong style="font-family: monospace;">${ctx.caseNumber}</strong><br />
        ${isHi ? 'नई स्थिति' : 'New Status'}: <strong style="color: #047857;">${ctx.status}</strong>
      </p>
      ${
        ctx.reason
          ? `<div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; font-size: 13px; color: #475569; margin: 12px 0;"><strong>${isHi ? 'टिप्पणी' : 'Officer Note'}:</strong> ${ctx.reason}</div>`
          : ''
      }
      <p style="color: #64748b; font-size: 13px;">${isHi ? 'आप कभी भी CitizenCivic पोर्टल पर पूरी टाइमलाइन देख सकते हैं।' : 'You can review full progress details on your CitizenCivic portal.'}</p>
    </div>
  `;

  const text = `${subject}\n\nCase: ${ctx.caseNumber}\nNew Status: ${ctx.status}\nNote: ${ctx.reason || 'None'}`;
  return sendNotificationEmail(toEmail, subject, html, text);
}

/**
 * 3. Notification: Verified Resolution & Karma Points Credited
 */
export async function notifyVerifiedResolved(
  toEmail: string,
  ctx: CaseEmailContext
): Promise<EmailResult> {
  const isHi = ctx.language === 'hi';
  const points = ctx.karmaEarned || 25;
  const subject = isHi
    ? `[CitizenCivic] समाधान सत्यापित! ${ctx.caseNumber} (+${points} कर्म अंक)`
    : `[CitizenCivic] Verified Resolved! ${ctx.caseNumber} (+${points} Karma Points)`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #10b981; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #065f46; margin: 0 0 4px 0;">CitizenCivic</h2>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <h3 style="color: #065f46; margin-top: 0;">🎉 ${isHi ? 'समस्या का समाधान सत्यापित हो गया है!' : 'Civic Issue Verified as Resolved!'}</h3>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        ${isHi ? 'केस' : 'Case'} <strong style="font-family: monospace;">${ctx.caseNumber}</strong> ${isHi ? 'की सफाई और मरम्मत की पुष्टि नगर निगम टीम द्वारा कर दी गई है।' : 'has been successfully cleared and independently verified on the ground.'}
      </p>
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; margin: 16px 0; text-align: center;">
        <span style="font-size: 24px; font-weight: bold; color: #047857; display: block;">+${points} Pts</span>
        <span style="font-size: 12px; color: #065f46; font-weight: 600;">${isHi ? 'सामुदायिक कर्म अंक जोड़े गए' : 'Community Karma Points Awarded'}</span>
      </div>
      <p style="color: #64748b; font-size: 13px;">${isHi ? 'सक्रिय नागरिकता और अपने शहर को बेहतर बनाने के लिए धन्यवाद।' : 'Thank you for active civic participation in building a cleaner, safer city.'}</p>
    </div>
  `;

  const text = `${subject}\n\nCase ${ctx.caseNumber} has been verified resolved. +${points} Karma points credited to your profile.`;
  return sendNotificationEmail(toEmail, subject, html, text);
}
