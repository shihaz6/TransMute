import React, { useState, useEffect, useRef } from 'react';
import { CheckCheck, Pause, Play, Send, X } from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import { cn } from '@/components/ui/Primitives';
import { TransmuteMark } from '@/components/ui/TransmuteLogo';

export function CatalystPanel() {
  const { catalystOpen, setCatalystOpen, catalystMessages, sendCatalystMessage } = useErp();

  const [input, setInput] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [catalystMessages, catalystOpen]);

  useEffect(() => {
    if (!playingId) return;
    const interval = setInterval(() => {
      setPlayProgress((prev) => {
        if (prev >= 100) {
          setPlayingId(null);
          return 0;
        }
        return prev + 8;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [playingId]);

  const sendTextMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput('');
    await sendCatalystMessage(trimmed);
    setSending(false);
  };

  return (
    <>
      {/* Floating Persistent Catalyst Button */}
      {!catalystOpen && (
        <button
          onClick={() => setCatalystOpen(true)}
          className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full bg-[#18181B] text-white shadow-[0_10px_28px_rgba(24,24,27,0.28)] hover:bg-zinc-800 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-white/10"
        >
          <div className="relative">
            <TransmuteMark size={26} framed={false} />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9E66] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EA581A] ring-2 ring-[#18181B]" />
            </span>
          </div>
          <span className="text-sm font-semibold tracking-tight">Catalyst</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EA581A]/25 text-[#FF9E66] font-semibold">
            AI
          </span>
        </button>
      )}

      {/* Catalyst Chat Panel */}
      {catalystOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[410px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-2rem)] rounded-2xl bg-white dark:bg-[#151517] border border-stone-200 dark:border-zinc-800 shadow-[0_24px_60px_rgba(24,24,27,0.28)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#18181B] text-white flex items-center justify-between shrink-0 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <TransmuteMark size={34} framed={false} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Catalyst AI</span>
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-500/20 text-zinc-300 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                    AI not connected
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Saved chat log</p>
              </div>
            </div>
            <button
              onClick={() => setCatalystOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Close Catalyst"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F3F4F1] dark:bg-[#0D131F]"
          >
            {catalystMessages.length === 0 && (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-8">
                No messages yet. Type a message below to start the conversation.
              </p>
            )}

            {catalystMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isPlaying = playingId === msg.id;
              return (
                <div
                  key={msg.id}
                  className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
                >
                  {msg.senderLabel && (
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1 px-1">
                      {msg.senderLabel}
                    </span>
                  )}

                  <div
                    className={cn(
                      'max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs',
                      isUser
                        ? 'bg-[#DCF8C6] dark:bg-emerald-950/90 text-slate-900 dark:text-emerald-50 rounded-tr-sm border border-emerald-200/70 dark:border-emerald-800/70'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-200/80 dark:border-slate-800'
                    )}
                  >
                    {msg.text && <p className="whitespace-pre-line">{msg.text}</p>}

                    {msg.voiceNote && (
                      <div className="space-y-2 min-w-[240px]">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => {
                              if (isPlaying) {
                                setPlayingId(null);
                              } else {
                                setPlayProgress(0);
                                setPlayingId(msg.id);
                              }
                            }}
                            className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 hover:bg-emerald-700 cursor-pointer"
                          >
                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                          </button>
                          <div className="flex-1 flex items-center gap-[3px] h-7">
                            {msg.voiceNote.waveform.map((h, i) => {
                              const pct = (i / msg.voiceNote!.waveform.length) * 100;
                              const filled = isPlaying && pct <= playProgress;
                              return (
                                <div
                                  key={i}
                                  style={{ height: `${Math.max(20, h)}%` }}
                                  className={cn(
                                    'flex-1 rounded-full transition-colors',
                                    filled
                                      ? 'bg-emerald-600 dark:bg-emerald-400'
                                      : 'bg-emerald-800/30 dark:bg-emerald-400/30'
                                  )}
                                />
                              );
                            })}
                          </div>
                          <span className="text-[10px] font-medium tabular-nums text-emerald-900 dark:text-emerald-200">
                            {msg.voiceNote.duration}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                      <span>{msg.timestamp}</span>
                      {isUser && <CheckCheck className="w-3 h-3 text-sky-500" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Composer */}
          <div className="p-3 bg-white dark:bg-[#151517] flex items-center gap-2 shrink-0 border-t border-stone-100 dark:border-zinc-800">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void sendTextMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#EA581A]"
            />
            <button
              onClick={() => void sendTextMessage()}
              disabled={sending}
              className="p-2.5 rounded-xl bg-[#EA581A] text-white hover:bg-[#D44A10] cursor-pointer shrink-0 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
