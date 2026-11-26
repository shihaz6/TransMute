import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  CheckCheck,
  ExternalLink,
  Mic,
  PackageCheck,
  Pause,
  Play,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import { Button, cn } from '@/components/ui/Primitives';
import { TransmuteMark } from '@/components/ui/TransmuteLogo';
import { formatRs } from '@/utils/format';
import { CatalystMessage } from '@/types/erp';

export function CatalystPanel() {
  const {
    catalystOpen,
    setCatalystOpen,
    catalystMessages,
    setCatalystMessages,
    navigateToEntity,
    setOrders,
    addAiLog,
    addToast,
  } = useErp();

  const [input, setInput] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const [recordingVoice, setRecordingVoice] = useState(false);
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

  const handleConfirmOrder = (msgId: string, orderId: string, customer: string) => {
    setCatalystMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.orderPreview
          ? { ...m, orderPreview: { ...m.orderPreview, confirmed: true } }
          : m
      )
    );
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'invoiced' } : o))
    );
    addAiLog({
      module: 'Catalyst',
      action: `Confirmed & invoiced ${orderId} for ${customer} via Catalyst chat`,
      reason: 'Owner tapped Confirm & Invoice after stock availability check passed.',
      confidence: 97,
      approvedBy: 'Rohan (Owner)',
      outcome: 'approved',
    });
    addToast({
      title: `Order ${orderId} Confirmed & Invoiced`,
      description: `WhatsApp invoice PDF sent to ${customer}.`,
      variant: 'success',
    });
  };

  const sendTextMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg: CatalystMessage = {
      id: `cat-u-${Date.now()}`,
      sender: 'user',
      senderLabel: 'You (Owner)',
      timestamp: 'Just now',
      text: trimmed,
    };
    setCatalystMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const lower = trimmed.toLowerCase();
      let replyText =
        'Checked your live ERP data: Cash position is Rs. 4,860,000, 3 supplier invoices need review, and Prima Wheat Flour 25kg is down to 24 bags (1.5 days of cover). Would you like me to draft a reorder PO?';
      if (lower.includes('stock') || lower.includes('oil') || lower.includes('flour') || lower.includes('coconut')) {
        replyText =
          'Live Stock Check:\n• Marina Coconut Oil 1L Case: 68 Peliyagoda Stores · 12 Pettah Shop · 6 Van 1 (Healthy)\n• Prima Wheat Flour 25kg Bag: 18 Stores · 6 Shop · 0 Van 1 (Critical — below 60 reorder level)';
      } else if (lower.includes('owe') || lower.includes('overdue') || lower.includes('wijesinghe')) {
        replyText =
          'Top Overdue Accounts:\n1. Wijesinghe Super Centre (Maharagama) — Rs. 845,000 (38 days overdue, High Risk)\n2. Kandy City Stores — Rs. 620,000 (33 days overdue, promised Rs. 310,000 on 16 Apr)';
      }
      const aiMsg: CatalystMessage = {
        id: `cat-a-${Date.now()}`,
        sender: 'ai',
        timestamp: 'Just now',
        text: replyText,
      };
      setCatalystMessages((prev) => [...prev, aiMsg]);
    }, 550);
  };

  const simulateVoiceOrder = () => {
    setRecordingVoice(true);
    setTimeout(() => {
      setRecordingVoice(false);
      const voiceId = `cat-v-${Date.now()}`;
      const newOrderId = `SO-482${Math.floor(Math.random() * 7 + 2)}`;
      const voiceMsg: CatalystMessage = {
        id: voiceId,
        sender: 'user',
        senderLabel: 'You · Voice Note Order',
        timestamp: 'Just now',
        voiceNote: {
          duration: '0:09',
          seconds: 9,
          transcript:
            '"Ceylon Spice Kitchen ekata Marina Coconut Oil case 10k saha Keeri Samba 25kg bag 10k book karanna, stock check karala kiyanna."',
          waveform: [30, 62, 48, 84, 70, 50, 88, 94, 60, 44, 76, 82, 52, 38, 66, 72, 40, 28],
        },
      };
      setCatalystMessages((prev) => [...prev, voiceMsg]);

      setTimeout(() => {
        const aiReply: CatalystMessage = {
          id: `cat-ai-${Date.now()}`,
          sender: 'ai',
          timestamp: 'Just now',
          text: 'Got it! Transcribed your Singlish voice note and verified Peliyagoda Stores stock for Ceylon Spice Kitchen & Catering.',
          orderPreview: {
            customer: 'Ceylon Spice Kitchen & Catering',
            orderId: newOrderId,
            items: [
              {
                name: 'Marina Coconut Oil 1L x 12 Bottle Case',
                qty: '10 Cases',
                price: 32600,
                stockStatus: 'in-stock',
                stockNote: '68 in Peliyagoda Stores · OK',
              },
              {
                name: 'Polonnaruwa Keeri Samba Rice 25kg Bag',
                qty: '10 Bags',
                price: 77000,
                stockStatus: 'in-stock',
                stockNote: '42 in Peliyagoda Stores · OK',
              },
            ],
            total: 109600,
            creditStatus: 'Low Risk · Rs. 195,000 / Rs. 350,000 limit',
            confirmed: false,
          },
        };
        setCatalystMessages((prev) => [...prev, aiReply]);
        setOrders((prev) => [
          {
            id: newOrderId,
            type: 'order',
            customerId: 'CUST-06',
            customerName: 'Ceylon Spice Kitchen & Catering',
            source: 'whatsapp',
            createdAt: 'Just now (via Catalyst Voice)',
            status: 'confirmed',
            total: 109600,
            aiConfidence: 96,
            originalMessage: {
              sender: 'Rohan (Voice Note via Catalyst)',
              phoneOrEmail: 'Catalyst Assistant',
              timestamp: 'Just now',
              isVoiceTranscript: true,
              voiceDuration: '0:09',
              text: 'Ceylon Spice Kitchen ekata Marina Coconut Oil case 10k saha Keeri Samba 25kg bag 10k book karanna, stock check karala kiyanna.',
            },
            items: [
              {
                id: `oi-${Date.now()}-1`,
                sku: 'OIL-MAR-1L',
                productName: 'Marina Coconut Oil 1L x 12 Bottle Case',
                qty: 10,
                unit: 'Cases',
                unitPrice: 3260,
                warehouseStock: 68,
                shopStock: 12,
                vanStock: 6,
              },
              {
                id: `oi-${Date.now()}-2`,
                sku: 'RIC-KSM-25',
                productName: 'Polonnaruwa Keeri Samba Rice 25kg Bag',
                qty: 10,
                unit: 'Bags',
                unitPrice: 7700,
                warehouseStock: 42,
                shopStock: 8,
                vanStock: 4,
              },
            ],
          },
          ...prev,
        ]);
        addAiLog({
          module: 'Catalyst',
          action: `Created voice-note order ${newOrderId} for Ceylon Spice Kitchen (Rs. 109,600)`,
          reason: 'Transcribed 0:09 Singlish voice note and verified Peliyagoda Stores stock availability.',
          confidence: 96,
          approvedBy: 'Pending confirmation in chat',
          outcome: 'flagged',
        });
      }, 750);
    }, 1000);
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

      {/* WhatsApp-style Catalyst Chat Panel */}
      {catalystOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[410px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-2rem)] rounded-2xl bg-white dark:bg-[#151517] border border-stone-200 dark:border-zinc-800 shadow-[0_24px_60px_rgba(24,24,27,0.28)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#18181B] text-white flex items-center justify-between shrink-0 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <TransmuteMark size={34} framed={false} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Catalyst AI</span>
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    WhatsApp Synced
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Orders, voice notes, stock checks & instant answers
                </p>
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

          {/* Conversation Area — Subtle WhatsApp-inspired warm neutral pattern */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F3F4F1] dark:bg-[#0D131F]"
          >
            <div className="flex justify-center">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/80 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/60">
                Today · Connected to Lanka Crest WhatsApp Business
              </span>
            </div>

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
                    {/* Text */}
                    {msg.text && <p className="whitespace-pre-line">{msg.text}</p>}

                    {/* Voice Note Bubble */}
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
                            {isPlaying ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 ml-0.5" />
                            )}
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
                        <div className="pt-1.5 border-t border-emerald-600/15 text-[11px] text-slate-700 dark:text-emerald-100/90 italic">
                          <span className="not-italic font-semibold text-emerald-800 dark:text-emerald-300 mr-1">
                            AI Transcript:
                          </span>
                          {msg.voiceNote.transcript}
                        </div>
                      </div>
                    )}

                    {/* AI Order Confirmation & Stock Check Card */}
                    {msg.orderPreview && (
                      <div className="mt-2.5 rounded-xl bg-stone-50 dark:bg-[#111113] border border-stone-200 dark:border-zinc-800 overflow-hidden">
                        <div className="px-3 py-2 bg-[#FFF4EE] dark:bg-[#EA581A]/15 border-b border-[#FFD5BE]/70 dark:border-[#EA581A]/25 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <PackageCheck className="w-3.5 h-3.5 text-[#EA581A]" />
                            Draft Order #{msg.orderPreview.orderId}
                          </span>
                          <button
                            onClick={() => {
                              navigateToEntity('orders', msg.orderPreview!.orderId);
                              setCatalystOpen(false);
                            }}
                            className="text-[10px] font-medium text-[#C2410C] dark:text-[#FF9E66] hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            Open <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <div className="p-3 space-y-2">
                          {msg.orderPreview.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-start justify-between gap-2 text-[11px]"
                            >
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {item.name}
                                </div>
                                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                                  ✓ Stock OK · {item.stockNote}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-semibold tabular-nums text-slate-900 dark:text-white">
                                  {formatRs(item.price)}
                                </div>
                                <div className="text-[10px] text-slate-400">{item.qty}</div>
                              </div>
                            </div>
                          ))}

                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                            <span>Order Total</span>
                            <span className="tabular-nums">{formatRs(msg.orderPreview.total)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Credit: {msg.orderPreview.creditStatus}
                          </div>

                          <div className="pt-1 flex items-center gap-2">
                            {msg.orderPreview.confirmed ? (
                              <div className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                Confirmed & WhatsApp Invoice Sent
                              </div>
                            ) : (
                              <>
                                <Button
                                  variant="gold"
                                  size="xs"
                                  className="flex-1"
                                  onClick={() =>
                                    handleConfirmOrder(
                                      msg.id,
                                      msg.orderPreview!.orderId,
                                      msg.orderPreview!.customer
                                    )
                                  }
                                >
                                  Confirm & Invoice
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  onClick={() => {
                                    navigateToEntity('orders', msg.orderPreview!.orderId);
                                    setCatalystOpen(false);
                                  }}
                                >
                                  Edit
                                </Button>
                              </>
                            )}
                          </div>
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

          {/* Quick Prompt Chips */}
          <div className="px-3 pt-2 pb-1 bg-white dark:bg-[#151517] border-t border-stone-100 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={simulateVoiceOrder}
              disabled={recordingVoice}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FFF4EE] text-[#C2410C] border border-[#FFD5BE] dark:bg-[#EA581A]/15 dark:text-[#FF9E66] dark:border-[#EA581A]/30 whitespace-nowrap hover:bg-[#FFE6D8] cursor-pointer"
            >
              {recordingVoice ? 'Recording voice note...' : 'Simulate Voice Order'}
            </button>
            <button
              onClick={() => setInput('Check stock for Marina Oil and Wheat Flour')}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              Check oil & flour stock
            </button>
            <button
              onClick={() => setInput('Who owes me most today?')}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              Who owes me most?
            </button>
          </div>

          {/* Composer */}
          <div className="p-3 bg-white dark:bg-[#151517] flex items-center gap-2 shrink-0">
            <button
              onClick={simulateVoiceOrder}
              disabled={recordingVoice}
              title="Send Voice Note Order"
              className={cn(
                'p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0',
                recordingVoice
                  ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
                  : 'bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-[#EA581A]'
              )}
            >
              <Mic className="w-4 h-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
              placeholder="Message Catalyst or forward WhatsApp order..."
              className="flex-1 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#EA581A]"
            />
            <button
              onClick={sendTextMessage}
              className="p-2.5 rounded-xl bg-[#EA581A] text-white hover:bg-[#D44A10] cursor-pointer shrink-0"
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
