import crypto from "crypto";
import { db } from "@/db";
import { tenantIntegrationSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secret";

// Per-tenant config for lead enrichment + inbound email, configured from the frontend. Mirrors
// EmailSettingsService: encrypted secret at rest, a masked view for the UI, and a resolved config
// for the backend. Replaces the platform env vars ENRICHMENT_API_* and EMAIL_INBOUND_SECRET.

export interface TenantIntegrationsView {
  enrichmentEnabled: boolean;
  enrichmentApiUrl: string | null;
  enrichmentAuthHeader: string | null;
  hasEnrichmentAuthValue: boolean;
  enrichmentTimeoutMs: number | null;
  inboundEmailEnabled: boolean;
  inboundEmailToken: string | null;
}

export interface EnrichmentConfig {
  url: string;
  authHeader: string;
  authValue: string;
  timeoutMs: number;
}

export interface EnrichmentInputUpsert {
  enabled?: boolean;
  apiUrl?: string | null;
  authHeader?: string | null;
  authValue?: string; // blank/undefined = keep existing
  timeoutMs?: number | null;
}

// Sensible fallbacks used only when a tenant leaves a field blank — not baked-in behaviour.
const DEFAULT_AUTH_HEADER = "Authorization";
const DEFAULT_TIMEOUT_MS = 10_000;

function newToken(): string {
  return crypto.randomBytes(24).toString("base64url"); // 32 url-safe chars
}

export class TenantIntegrationsService {
  static async getRaw(organizationId: string) {
    const [row] = await db
      .select()
      .from(tenantIntegrationSettings)
      .where(eq(tenantIntegrationSettings.organizationId, organizationId))
      .limit(1);
    return row ?? null;
  }

  static async getView(organizationId: string): Promise<TenantIntegrationsView> {
    const row = await this.getRaw(organizationId);
    return {
      enrichmentEnabled: row?.enrichmentEnabled === 1,
      enrichmentApiUrl: row?.enrichmentApiUrl ?? null,
      enrichmentAuthHeader: row?.enrichmentAuthHeader ?? null,
      hasEnrichmentAuthValue: !!row?.enrichmentAuthValueEnc,
      enrichmentTimeoutMs: row?.enrichmentTimeoutMs ?? null,
      inboundEmailEnabled: row?.inboundEmailEnabled === 1,
      inboundEmailToken: row?.inboundEmailToken ?? null,
    };
  }

  /** Upsert enrichment config. Keeps the stored auth value when the form leaves it blank. */
  static async upsertEnrichment(organizationId: string, input: EnrichmentInputUpsert): Promise<TenantIntegrationsView> {
    const existing = await this.getRaw(organizationId);
    const authValueEnc =
      input.authValue && input.authValue.length > 0
        ? encryptSecret(input.authValue)
        : existing?.enrichmentAuthValueEnc ?? null;

    const values = {
      organizationId,
      enrichmentEnabled: (input.enabled ?? existing?.enrichmentEnabled === 1) ? 1 : 0,
      enrichmentApiUrl: input.apiUrl ?? existing?.enrichmentApiUrl ?? null,
      enrichmentAuthHeader: input.authHeader ?? existing?.enrichmentAuthHeader ?? null,
      enrichmentAuthValueEnc: authValueEnc,
      enrichmentTimeoutMs: input.timeoutMs ?? existing?.enrichmentTimeoutMs ?? null,
      // Carry inbound-email fields through unchanged.
      inboundEmailEnabled: existing?.inboundEmailEnabled ?? 0,
      inboundEmailToken: existing?.inboundEmailToken ?? null,
      updatedAt: new Date(),
    };

    await db
      .insert(tenantIntegrationSettings)
      .values(values)
      .onConflictDoUpdate({
        target: tenantIntegrationSettings.organizationId,
        set: {
          enrichmentEnabled: values.enrichmentEnabled,
          enrichmentApiUrl: values.enrichmentApiUrl,
          enrichmentAuthHeader: values.enrichmentAuthHeader,
          enrichmentAuthValueEnc: values.enrichmentAuthValueEnc,
          enrichmentTimeoutMs: values.enrichmentTimeoutMs,
          updatedAt: values.updatedAt,
        },
      });
    return this.getView(organizationId);
  }

  /** Enable/disable inbound email, minting a token on first enable. */
  static async setInboundEmail(organizationId: string, enabled: boolean): Promise<TenantIntegrationsView> {
    const existing = await this.getRaw(organizationId);
    const token = existing?.inboundEmailToken ?? (enabled ? newToken() : null);

    const values = {
      organizationId,
      enrichmentEnabled: existing?.enrichmentEnabled ?? 0,
      enrichmentApiUrl: existing?.enrichmentApiUrl ?? null,
      enrichmentAuthHeader: existing?.enrichmentAuthHeader ?? null,
      enrichmentAuthValueEnc: existing?.enrichmentAuthValueEnc ?? null,
      enrichmentTimeoutMs: existing?.enrichmentTimeoutMs ?? null,
      inboundEmailEnabled: enabled ? 1 : 0,
      inboundEmailToken: token,
      updatedAt: new Date(),
    };

    await db
      .insert(tenantIntegrationSettings)
      .values(values)
      .onConflictDoUpdate({
        target: tenantIntegrationSettings.organizationId,
        set: { inboundEmailEnabled: values.inboundEmailEnabled, inboundEmailToken: token, updatedAt: values.updatedAt },
      });
    return this.getView(organizationId);
  }

  /** Rotate the inbound token (invalidates the old webhook URL). */
  static async rotateInboundToken(organizationId: string): Promise<TenantIntegrationsView> {
    await db
      .update(tenantIntegrationSettings)
      .set({ inboundEmailToken: newToken(), updatedAt: new Date() })
      .where(eq(tenantIntegrationSettings.organizationId, organizationId));
    return this.getView(organizationId);
  }

  /** Resolved enrichment config for the backend, or null when off/incomplete/undecryptable. */
  static async getEnrichmentConfig(organizationId: string): Promise<EnrichmentConfig | null> {
    const row = await this.getRaw(organizationId);
    if (!row || row.enrichmentEnabled !== 1 || !row.enrichmentApiUrl || !row.enrichmentAuthValueEnc) return null;
    const authValue = decryptSecret(row.enrichmentAuthValueEnc);
    if (!authValue) return null; // key rotated / corrupt
    return {
      url: row.enrichmentApiUrl,
      authHeader: row.enrichmentAuthHeader || DEFAULT_AUTH_HEADER,
      authValue,
      timeoutMs: row.enrichmentTimeoutMs || DEFAULT_TIMEOUT_MS,
    };
  }

  /** Resolve the org for an inbound-email webhook token. Null when unknown or disabled. */
  static async resolveInboundToken(token: string): Promise<{ organizationId: string } | null> {
    if (!token) return null;
    const [row] = await db
      .select({ organizationId: tenantIntegrationSettings.organizationId })
      .from(tenantIntegrationSettings)
      .where(eq(tenantIntegrationSettings.inboundEmailToken, token))
      .limit(1);
    // getRaw would re-query; check enabled inline instead.
    if (!row) return null;
    const full = await this.getRaw(row.organizationId);
    return full?.inboundEmailEnabled === 1 ? { organizationId: row.organizationId } : null;
  }
}
