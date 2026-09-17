"use client";

import { useState, useEffect } from 'react';
import { 
  History, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Terminal, 
  Monitor, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  MessageSquare,
  Layers,
  Code2
} from 'lucide-react';
import { getKnowledgeGraphSessionsAction, SessionLogItem } from '@/app/actions/editor-sessions';

export default function ExpandableSessionTimeline() {
  const [sessions, setSessions] = useState<SessionLogItem[]>([]);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await getKnowledgeGraphSessionsAction();
        setSessions(data);
        const initialExpandedState: Record<string, boolean> = {};
        data.forEach(s => {
          if (s.isDefaultExpanded) {
            initialExpandedState[s.id] = true;
          }
        });
        setExpandedSessionIds(initialExpandedState);
      } catch (error) {
        console.error('Failed to load session logs:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, []);

  const toggleSession = (id: string) => {
    setExpandedSessionIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center space-y-3 font-sans">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff5e1f] border-t-transparent animate-spin mx-auto"></div>
        <p className="text-xs text-gray-500 font-medium">Memuat Timeline Session Handover Log...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Protocol Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f0f0] dark:border-[#272a34] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#ff5e1f]" />
              Multi-Editor Session Timeline &amp; Handover Graph
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-sans font-bold rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20">
              Interactive Timeline
            </span>
          </div>
          <p className="text-xs font-sans text-gray-500 dark:text-gray-400 mt-1">
            Riwayat percakapan LLM, metrik runtime editor (Image 2), dan hasil pengerjaan arsitektur (Image 3) lintas editor.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#16181d] px-3 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Total Sesi: {sessions.length}
          </span>
        </div>
      </div>

      {/* Expandable Vertical Timeline Tree */}
      <div className="relative pl-3 sm:pl-6 space-y-6 before:absolute before:left-3 sm:before:left-6 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#ff5e1f] before:via-purple-500/40 before:to-gray-200 dark:before:to-[#272a34]">
        {sessions.map((session, index) => {
          const isExpanded = !!expandedSessionIds[session.id];
          const isActive = session.status === 'active';

          return (
            <div key={session.id} className="relative pl-6 sm:pl-8 group">
              {/* Timeline Connector Node Circle */}
              <div 
                className={`absolute -left-[5px] top-4 w-3.5 h-3.5 rounded-full border-2 transition-transform duration-200 ${
                  isActive 
                    ? 'bg-emerald-500 border-white dark:border-[#0d0e12] ring-4 ring-emerald-500/20 scale-110' 
                    : 'bg-[#ff5e1f] border-white dark:border-[#0d0e12] group-hover:scale-125'
                }`}
              />

              {/* Session Accordion Outer Continuous Card */}
              <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isActive 
                  ? 'border-[#ff5e1f]/30 bg-gradient-to-br from-[#ff5e1f]/5 via-purple-500/5 to-transparent dark:from-[#ff5e1f]/10 dark:via-[#16181d] dark:to-[#0d0e12] shadow-sm' 
                  : 'border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] hover:border-[#ff5e1f]/20'
              }`}>
                {/* Accordion Interactive Header Bar */}
                <button
                  type="button"
                  onClick={() => toggleSession(session.id)}
                  className="w-full text-left p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100/60 dark:hover:bg-[#16181d] transition-colors border-b border-[#f0f0f0] dark:border-[#272a34]"
                >
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isActive ? (
                        <span className="flex items-center gap-1.5 text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          🟢 Sesi Aktif Saat Ini
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          🟡 Sesi Handover Selesai
                        </span>
                      )}

                      <span className="text-xs font-mono bg-white dark:bg-[#0d0e12] px-2 py-0.5 rounded border border-[#f0f0f0] dark:border-[#272a34] text-gray-700 dark:text-gray-300">
                        Session ID: {session.id}
                      </span>

                      {session.handoverId && (
                        <span className="text-xs font-mono bg-[#ff5e1f]/10 text-[#ff5e1f] px-2 py-0.5 rounded border border-[#ff5e1f]/20 font-bold">
                          {session.handoverId}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold font-sans text-gray-900 dark:text-white leading-snug">
                      {session.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    {/* Engineering Roles Badges */}
                    <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                      {session.roles.map((role, rIdx) => (
                        <span key={rIdx} className="text-[11px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20">
                          {role}
                        </span>
                      ))}
                    </div>

                    {/* Timestamp */}
                    <span className="text-xs font-sans text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {session.startTime}
                    </span>

                    {/* Accordion Chevron Icon */}
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center text-gray-500 dark:text-gray-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Accordion Body (Combining Image 2 + Image 3 Synthesis) */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 space-y-6 font-sans animate-[fadeIn_150ms_ease-out]">
                    {/* 2-Column Continuous Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* LEFT COLUMN: Metrik Runtime Editor (FORMAT IMAGE 2) */}
                      <div className="space-y-4 p-4 sm:p-5 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34]">
                        <div className="flex items-center gap-2 border-b border-[#f0f0f0] dark:border-[#272a34] pb-3">
                          <Monitor className="w-4 h-4 text-[#ff5e1f]" />
                          <h4 className="text-xs font-bold uppercase tracking-wider font-sans text-gray-900 dark:text-white">
                            Metrik Editor &amp; State Runtime (Image 2 Format)
                          </h4>
                        </div>

                        <ul className="space-y-3 text-xs font-sans text-gray-700 dark:text-gray-300">
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-gray-500 dark:text-gray-400 w-28 shrink-0">Session ID:</span>
                            <span className="font-mono bg-white dark:bg-[#0d0e12] px-2 py-0.5 rounded border border-[#f0f0f0] dark:border-[#272a34] text-gray-900 dark:text-white font-semibold break-all">
                              {session.id}
                            </span>
                          </li>

                          <li className="flex items-center gap-2">
                            <span className="font-bold text-gray-500 dark:text-gray-400 w-28 shrink-0">Editor:</span>
                            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 text-purple-500" />
                              {session.editor}
                            </span>
                          </li>

                          <li className="flex items-center gap-2">
                            <span className="font-bold text-gray-500 dark:text-gray-400 w-28 shrink-0">Model LLM:</span>
                            <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              {session.model}
                            </span>
                          </li>

                          <li className="flex items-center gap-2">
                            <span className="font-bold text-gray-500 dark:text-gray-400 w-28 shrink-0">Waktu Mulai:</span>
                            <span className="text-gray-900 dark:text-white font-medium">{session.startTime}</span>
                          </li>

                          {/* Focus / Prompt Sesi */}
                          <li className="space-y-1.5 pt-1">
                            <span className="font-bold text-gray-500 dark:text-gray-400 block flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                              Fokus / Prompt Sesi:
                            </span>
                            <div className="space-y-1.5 pl-3 border-l-2 border-[#ff5e1f]/30">
                              {session.prompts.map((p, pIdx) => (
                                <div key={pIdx} className="text-[11px] font-sans text-gray-600 dark:text-gray-300">
                                  <span className="font-bold text-[#ff5e1f] italic">{p.label}: </span>
                                  <span className="bg-white dark:bg-[#0d0e12] px-1.5 py-0.5 rounded border border-[#f0f0f0] dark:border-[#272a34]">
                                    &ldquo;{p.text}&rdquo;
                                  </span>
                                </div>
                              ))}
                            </div>
                          </li>

                          {/* Dokumen Aktif di Editor */}
                          <li className="space-y-1.5 pt-1">
                            <span className="font-bold text-gray-500 dark:text-gray-400 block flex items-center gap-1.5">
                              <Code2 className="w-3.5 h-3.5 text-emerald-500" />
                              Dokumen Aktif di Editor:
                            </span>
                            <div className="space-y-1 pl-3">
                              {session.activeDocuments.map((doc, dIdx) => (
                                <div key={dIdx} className="flex items-center gap-2 text-[11px] font-mono">
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    {doc.ext}
                                  </span>
                                  <span className="text-gray-800 dark:text-gray-200 bg-white dark:bg-[#0d0e12] px-2 py-0.5 rounded border border-[#f0f0f0] dark:border-[#272a34]">
                                    {doc.path}
                                  </span>
                                  {doc.lineInfo && (
                                    <span className="text-gray-400 font-sans text-[11px]">{doc.lineInfo}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </li>

                          {/* Proses Terminal */}
                          {session.terminalProcess && (
                            <li className="flex items-center gap-2 pt-1 border-t border-[#f0f0f0] dark:border-[#272a34]">
                              <span className="font-bold text-gray-500 dark:text-gray-400 w-28 shrink-0">Proses Terminal:</span>
                              <span className="font-mono text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
                                <Terminal className="w-3.5 h-3.5" />
                                {session.terminalProcess}
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* RIGHT COLUMN: Knowledge Graph Accomplishments & Handover (FORMAT IMAGE 3) */}
                      <div className="space-y-4 p-4 sm:p-5 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34]">
                        <div className="flex items-center gap-2 border-b border-[#f0f0f0] dark:border-[#272a34] pb-3">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          <h4 className="text-xs font-bold uppercase tracking-wider font-sans text-gray-900 dark:text-white">
                            Hasil Pengerjaan &amp; Handover (Image 3 Format)
                          </h4>
                        </div>

                        <ul className="space-y-3 text-xs font-sans text-gray-700 dark:text-gray-300">
                          {session.handoverId && (
                            <li className="flex items-center gap-2">
                              <span className="font-bold text-gray-500 dark:text-gray-400 w-28 shrink-0">Handover ID:</span>
                              <span className="font-mono bg-[#ff5e1f]/10 text-[#ff5e1f] px-2 py-0.5 rounded border border-[#ff5e1f]/20 font-bold">
                                {session.handoverId}
                              </span>
                            </li>
                          )}

                          {/* Engineering Roles */}
                          <li className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-gray-500 dark:text-gray-400 w-28 shrink-0">Engineering Roles:</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {session.roles.map((role, rIdx) => (
                                <span key={rIdx} className="text-[11px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20">
                                  {role}
                                </span>
                              ))}
                            </div>
                          </li>

                          {/* Hasil Pengerjaan List */}
                          <li className="space-y-2 pt-1">
                            <span className="font-bold text-gray-500 dark:text-gray-400 block flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#ff5e1f]" />
                              Hasil Pengerjaan Utama:
                            </span>
                            <ol className="space-y-2 pl-4 list-decimal text-xs font-sans">
                              {session.accomplishments.map((acc, aIdx) => (
                                <li key={aIdx} className="leading-relaxed">
                                  <span className="font-bold text-gray-900 dark:text-white">{acc.title}: </span>
                                  <span className="text-gray-600 dark:text-gray-300">{acc.desc}</span>
                                </li>
                              ))}
                            </ol>
                          </li>

                          {/* Catatan Handover Link */}
                          {session.handoverNotePath && (
                            <li className="pt-2 border-t border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between">
                              <span className="font-bold text-gray-500 dark:text-gray-400">Catatan Handover:</span>
                              <a
                                href={`file:///${process.cwd()}/${session.handoverNotePath}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#ff5e1f] hover:underline bg-[#ff5e1f]/10 border border-[#ff5e1f]/20 px-2.5 py-1 rounded-md"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {session.handoverNotePath}
                                <ExternalLink className="w-3 h-3 ml-0.5" />
                              </a>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
