"use client";

import { useEffect, useMemo, useState } from "react";
import type { InboxMessage, MessageCategory } from "@/lib/inbox-types";

const categoryStyles: Record<MessageCategory, string> = {
  Urgent: "bg-red-100 text-red-700 ring-red-200",
  Routine: "bg-blue-100 text-blue-700 ring-blue-200",
  Spam: "bg-slate-200 text-slate-700 ring-slate-300",
};

const filters = ["All", "Urgent", "Routine", "Spam"] as const;

type MessageAnalysisState = {
  loading: boolean;
  error: string | null;
  analyzed: boolean;
};

type ActivityEntry = {
  id: string;
  messageId: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: "info" | "success" | "warning" | "neutral";
};

export function InboxDashboard({
  initialMessages,
}: {
  initialMessages: InboxMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
  const [selectedId, setSelectedId] = useState(initialMessages[0]?.id ?? "");
  const [analysisState, setAnalysisState] = useState<Record<string, MessageAnalysisState>>({});
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(() =>
    initialMessages.map((message) => ({
      id: `log-${message.id}`,
      messageId: message.id,
      title: `${message.category} classification assigned`,
      detail: message.aiReason,
      timestamp: message.createdAt,
      tone: message.category === "Urgent" ? "warning" : message.category === "Spam" ? "neutral" : "info",
    })),
  );

  const visibleMessages = useMemo(() => {
    if (activeFilter === "All") return messages;
    return messages.filter((message) => message.category === activeFilter);
  }, [messages, activeFilter]);

  const selectedMessage =
    visibleMessages.find((message) => message.id === selectedId) ?? visibleMessages[0] ?? messages[0];

  const selectedStatus = selectedMessage ? analysisState[selectedMessage.id] ?? { loading: false, error: null, analyzed: false } : null;

  const summary = useMemo(() => {
    const total = messages.length;
    const urgent = messages.filter((message) => message.category === "Urgent").length;
    const pending = messages.filter((message) => message.status === "Pending").length;
    const handled = messages.filter((message) => message.status === "Handled").length;
    const confidenceTotal = messages.reduce((sum, message) => sum + message.confidence, 0);
    const average = total > 0 ? Math.round((confidenceTotal / total) * 100) : 0;

    return {
      total,
      urgent,
      pending,
      handled,
      average,
    };
  }, [messages]);

  const addActivity = (entry: Omit<ActivityEntry, "id" | "timestamp">) => {
    const newEntry: ActivityEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };

    setActivityLog((current) => [newEntry, ...current].slice(0, 8));
  };

  const runDemoFlow = async () => {
    if (!selectedMessage) return;

    addActivity({
      messageId: selectedMessage.id,
      title: "Demo flow started",
      detail: "Portfolio walkthrough initiated for a live AI triage demonstration.",
      tone: "info",
    });

    await analyzeMessage(selectedMessage);
  };

  const analyzeMessage = async (message: InboxMessage) => {
    if (analysisState[message.id]?.loading) return;

    setAnalysisState((current) => ({
      ...current,
      [message.id]: {
        loading: true,
        error: null,
        analyzed: current[message.id]?.analyzed ?? false,
      },
    }));

    try {
      const response = await fetch("/api/analyze-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            sender: message.sender,
            email: message.email,
            subject: message.subject,
            body: message.body,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success || !data?.payload) {
        throw new Error(data?.error || "The AI service is temporarily busy. Please try again in a moment.");
      }

      const payload = data.payload;

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                category: payload.category,
                confidence: payload.confidence,
                requiresHumanReview: payload.needsHumanReview,
                extracted: {
                  ...item.extracted,
                  ...payload.extracted,
                },
                draftReply: payload.draftReply,
                aiReason: payload.reasoning,
                status: payload.needsHumanReview ? "Pending" : item.status,
              }
            : item,
        ),
      );

      setAnalysisState((current) => ({
        ...current,
        [message.id]: {
          loading: false,
          error: null,
          analyzed: true,
        },
      }));

      addActivity({
        messageId: message.id,
        title: `AI classified as ${payload.category}`,
        detail: `${payload.reasoning} • ${payload.needsHumanReview ? "Escalated for review" : "Auto-approved for standard handling"}`,
        tone: payload.needsHumanReview ? "warning" : "success",
      });
    } catch (error) {
      const friendlyError = "The AI service is temporarily busy. Please try again in a moment.";

      setAnalysisState((current) => ({
        ...current,
        [message.id]: {
          loading: false,
          error: friendlyError,
          analyzed: false,
        },
      }));

      addActivity({
        messageId: message.id,
        title: "AI analysis retry needed",
        detail: friendlyError,
        tone: "warning",
      });
    }
  };

  useEffect(() => {
    if (!selectedMessage) return;

    const currentState = analysisState[selectedMessage.id];
    if (!currentState || (!currentState.loading && !currentState.analyzed)) {
      void analyzeMessage(selectedMessage);
    }
  }, [selectedMessage?.id]);

  const handleStatusToggle = (messageId: string) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) return message;

        const nextStatus = message.status === "Pending" ? "Handled" : "Pending";

        addActivity({
          messageId,
          title: `Status updated to ${nextStatus}`,
          detail: `${message.sender} moved from ${message.status} to ${nextStatus}.`,
          tone: nextStatus === "Handled" ? "success" : "info",
        });

        return {
          ...message,
          status: nextStatus,
        };
      }),
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_62%)] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-400 shadow-lg shadow-blue-500/20">
                  <span className="text-lg font-black tracking-tight text-white">N</span>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-200">
                    Northstar Operations
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                    Smart Inbox Management Agent
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  AI triage system live
                </div>

                <button
                  type="button"
                  onClick={() => void runDemoFlow()}
                  className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
                >
                  Run demo flow
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Inbox total" value={String(summary.total)} tint="slate" />
            <StatCard label="Urgent" value={String(summary.urgent)} tint="red" />
            <StatCard label="Pending" value={String(summary.pending)} tint="blue" />
            <StatCard label="Handled" value={String(summary.handled)} tint="emerald" />
            <StatCard label="Avg confidence" value={`${summary.average}%`} tint="amber" />
          </div>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">About this project</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">AI-first customer inbox triage for faster support operations</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              This workflow classifies incoming messages, extracts key details such as order numbers and requested dates,
              drafts a polished customer response, and escalates urgent or ambiguous cases for human oversight. It is built to
              feel like a real operations dashboard that teams can trust for both speed and clarity.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <span className="text-base font-black tracking-tight text-cyan-300">N</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-200">Portfolio build</p>
                <p className="text-lg font-semibold">Northstar Ops</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">Auto-classify inbound tickets</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">Extract order and customer details</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">Support urgent-review workflows</div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.45fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Queue overview
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Inbox queue</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {visibleMessages.length} items
              </span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    activeFilter === filter
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {visibleMessages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => setSelectedId(message.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    selectedMessage?.id === message.id
                      ? "border-blue-200 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{message.sender}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ${categoryStyles[message.category]}`}
                    >
                      {message.category}
                    </span>
                  </div>

                  <p className="mb-2 text-sm font-medium text-slate-700">{message.subject}</p>
                  <p className="mb-3 line-clamp-2 text-sm text-slate-500">{message.preview}</p>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{message.id}</span>
                    <span>{message.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            {selectedMessage ? (
              <>
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Message detail
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedMessage.subject}</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${categoryStyles[selectedMessage.category]}`}
                    >
                      {selectedMessage.category}
                    </span>
                    {selectedMessage.requiresHumanReview && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                        Needs human review
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <SummaryMetric label="Confidence" value={`${Math.round(selectedMessage.confidence * 100)}%`} tone="blue" />
                  <SummaryMetric label="Review flag" value={selectedMessage.requiresHumanReview ? "Required" : "Clear"} tone={selectedMessage.requiresHumanReview ? "amber" : "emerald"} />
                  <SummaryMetric label="Status" value={selectedMessage.status} tone={selectedMessage.status === "Handled" ? "emerald" : "slate"} />
                </div>

                {selectedStatus?.loading && (
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-blue-600" />
                    Analyzing, this may take a moment...
                  </div>
                )}

                {selectedStatus?.error && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p className="font-semibold">AI is taking a moment</p>
                    <p className="mt-1">{selectedStatus.error}</p>
                    <button
                      type="button"
                      onClick={() => analyzeMessage(selectedMessage)}
                      className="mt-3 rounded-full bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-500"
                    >
                      Retry analysis
                    </button>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <InfoRow label="From" value={`${selectedMessage.sender} • ${selectedMessage.email}`} />
                    <InfoRow label="Received" value={new Date(selectedMessage.createdAt).toLocaleString()} />
                    <InfoRow label="AI confidence" value={`${Math.round(selectedMessage.confidence * 100)}%`} />
                    <InfoRow label="Status" value={selectedMessage.status} />

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Extracted details
                      </p>
                      <div className="space-y-2 text-sm text-slate-700">
                        {selectedMessage.extracted.orderNumber && (
                          <div className="flex justify-between gap-4"><span>Order number</span><strong>{selectedMessage.extracted.orderNumber}</strong></div>
                        )}
                        {selectedMessage.extracted.requestedDate && (
                          <div className="flex justify-between gap-4"><span>Requested date</span><strong>{selectedMessage.extracted.requestedDate}</strong></div>
                        )}
                        {selectedMessage.extracted.customerName && (
                          <div className="flex justify-between gap-4"><span>Customer</span><strong>{selectedMessage.extracted.customerName}</strong></div>
                        )}
                        {selectedMessage.extracted.issueType && (
                          <div className="flex justify-between gap-4"><span>Issue type</span><strong>{selectedMessage.extracted.issueType}</strong></div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Message body
                      </p>
                      <p className="text-sm leading-7 text-slate-700">{selectedMessage.body}</p>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-700">
                        AI draft reply
                      </p>
                      <p className="text-sm leading-7 text-slate-700">{selectedMessage.draftReply}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        AI reasoning
                      </p>
                      <p className="text-sm leading-6 text-slate-700">{selectedMessage.aiReason}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Status tracker</p>
                      <p className="text-xs text-slate-500">Mark whether this item is still pending or already handled.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStatusToggle(selectedMessage.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        selectedMessage.status === "Handled"
                          ? "bg-emerald-600 text-white hover:bg-emerald-500"
                          : "bg-slate-900 text-white hover:bg-slate-700"
                      }`}
                    >
                      {selectedMessage.status === "Handled" ? "Mark as pending" : "Mark as handled"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Activity log
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">AI and operator actions</h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activityLog.slice(0, 6).map((entry) => (
                      <div key={entry.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
                        <span
                          className={`mt-0.5 inline-flex h-2.5 w-2.5 rounded-full ${
                            entry.tone === "success"
                              ? "bg-emerald-500"
                              : entry.tone === "warning"
                                ? "bg-amber-500"
                                : entry.tone === "neutral"
                                  ? "bg-slate-400"
                                  : "bg-blue-500"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-slate-800">{entry.title}</p>
                            <span className="text-[11px] text-slate-500">
                              {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{entry.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                No messages match the selected filter.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: "slate" | "red" | "blue" | "emerald" | "amber";
}) {
  const tints = {
    slate: "bg-slate-100 text-slate-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <div className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-lg font-semibold ${tints[tint]}`}>
        {value}
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "amber" | "emerald" | "slate";
}) {
  const tints = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <div className={`rounded-2xl border border-slate-200 p-3 ring-1 ${tints[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  );
}
