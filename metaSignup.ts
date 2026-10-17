import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKEN_FILE = path.resolve(__dirname, 'data', 'whatsapp_tokens.json');

export class MetaSignupError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface ConnectedBusinessAccount {
  wabaId: string;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  connectedAt: string;
}

interface TokenRecord {
  accessToken: string;
  updatedAt: string;
}

function graphVersion() {
  return process.env.META_GRAPH_VERSION || 'v25.0';
}

function requiredEnv(name: 'META_APP_ID' | 'META_APP_SECRET' | 'META_EMBEDDED_SIGNUP_CONFIG_ID') {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new MetaSignupError(`${name} is missing from .env`);
  }
  return value;
}

function assertNumericId(value: string, label: string) {
  if (!/^\d+$/.test(value)) {
    throw new MetaSignupError(`Invalid ${label}`);
  }
}

function formatPhone(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/\s/g, '')}`;
}

function appSecretProof(token: string, appSecret: string) {
  return crypto.createHmac('sha256', appSecret).update(token).digest('hex');
}

async function graphJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message || `Graph API returned ${response.status}`;
    throw new MetaSignupError(message, response.status === 401 ? 401 : 502);
  }
  return body as T;
}

function withProof(url: string, token: string, appSecret: string) {
  const parsed = new URL(url);
  parsed.searchParams.set('appsecret_proof', appSecretProof(token, appSecret));
  return parsed.toString();
}

function assertRedirectUri(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MetaSignupError('Invalid redirect URI');
  }
  const local = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (url.protocol !== 'https:' && !local) {
    throw new MetaSignupError('The redirect URI must use HTTPS');
  }
  if (url.username || url.hash) {
    throw new MetaSignupError('Unexpected redirect URI');
  }
  const sdkArbiter = url.hostname === 'staticxx.facebook.com'
    && url.pathname === '/x/connect/xd_arbiter/'
    && url.search === '?version=46';
  const sdkSuccess = url.hostname === 'www.facebook.com'
    && url.pathname === '/connect/login_success.html'
    && !url.search;
  const appCallback = (url.pathname === '/' || url.pathname === '/meta-oauth-callback') && !url.search;
  if (!sdkArbiter && !sdkSuccess && !appCallback) {
    throw new MetaSignupError('Unexpected redirect URI');
  }
  return url.toString();
}

const SDK_REDIRECT_URIS = [
  'https://staticxx.facebook.com/x/connect/xd_arbiter/?version=46',
  'https://www.facebook.com/connect/login_success.html',
];

async function exchangeOnce(code: string, redirectUri: string, appId: string, appSecret: string) {
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const result = await graphJson<{ access_token?: string }>(
    `https://graph.facebook.com/${graphVersion()}/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }
  );
  if (!result.access_token) {
    throw new MetaSignupError('Meta did not return a business access token');
  }
  return { accessToken: result.access_token, appId, appSecret };
}

async function exchangeCode(code: string, redirectUris: string[]) {
  const appId = requiredEnv('META_APP_ID');
  const appSecret = requiredEnv('META_APP_SECRET');
  const candidates = [...new Set(redirectUris.filter(Boolean))].map(assertRedirectUri);
  let lastError: Error | null = null;
  for (const redirectUri of candidates) {
    try {
      return await exchangeOnce(code, redirectUri, appId, appSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const retryable = /redirect_uri|domain|نطاق|Can't Load URL|لا يمكن تحميل/i.test(message);
      if (!retryable) throw err;
      console.warn('Token exchange retrying with another redirect:', new URL(redirectUri).host);
      lastError = err instanceof Error ? err : new Error(message);
    }
  }
  throw lastError ?? new MetaSignupError('Could not exchange the authorization code');
}

async function graphGet<T>(path: string, token: string, appSecret: string): Promise<T | null> {
  try {
    return await graphJson<T>(
      withProof(`https://graph.facebook.com/${graphVersion()}${path}`, token, appSecret),
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (err) {
    console.warn('Graph lookup skipped:', path.split('?')[0], err instanceof Error ? err.message : '');
    return null;
  }
}

function addNumericIds(target: Set<string>, ids: Array<string | number> | undefined) {
  for (const id of ids || []) {
    const value = String(id);
    if (/^\d+$/.test(value)) target.add(value);
  }
}

async function discoverWabaIds(accessToken: string, appId: string, appSecret: string, hintedWabaId?: string | null) {
  if (hintedWabaId) {
    assertNumericId(hintedWabaId, 'WhatsApp Business Account ID');
    return [hintedWabaId];
  }

  const url = withProof(
    `https://graph.facebook.com/${graphVersion()}/debug_token?input_token=${encodeURIComponent(accessToken)}`,
    `${appId}|${appSecret}`,
    appSecret
  );
  const result = await graphJson<{
    data?: {
      user_id?: string;
      type?: string;
      scopes?: string[];
      granular_scopes?: Array<{ scope?: string; target_ids?: Array<string | number> }>;
    };
  }>(url, {
    headers: { Authorization: `Bearer ${appId}|${appSecret}` },
  });

  const ids = new Set<string>();
  const scopeNames = new Set<string>(result.data?.scopes || []);
  const granularSummary = (result.data?.granular_scopes || []).map((scope) => ({
    scope: scope.scope,
    targets: (scope.target_ids || []).length,
  }));
  console.warn('Embedded signup token type:', result.data?.type || 'unknown', 'granular:', JSON.stringify(granularSummary));

  for (const scope of result.data?.granular_scopes || []) {
    if (scope.scope) scopeNames.add(scope.scope);
    if (!scope.scope?.includes('whatsapp')) continue;
    addNumericIds(ids, scope.target_ids);
  }

  const userId = result.data?.user_id;
  if (ids.size === 0 && userId && /^\d+$/.test(userId)) {
    for (const edge of ['assigned_whatsapp_business_accounts', 'whatsapp_business_accounts']) {
      const rows = await graphGet<{ data?: Array<{ id?: string }> }>(
        `/${userId}/${edge}?fields=id&limit=50`,
        accessToken,
        appSecret
      );
      for (const row of rows?.data || []) {
        if (row.id && /^\d+$/.test(row.id)) ids.add(row.id);
      }
    }
  }

  if (ids.size === 0) {
    const businesses = await graphGet<{ data?: Array<{ id?: string }> }>(
      '/me/businesses?fields=id&limit=50',
      accessToken,
      appSecret
    );
    for (const business of businesses?.data || []) {
      if (!business.id || !/^\d+$/.test(business.id)) continue;
      for (const edge of ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']) {
        const rows = await graphGet<{ data?: Array<{ id?: string }> }>(
          `/${business.id}/${edge}?fields=id&limit=50`,
          accessToken,
          appSecret
        );
        for (const row of rows?.data || []) {
          if (row.id && /^\d+$/.test(row.id)) ids.add(row.id);
        }
      }
    }
  }

  if (ids.size === 0) return [];
  return [...ids];
}

async function subscribeApp(wabaId: string, accessToken: string, appSecret: string) {
  await graphJson(
    withProof(`https://graph.facebook.com/${graphVersion()}/${wabaId}/subscribed_apps`, accessToken, appSecret),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

async function listPhoneNumbers(wabaId: string, accessToken: string, appSecret: string) {
  const url = withProof(
    `https://graph.facebook.com/${graphVersion()}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
    accessToken,
    appSecret
  );
  const result = await graphJson<{
    data?: Array<{ id?: string; display_phone_number?: string; verified_name?: string }>;
  }>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.data || [];
}

function saveToken(wabaId: string, accessToken: string) {
  let tokens: Record<string, TokenRecord> = {};
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    }
  } catch {
    tokens = {};
  }
  tokens[wabaId] = { accessToken, updatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

export function metaSignupConfig() {
  const appId = process.env.META_APP_ID?.trim() || '';
  const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || '';
  const appSecret = process.env.META_APP_SECRET?.trim() || '';
  const missing = [
    !appId ? 'META_APP_ID' : '',
    !appSecret ? 'META_APP_SECRET' : '',
    !configId ? 'META_EMBEDDED_SIGNUP_CONFIG_ID' : '',
  ].filter(Boolean);

  return {
    configured: missing.length === 0,
    appId,
    configId,
    graphVersion: graphVersion(),
    missing,
  };
}

export async function completeBusinessSignup(input: {
  code?: string;
  redirectUri?: string;
  redirectUris?: string[];
  wabaId?: string | null;
  phoneNumberId?: string | null;
  fallbackWabaIds?: string[];
}): Promise<ConnectedBusinessAccount[]> {
  const code = input.code?.trim();
  if (!code) {
    throw new MetaSignupError('Missing authorization code');
  }
  const redirectUris = [
    ...(Array.isArray(input.redirectUris) ? input.redirectUris : []),
    input.redirectUri || '',
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);
  if (redirectUris.length === 0) {
    throw new MetaSignupError('Missing redirect URI');
  }
  if (input.phoneNumberId) {
    assertNumericId(input.phoneNumberId, 'phone number ID');
  }

  const { accessToken, appId, appSecret } = await exchangeCode(code, redirectUris);
  let wabaIds = await discoverWabaIds(accessToken, appId, appSecret, input.wabaId);
  if (wabaIds.length === 0) {
    wabaIds = [...new Set((input.fallbackWabaIds || []).filter((id) => /^\d{6,}$/.test(id)))];
    if (wabaIds.length > 0) {
      console.warn('Embedded signup using WhatsApp account ids already seen by the webhook:', wabaIds.join(','));
    }
  }
  if (wabaIds.length === 0) {
    throw new MetaSignupError(
      'Meta granted WhatsApp permissions, but did not name an account. In the Embedded Signup configuration, add WhatsApp accounts as an asset, then choose that account in the signup window.'
    );
  }
  const connectedAt = new Date().toISOString();
  const accounts: ConnectedBusinessAccount[] = [];
  const failures: string[] = [];

  for (const wabaId of wabaIds) {
    try {
      await subscribeApp(wabaId, accessToken, appSecret);
      saveToken(wabaId, accessToken);

      const phones = await listPhoneNumbers(wabaId, accessToken, appSecret);
      const selected = input.phoneNumberId
        ? phones.filter((phone) => phone.id === input.phoneNumberId)
        : phones;
      const rows = selected.length > 0 ? selected : phones;

      if (rows.length === 0) {
        accounts.push({
          wabaId,
          phoneNumberId: input.phoneNumberId || null,
          displayPhoneNumber: null,
          verifiedName: null,
          connectedAt,
        });
        continue;
      }

      for (const phone of rows) {
        accounts.push({
          wabaId,
          phoneNumberId: phone.id || input.phoneNumberId || null,
          displayPhoneNumber: formatPhone(phone.display_phone_number),
          verifiedName: phone.verified_name || null,
          connectedAt,
        });
      }
    } catch (err) {
      failures.push(err instanceof Error ? err.message : 'Could not subscribe the WhatsApp account');
    }
  }

  if (accounts.length === 0) {
    throw new MetaSignupError(failures[0] || 'Could not subscribe the WhatsApp account');
  }
  return accounts;
}
