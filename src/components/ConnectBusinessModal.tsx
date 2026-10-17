import React, { useEffect, useRef, useState } from 'react';
import { Check, QrCode, X, AlertCircle, Smartphone } from 'lucide-react';
import { ConnectedBusinessAccount, MetaSignupConfig } from '../types/whatsapp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (accounts: ConnectedBusinessAccount[]) => void;
}

interface SessionInfo {
  wabaId?: string;
  phoneNumberId?: string;
  event?: string;
}

function readSignupSession(value: unknown, depth = 0): SessionInfo {
  if (depth > 6 || value == null) return {};
  if (typeof value === 'string') {
    try {
      return readSignupSession(JSON.parse(value), depth + 1);
    } catch {
      return {};
    }
  }
  if (typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  const found: SessionInfo = {};
  if (record.waba_id != null && /^(string|number)$/.test(typeof record.waba_id)) found.wabaId = String(record.waba_id);
  if (record.phone_number_id != null && /^(string|number)$/.test(typeof record.phone_number_id)) {
    found.phoneNumberId = String(record.phone_number_id);
  }
  if (typeof record.event === 'string') found.event = record.event;
  for (const child of Object.values(record)) {
    const nested = readSignupSession(child, depth + 1);
    found.wabaId = found.wabaId || nested.wabaId;
    found.phoneNumberId = found.phoneNumberId || nested.phoneNumberId;
    found.event = found.event || nested.event;
  }
  return found;
}

export const ConnectBusinessModal: React.FC<Props> = ({ isOpen, onClose, onConnected }) => {
  const [config, setConfig] = useState<MetaSignupConfig | null>(null);
  const [accounts, setAccounts] = useState<ConnectedBusinessAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sessionRef = useRef<SessionInfo>({});

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError(null);
    setNotice(null);

    Promise.all([
      fetch('/api/meta/config').then((response) => response.json()),
      fetch('/api/connected-accounts').then((response) => response.json()),
    ])
      .then(([nextConfig, nextAccounts]: [MetaSignupConfig, { accounts?: ConnectedBusinessAccount[] }]) => {
        if (cancelled) return;
        setConfig(nextConfig);
        setAccounts(nextAccounts.accounts || []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Could not load the WhatsApp connection settings');
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    sessionRef.current = {};

    const onMessage = (event: MessageEvent) => {
      let host = '';
      try {
        host = new URL(event.origin).hostname;
      } catch {
        return;
      }
      if (host !== 'facebook.com' && !host.endsWith('.facebook.com')) return;
      const found = readSignupSession(event.data);
      if (!found.wabaId && !found.phoneNumberId && found.event !== 'CANCEL') return;
      sessionRef.current = { ...sessionRef.current, ...found };
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const waitForSession = async () => {
    const started = Date.now();
    while (!sessionRef.current.wabaId && Date.now() - started < 4000) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return sessionRef.current;
  };

  const redirectUri = `${window.location.origin}/meta-oauth-callback`;

  const finishWithCode = async (code: string) => {
    const session = await waitForSession();
    const response = await fetch('/api/meta/complete-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirectUri,
        wabaId: session.wabaId || null,
        phoneNumberId: session.phoneNumberId || null,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || 'Could not finish connecting the WhatsApp Business account');
    }
    const nextAccounts = body.accounts || [];
    setAccounts(nextAccounts);
    onConnected(nextAccounts);
    setNotice('WhatsApp Business account connected. New incoming messages will appear in this viewer.');
  };

  const connect = () => {
    if (!config?.configured || busy) return;
    setError(null);
    setNotice(null);
    sessionRef.current = {};
    setBusy(true);

    const state = crypto.randomUUID();
    const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
    url.searchParams.set('client_id', config.appId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('config_id', config.configId);
    url.searchParams.set('override_default_response_type', 'true');
    url.searchParams.set('display', 'popup');
    url.searchParams.set('state', state);
    url.searchParams.set('extras', JSON.stringify({
      setup: {},
      featureType: 'whatsapp_business_app_onboarding',
      sessionInfoVersion: '3',
    }));

    const popup = window.open(url.toString(), 'whatsapp-business-signup', 'popup,width=600,height=800');
    if (!popup) {
      setBusy(false);
      setError('The browser blocked the Meta window. Allow popups for this site and try again.');
      return;
    }

    let settled = false;
    const onCode = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; code?: string; state?: string; error?: string };
      if (data?.type !== 'WA_OAUTH_CODE' || data.state !== state) return;
      settled = true;
      window.removeEventListener('message', onCode);
      window.clearInterval(watch);
      void (async () => {
        try {
          if (!data.code) {
            throw new Error(data.error || 'Meta did not return an authorization code.');
          }
          await finishWithCode(data.code);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not finish connecting the WhatsApp Business account');
        } finally {
          setBusy(false);
        }
      })();
    };
    window.addEventListener('message', onCode);

    const watch = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(watch);
      window.setTimeout(() => {
        if (settled) return;
        window.removeEventListener('message', onCode);
        setBusy(false);
        setError('The Meta window closed before the connection finished.');
      }, 600);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-[#e9edef] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111b21]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#00a884]/15 dark:bg-[#00a884]/25 flex items-center justify-center text-[#00a884]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Connect WhatsApp Business</h2>
              <p className="text-xs text-slate-500 dark:text-[#8696a0]">Scan Meta’s QR code with the WhatsApp Business app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#e9edef] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          <p className="text-xs leading-relaxed text-slate-600 dark:text-[#8696a0]">
            This opens Meta’s official signup. Choose the existing WhatsApp Business app account, then scan the QR code Meta shows with that phone. Incoming messages to the connected number appear in this viewer.
          </p>

          {config && !config.configured && (
            <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Add these values to .env and restart the server
              </div>
              <ul className="text-[11px] font-mono space-y-1 pl-6">
                {config.missing.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <p className="text-[11px] leading-relaxed opacity-90">
                In the Meta App Dashboard, create a Facebook Login for Business configuration with Embedded Signup, then paste its configuration ID into META_EMBEDDED_SIGNUP_CONFIG_ID. Add this site’s HTTPS address to the login settings under allowed domains and valid OAuth redirect URIs.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          )}
          {notice && (
            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700/80 px-3 py-2.5 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0]">
                Add this to Valid OAuth redirect URIs
              </p>
              <p className="text-[11px] font-mono break-all text-slate-700 dark:text-[#d1d7db]">{redirectUri}</p>
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0]">Connected numbers</h3>
            {accounts.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[#8696a0]">No WhatsApp Business account is connected yet.</p>
            ) : (
              <ul className="space-y-2">
                {accounts.map((account) => (
                  <li
                    key={`${account.wabaId}-${account.phoneNumberId || 'pending'}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700/80 px-3 py-2.5"
                  >
                    <Smartphone className="w-4 h-4 text-[#00a884] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{account.verifiedName || 'WhatsApp Business'}</p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-[#8696a0]">
                        {account.displayPhoneNumber || account.phoneNumberId || account.wabaId}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-[#111b21]/80 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-[#e9edef] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          <button
            onClick={connect}
            disabled={!config?.configured || busy}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#00a884] text-white hover:bg-[#008f6f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            {busy ? 'Waiting for Meta…' : 'Connect with QR code'}
          </button>
        </div>
      </div>
    </div>
  );
};
