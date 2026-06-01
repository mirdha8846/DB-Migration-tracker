"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";
import { AdvisorInsight } from "@/types";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function AdvisorPageContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [insights, setInsights] = useState<AdvisorInsight[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<AdvisorInsight[]>("/api/advisor/insights");
        setInsights(res.data);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const value = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: value,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      const res = await api.post("/api/advisor/chat", { message: value });
      setMessages((prev) => [
        ...prev,
        { id: res.data.id, role: "assistant", content: res.data.content },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-fallback`,
          role: "assistant",
          content: "I could not reach the advisor service. Please try again.",
        },
      ]);
    }
    setTyping(false);
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  };

  return (
    <DashboardShell
      variant="advisor"
      active="advisor"
      mainClassName="relative ml-0 flex h-screen flex-col md:ml-64"
    >
      <section className="mt-16 flex flex-1 overflow-hidden">
        <aside className="glass-panel m-4 hidden w-72 flex-col overflow-hidden rounded-2xl border border-primary/5 bg-white/10 backdrop-blur-2xl lg:flex">
          <div className="flex items-center justify-between border-b border-primary/5 bg-surface-container-low/20 p-4">
            <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              Insights
            </h3>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {loading ? (
              <p className="px-2 py-4 text-center text-[13px] text-on-surface-variant/50">
                Loading...
              </p>
            ) : insights.length === 0 ? (
              <p className="px-2 py-4 text-center text-[13px] text-on-surface-variant/50">
                No insights available
              </p>
            ) : (
              insights.map((insight) => (
                <div
                  key={insight.id}
                  className="cursor-pointer rounded-xl border border-primary/5 bg-white/60 p-3 shadow-sm transition-all hover:shadow-md"
                >
                  <p className="truncate font-body-md text-[13px] font-semibold text-on-surface">
                    {insight.message}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {insight.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-surface-variant/30 px-2 py-0.5 text-[10px] font-bold text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col p-4 lg:pl-0">
          <div
            ref={containerRef}
            className="mx-auto w-full max-w-5xl flex-1 space-y-8 overflow-y-auto px-4 pb-32 lg:px-12"
          >
            {loading && messages.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <p className="text-on-surface-variant/50">Connecting to Advisor...</p>
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <MaterialIcon name="smart_toy" className="mb-4 text-[48px] text-primary/30" />
                <p className="font-body-md text-on-surface-variant/60">
                  Ask SchemaGuard Advisor about your schema migrations.
                </p>
              </div>
            )}

            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex animate-slide-up items-start justify-end gap-4">
                  <div className="max-w-[85%]">
                    <div className="rounded-2xl rounded-tr-none border border-primary/10 bg-primary-container p-5 text-on-primary-container shadow-lg">
                      <p className="font-body-md text-body-md leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-fixed shadow-md">
                    <MaterialIcon name="person" className="text-primary material-symbols-filled" />
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex animate-slide-up items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary-container shadow-sm">
                    <MaterialIcon name="smart_toy" className="text-primary-fixed-dim material-symbols-filled" />
                  </div>
                  <div className="max-w-[85%]">
                    <div className="message-bubble-ai rounded-2xl rounded-tl-none p-5 shadow-sm">
                      <p className="font-body-md text-body-md leading-relaxed text-on-surface">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              ),
            )}

            {typing && (
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary-container shadow-sm">
                  <MaterialIcon name="smart_toy" className="text-primary-fixed-dim material-symbols-filled" />
                </div>
                <div className="message-bubble-ai flex items-center gap-1.5 rounded-2xl rounded-tl-none px-6 py-4 shadow-sm">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
          </div>

          <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center px-6 md:left-64">
            <form
              onSubmit={sendMessage}
              className="flex w-full max-w-4xl items-end gap-2 rounded-2xl border border-primary/10 bg-white/40 p-2 shadow-2xl backdrop-blur-3xl"
            >
              <textarea
                className="max-h-32 min-h-[44px] flex-1 resize-none border-none bg-transparent py-3 font-body-md text-body-md text-on-surface placeholder-on-surface-variant/40 focus:ring-0"
                placeholder="Ask SchemaGuard Advisor about your architecture..."
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                type="submit"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary shadow-xl shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
              >
                <MaterialIcon name="send" className="material-symbols-filled" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
