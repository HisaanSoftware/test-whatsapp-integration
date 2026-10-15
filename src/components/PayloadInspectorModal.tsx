import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Copy, Check, FileJson, Clock, ArrowDownLeft } from 'lucide-react';
import { WebhookLog } from '../types/whatsapp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PayloadInspectorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.logs?.length > 0 && !selectedLogId) {
          setSelectedLogId(data.logs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch webhook logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedLog = logs.find((l) => l.id === selectedLogId) || logs[0];

  const copyPayload = (payload: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-[#e9edef] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111b21]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#00a884]/15 dark:bg-[#00a884]/25 flex items-center justify-center text-[#00a884]">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Incoming Webhook Payload Inspector</h2>
              <p className="text-xs text-slate-500 dark:text-[#8696a0]">Live stream of raw HTTP requests received by /api/webhook/whatsapp</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              title="Refresh logs"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#e9edef] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#e9edef] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Split: Left Log List, Right Payload View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Log List */}
          <div className="w-80 border-r border-slate-100 dark:border-slate-800 overflow-y-auto bg-slate-50/40 dark:bg-[#111b21]/30">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-[#8696a0]">
                No webhook events recorded yet. Send a simulated message or connect Meta to see incoming payloads.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {logs.map((log) => {
                  const isSelected = log.id === selectedLogId;
                  return (
                    <button
                      key={log.id}
                      onClick={() => setSelectedLogId(log.id)}
                      className={`w-full text-left p-3.5 transition-colors block ${
                        isSelected
                          ? 'bg-emerald-50/70 dark:bg-[#00a884]/15 border-l-2 border-[#00a884]'
                          : 'hover:bg-slate-100/60 dark:hover:bg-[#111b21]/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono font-medium text-[#00a884] flex items-center gap-1">
                          <ArrowDownLeft className="w-3 h-3" /> POST
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#8696a0] font-mono flex items-center gap-1 tabular-nums">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-[#e9edef] truncate">
                        {log.summary || 'Webhook Message Event'}
                      </p>
                      {log.senderPhone && (
                        <p className="text-[11px] text-slate-500 dark:text-[#8696a0] font-mono mt-0.5">
                          {log.senderPhone}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payload Details */}
          <div className="flex-1 flex flex-col bg-slate-900 text-slate-200 overflow-hidden">
            {selectedLog ? (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#00a884]">{selectedLog.method}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {new Date(selectedLog.timestamp).toISOString()}
                    </span>
                  </div>
                  <button
                    onClick={() => copyPayload(selectedLog.payload, selectedLog.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 transition-colors"
                  >
                    {copiedId === selectedLog.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === selectedLog.id ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed">
                  <pre className="text-emerald-400/90 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                Select a webhook event from the left to view payload details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
