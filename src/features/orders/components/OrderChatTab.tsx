import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle, MessageSquare, RefreshCw, Send } from 'lucide-react';
import {
  listOrderMessages,
  mergeChatMessages,
  sendOrderMessage,
  type BackendChatMessage,
  type ChatSenderRole,
} from '../../../services/api/chatApi';
import { adminSocketService } from '../../../services/realtime/adminSocketService';
import { useApp } from '../../../context/AppContext';

const ROLE_LABELS: Record<ChatSenderRole, string> = {
  CLIENT: 'Cliente',
  DRIVER: 'Chofer',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Administrador',
};

const ROLE_TONES: Record<ChatSenderRole, string> = {
  CLIENT: 'bg-sky-100 text-sky-800 border-sky-200',
  DRIVER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  SUPERVISOR: 'bg-amber-100 text-amber-800 border-amber-200',
  ADMIN: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

interface OrderChatTabProps {
  orderId: string;
  orderStatus: string;
  currentUserId: string;
  onUnreadReset?: () => void;
}

export const OrderChatTab: React.FC<OrderChatTabProps> = ({
  orderId,
  orderStatus,
  currentUserId,
  onUnreadReset,
}) => {
  const { showToast } = useApp();
  const [messages, setMessages] = useState<BackendChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const isClosed = orderStatus === 'COMPLETED' || orderStatus === 'CANCELLED';

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await listOrderMessages(orderId);
      setMessages((prev) => mergeChatMessages(prev, rows));
      onUnreadReset?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los mensajes del pedido.',
      );
    } finally {
      setLoading(false);
    }
  }, [orderId, onUnreadReset]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    adminSocketService.ensureConnected();
    const subscribe = () => {
      adminSocketService.emit('order:subscribe', { orderId });
    };
    subscribe();

    const unsubConnect = adminSocketService.on('connect', subscribe);
    const unsubAuth = adminSocketService.on('authenticated', subscribe);
    const unsubMsg = adminSocketService.on(
      'chat:message:new',
      (incoming: BackendChatMessage) => {
        if (!incoming || incoming.orderId !== orderId) return;
        setMessages((prev) => mergeChatMessages(prev, [incoming]));
        onUnreadReset?.();
      },
    );

    return () => {
      unsubConnect();
      unsubAuth();
      unsubMsg();
      adminSocketService.emit('order:unsubscribe', { orderId });
    };
  }, [orderId, onUnreadReset]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = draft.trim();
    if (!clean || sending || isClosed) return;
    setSending(true);
    try {
      const created = await sendOrderMessage(orderId, clean);
      setMessages((prev) => mergeChatMessages(prev, [created]));
      setDraft('');
      onUnreadReset?.();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'No se pudo enviar el mensaje',
        message: err instanceof Error ? err.message : 'Error del servidor.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col min-h-[460px] max-h-[680px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700 border border-sky-200/70">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Chat del pedido (Cliente, Chofer y Soporte)
            </h3>
            <p className="text-xs text-slate-500">
              Hilo unificado en tiempo real respaldado en el servidor.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadHistory()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F7F9FC]">
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center py-12 text-xs text-slate-500 gap-2">
            <LoaderCircle className="w-4 h-4 animate-spin text-primary" />
            <span>Cargando conversación...</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between gap-3"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="rounded-lg bg-rose-700 px-3 py-1.5 font-semibold text-white cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-500">
            Aún no hay mensajes en este pedido. Escribe el primero abajo.
          </div>
        )}

        {messages.map((msg) => {
          const mine = msg.senderId === currentUserId;
          const timeText = new Date(msg.createdAt).toLocaleString('es-EC', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs shadow-2xs border ${
                  mine
                    ? 'bg-[#0F4C81] text-white border-[#0F4C81]'
                    : 'bg-white text-slate-800 border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`font-bold ${mine ? 'text-sky-100' : 'text-slate-900'}`}
                  >
                    {mine ? 'Tú' : msg.senderName}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      mine
                        ? 'bg-white/15 text-white border-white/25'
                        : ROLE_TONES[msg.senderRole] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {ROLE_LABELS[msg.senderRole] ?? msg.senderRole}
                  </span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-[13px]">
                  {msg.text}
                </p>
                <p
                  className={`mt-1.5 text-[10px] font-mono ${
                    mine ? 'text-sky-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {timeText}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {isClosed ? (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5 text-center text-xs font-medium text-slate-500">
          El pedido está {orderStatus === 'COMPLETED' ? 'completado' : 'cancelado'}; el hilo de mensajes quedó cerrado.
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleSend(e)}
          className="border-t border-slate-200 bg-white p-4 flex items-end gap-3"
        >
          <textarea
            aria-label="Mensaje para el pedido"
            placeholder="Escribe un mensaje para el cliente o el chofer..."
            rows={2}
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-[#F7F9FC] px-3.5 py-2.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C81] hover:bg-[#0A3660] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Enviando...' : 'Enviar'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
