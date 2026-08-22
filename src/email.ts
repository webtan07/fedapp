/**
 * Transactional email for FED (server-only; never imported from client code).
 *
 * The sender is the shared Gmail app-password SMTP the business already uses —
 * admin@webdigitalassistants.com (see the WDA site's src/email.ts for the same
 * credentials). Values come from the env via src/config.ts (EMAIL_USER,
 * EMAIL_APP_PASSWORD, plus optional SMTP_HOST/PORT/SECURE overrides), never
 * hardcoded here. SMTP_HOST/PORT/SECURE default to Gmail's SMTP (smtp.gmail.com
 * on 465 with TLS) when not provided.
 *
 * This only ever emails someone who explicitly submitted their email during the
 * quiz funnel (opted-in transactional), and the content is truthful + honest —
 * no medical claims, no manufactured urgency.
 */
import nodemailer from "nodemailer";
import { config } from "~/config";

interface TransporterConfig {
  host: string;
  port: number;
  secure: boolean;
}

function smtpConfig(): TransporterConfig {
  return {
    host: config.smtpHost ?? "smtp.gmail.com",
    port: config.smtpPort ?? 465,
    secure: config.smtpSecure ?? true, // Gmail's 465 is implicit TLS
  };
}

function senderEmail(): string {
  return config.emailUser ?? "admin@webdigitalassistants.com";
}

/** Build the nodemailer transporter (lazy, per send). */
function createTransporter() {
  return nodemailer.createTransport({
    host: smtpConfig().host,
    port: smtpConfig().port,
    secure: smtpConfig().secure,
    auth: {
      user: senderEmail(),
      pass: config.emailAppPassword,
    },
  });
}

export interface FEDResultEmailData {
  /** Recipient email (their submitted quiz email). */
  to: string;
  /** Total FED score out of 24. */
  score: number;
  /** Profile name, e.g. "Completely FED Up". */
  profileName: string;
  /** Intensity tier label, e.g. "High". */
  intensityLabel: string;
  /** Per-pillar breakdown. */
  pillars: {
    fasting: number;
    exercise: number;
    diet: number;
  };
}

const INTENSITY_LABEL: Record<string, string> = {
  low: "Low",
  mid: "Mid",
  high: "High",
};

export function intensityLabel(intensity: string): string {
  return INTENSITY_LABEL[intensity] ?? intensity;
}

/**
 * Send the "your FED result" email. Returns the nodemailer send info so
 * callers can log success. Throws on failure — callers MUST guard this with
 * try/catch (see sendQuizResultEmail in api/quiz.ts) so a mail failure never
 * breaks quiz submission.
 */
export async function sendQuizResultEmail(
  data: FEDResultEmailData,
): Promise<unknown> {
  const from = `"FED" <${senderEmail()}>`;
  const resultLink = config.appBaseUrl;

  const subject = `Your FED score: ${data.score}/24 — you're not broken`;

  const pillarRows = [
    ["Fasting", data.pillars.fasting],
    ["Exercise", data.pillars.exercise],
    ["Diet", data.pillars.diet],
  ] as const;

  const html = `
    <div style="font-family:Georgia,serif;color:#2B1F1C;max-width:560px;margin:0 auto;padding:24px;">
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:.15em;color:#C1673C;text-transform:uppercase;">FED — Fasting · Exercise · Diet</p>
      <h1 style="font-size:26px;line-height:1.3;margin:8px 0 4px;">You're not broken.</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a3a30;">Here's your FED read — what's loud in your system right now, and a gentle first step to feel more like you again.</p>

      <div style="background:#FFF4E6;border:1px solid #F0E0CC;border-radius:14px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:.15em;color:#B04A2E;text-transform:uppercase;">Your FED score</p>
        <p style="margin:0;font-size:44px;font-weight:bold;color:#B04A2E;">${data.score}<span style="font-size:22px;color:#C98F45;">/24</span></p>
        <p style="margin:12px 0 0;font-size:18px;font-weight:bold;">${data.profileName} — ${data.intensityLabel}</p>
        <table style="width:100%;margin-top:16px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
          ${pillarRows
            .map(
              ([label, value]) => `
            <tr>
              <td style="padding:6px 0;color:#4a3a30;">${label}</td>
              <td style="padding:6px 0;text-align:right;font-weight:bold;color:#C1673C;">${value}/8</td>
            </tr>`,
            )
            .join("")}
        </table>
      </div>

      <p style="font-size:16px;line-height:1.6;color:#4a3a30;">
        Your personalized plan — a fasting window, a daily move, and a plate idea,
        all tuned to your profile — is waiting for you. Most people feel the shift
        in small, everyday ways: energy returning in the afternoon, sleeping a
        little deeper, not running on empty.
      </p>

      <p style="font-size:16px;line-height:1.6;color:#4a3a30;">
        Take a look at what we put together for you:
      </p>
      <p style="margin:20px 0;">
        <a href="${resultLink}" style="display:inline-block;background:linear-gradient(90deg,#C1673C,#C98F45);color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">See your FED plan</a>
      </p>

      <p style="font-size:12px;line-height:1.6;color:#8a7a6d;border-top:1px solid #F0E0CC;padding-top:14px;margin-top:24px;">
        FED is a general wellness product, not medical advice. Please consult your
        doctor before making changes to your diet, fasting, or exercise routine.
      </p>
    </div>
  `;

  const text = `
You're not broken — here's how to feel FED.

Your FED score: ${data.score}/24
Profile: ${data.profileName} (${data.intensityLabel})

Breakdown:
- Fasting:  ${data.pillars.fasting}/8
- Exercise: ${data.pillars.exercise}/8
- Diet:     ${data.pillars.diet}/8

Your personalized plan — a fasting window, a daily move, and a plate idea tuned
to your profile — is waiting for you here:
${resultLink}

FED is a general wellness product, not medical advice. Please consult your
doctor before making changes to your diet, fasting, or exercise routine.
  `.trim();

  const transporter = createTransporter();
  return await transporter.sendMail({
    from,
    to: data.to,
    subject,
    html,
    text,
  });
}
