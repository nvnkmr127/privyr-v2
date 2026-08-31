import { db } from "@/db";
import { emailSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secret";

export interface EmailSettingsInput {
  fromName?: string | null;
  fromEmail?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  smtpPassword?: string | null; // plaintext from the form; "" = keep existing
  enabled?: boolean;
}

// What the settings UI sees — never the password itself, only whether one is stored.
export interface EmailSettingsView {
  fromName: string | null;
  fromEmail: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  hasPassword: boolean;
  enabled: boolean;
}

// Decrypted config ready to hand to nodemailer. Null unless enabled + fully configured.
export interface SendingConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string | null;
  fromEmail: string;
}

export class EmailSettingsService {
  static async getRaw(organizationId: string) {
    const [row] = await db.select().from(emailSettings).where(eq(emailSettings.organizationId, organizationId)).limit(1);
    return row ?? null;
  }

  static async getView(organizationId: string): Promise<EmailSettingsView> {
    const row = await this.getRaw(organizationId);
    return {
      fromName: row?.fromName ?? null,
      fromEmail: row?.fromEmail ?? null,
      smtpHost: row?.smtpHost ?? null,
      smtpPort: row?.smtpPort ?? null,
      smtpSecure: row ? row.smtpSecure === 1 : true,
      smtpUser: row?.smtpUser ?? null,
      hasPassword: !!row?.smtpPasswordEnc,
      enabled: row?.enabled === 1,
    };
  }

  static async upsert(organizationId: string, input: EmailSettingsInput) {
    const existing = await this.getRaw(organizationId);
    // Keep the stored password when the form leaves it blank; re-encrypt when a new one is given.
    const passwordEnc =
      input.smtpPassword && input.smtpPassword.length > 0
        ? encryptSecret(input.smtpPassword)
        : existing?.smtpPasswordEnc ?? null;

    const values = {
      organizationId,
      fromName: input.fromName ?? existing?.fromName ?? null,
      fromEmail: input.fromEmail ?? existing?.fromEmail ?? null,
      smtpHost: input.smtpHost ?? existing?.smtpHost ?? null,
      smtpPort: input.smtpPort ?? existing?.smtpPort ?? null,
      smtpSecure: (input.smtpSecure ?? (existing ? existing.smtpSecure === 1 : true)) ? 1 : 0,
      smtpUser: input.smtpUser ?? existing?.smtpUser ?? null,
      smtpPasswordEnc: passwordEnc,
      enabled: (input.enabled ?? existing?.enabled === 1) ? 1 : 0,
      updatedAt: new Date(),
    };

    await db
      .insert(emailSettings)
      .values(values)
      .onConflictDoUpdate({ target: emailSettings.organizationId, set: values });

    return this.getView(organizationId);
  }

  // Send a test message using the SAVED config (even if not yet enabled), so the tenant can verify
  // before switching it on. Throws the SMTP error so the caller can show it.
  static async sendTest(organizationId: string, to: string): Promise<void> {
    const row = await this.getRaw(organizationId);
    if (!row?.smtpHost || !row.smtpPort || !row.smtpUser || !row.smtpPasswordEnc || !row.fromEmail) {
      throw new Error("Fill in host, port, username, password and from-email, then Save before testing.");
    }
    const pass = decryptSecret(row.smtpPasswordEnc);
    if (!pass) throw new Error("Stored password couldn't be read — re-enter it and Save.");
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      host: row.smtpHost,
      port: row.smtpPort,
      secure: row.smtpSecure === 1,
      auth: { user: row.smtpUser, pass },
    });
    const from = row.fromName ? `${row.fromName} <${row.fromEmail}>` : row.fromEmail;
    await transport.sendMail({
      from,
      to,
      subject: "Privyr SMTP test",
      html: "<p>Your Privyr SMTP settings are working. 🎉</p>",
    });
  }

  // The config nodemailer needs, or null if this org shouldn't use custom SMTP.
  static async getSendingConfig(organizationId: string): Promise<SendingConfig | null> {
    const row = await this.getRaw(organizationId);
    if (!row || row.enabled !== 1) return null;
    if (!row.smtpHost || !row.smtpPort || !row.smtpUser || !row.smtpPasswordEnc || !row.fromEmail) return null;
    const pass = decryptSecret(row.smtpPasswordEnc);
    if (!pass) return null; // key rotated / corrupt — fall back to the shared transport
    return {
      host: row.smtpHost,
      port: row.smtpPort,
      secure: row.smtpSecure === 1,
      user: row.smtpUser,
      pass,
      fromName: row.fromName,
      fromEmail: row.fromEmail,
    };
  }
}
