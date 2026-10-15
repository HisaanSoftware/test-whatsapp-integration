import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, ShieldCheck, Terminal, AlertCircle } from 'lucide-react';
import { WebhookInfo } from '../types/whatsapp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  info: WebhookInfo | null;
  onTestVerify?: () => void;
}

export const WebhookSetupModal: React.FC<Props> = ({ isOpen, onClose, info }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const webhookUrl = info?.webhookUrl || window.location.origin + '/api/webhook/whatsapp';
  const verifyToken = info?.verifyToken || 'whatsapp_webhook_token';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-[#e9edef] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111b21]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#00a884]/15 dark:bg-[#00a884]/25 flex items-center justify-center text-[#00a884]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Meta WhatsApp Webhook Setup</h2>
              <p className="text-xs text-slate-500 dark:text-[#8696a0]">Connect your WhatsApp Business Cloud API number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#e9edef] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Status Banner */}
          <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
            info?.isVerified 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {info?.isVerified ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <div>
                <p className="font-semibold text-xs">
                  {info?.isVerified ? 'Webhook Verified by Meta' : 'Awaiting Meta Verification / Ready to Connect'}
                </p>
                <p className="text-[11px] opacity-85">
                  {info?.lastVerifiedAt 
                    ? `Last verified: ${new Date(info.lastVerifiedAt).toLocaleString()}`
                    : 'Paste the URL and token below into your Meta WhatsApp App Dashboard'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 tabular-nums">
              Port 3000 Active
            </span>
          </div>

          {/* Credentials Display */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0] mb-1.5">
                Callback URL (Webhook URL)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 bg-slate-100 dark:bg-[#111b21] border border-slate-200 dark:border-slate-700/80 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-[#d1d7db] focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(webhookUrl, 'url')}
                  className="px-3 py-2 bg-slate-900 dark:bg-[#00a884] text-white rounded-lg text-xs font-medium hover:bg-slate-800 dark:hover:bg-[#008f6f] transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copiedField === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'url' ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0] mb-1.5">
                Verify Token
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="flex-1 bg-slate-100 dark:bg-[#111b21] border border-slate-200 dark:border-slate-700/80 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-[#d1d7db] focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(verifyToken, 'token')}
                  className="px-3 py-2 bg-slate-900 dark:bg-[#00a884] text-white rounded-lg text-xs font-medium hover:bg-slate-800 dark:hover:bg-[#008f6f] transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copiedField === 'token' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'token' ? 'Copied' : 'Copy Token'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0]">
              How to configure in Meta Developer Portal
            </h3>
            <ol className="space-y-2 text-xs text-slate-600 dark:text-[#8696a0] list-decimal list-inside leading-relaxed">
              <li>
                Open{' '}
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#00a884] hover:underline inline-flex items-center gap-0.5 font-medium"
                >
                  Meta App Dashboard <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>{' '}
                and select your WhatsApp Business app.
              </li>
              <li>In the left sidebar, navigate to <strong>WhatsApp</strong> → <strong>Configuration</strong>.</li>
              <li>Find the <strong>Webhook</strong> section and click <strong>Edit</strong>.</li>
              <li>Paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> from above, then click <strong>Verify and Save</strong>.</li>
              <li>Click <strong>Manage</strong> under Webhook fields and subscribe to the <strong>messages</strong> event.</li>
            </ol>
          </div>

          {/* Terminal Test Command */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Quick cURL Verification Test
              </span>
              <button
                onClick={() => copyToClipboard(info?.sampleCurlVerify || '', 'curl')}
                className="text-xs text-[#00a884] hover:underline flex items-center gap-1"
              >
                {copiedField === 'curl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'curl' ? 'Copied' : 'Copy curl'}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
              {info?.sampleCurlVerify || `curl -X GET "${webhookUrl}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=1158201444"`}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-[#111b21]/80 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-[#e9edef] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
