"use client";

import { FormEvent, useRef, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  delivered?: boolean;
};

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Greetings, Architect. I've finished analyzing the Core Banking Engine schema migration script (PR #402).",
  },
];

export function AdvisorPageContent() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sendMessage = (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      delivered: true,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-ai`,
          role: "assistant",
          content:
            "Architect, I'm verifying the impact of these changes on your zero-downtime requirements. The proposed migration is compliance-safe and ready for deployment.",
        },
      ]);
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }, 2000);
  };

  return (
    <DashboardShell
      variant="advisor"
      active="advisor"
      mainClassName="relative ml-0 flex h-screen flex-col md:ml-64"
    >
      <section className="mt-16 flex flex-1 overflow-hidden">
        <div className="glass-panel m-4 hidden w-72 flex-col overflow-hidden rounded-2xl border border-primary/5 bg-white/10 backdrop-blur-2xl lg:flex">
          <div className="flex items-center justify-between border-b border-primary/5 bg-surface-container-low/20 p-4">
            <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              History
            </h3>
            <button className="text-primary transition-transform hover:scale-110">
              <MaterialIcon name="add_circle" size={20} />
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            <div className="cursor-pointer rounded-xl border border-primary/10 bg-white/60 p-3 shadow-sm transition-all hover:shadow-md">
              <p className="truncate font-body-md text-[13px] font-semibold text-on-surface">
                SQL Injection Risk Analysis
              </p>
              <div className="mt-1 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                <span className="text-[10px] font-bold uppercase text-secondary">Resolved</span>
              </div>
            </div>
            <div className="cursor-pointer rounded-xl border border-transparent p-3 transition-all hover:border-primary/5 hover:bg-white/40">
              <p className="truncate font-body-md text-[13px] text-on-surface-variant">
                Schema Drift Detection
              </p>
              <span className="text-[10px] text-on-surface-variant/40">Yesterday</span>
            </div>
          </div>
          <div className="border-t border-primary/5 bg-primary-container/5 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-tighter text-primary/40">
              Encrypted E2E • Vault-KMS
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4 lg:pl-0">
          <div
            ref={containerRef}
            className="mx-auto w-full max-w-5xl flex-1 space-y-8 overflow-y-auto px-4 pb-32 lg:px-12"
          >
            <div className="flex animate-slide-up items-start gap-4 opacity-0" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary-container shadow-sm">
                <MaterialIcon name="smart_toy" className="text-primary-fixed-dim material-symbols-filled" />
              </div>
              <div className="max-w-[85%]">
                <div className="message-bubble-ai rounded-2xl rounded-tl-none p-5 shadow-sm">
                  <p className="font-body-md text-body-md leading-relaxed text-on-surface">
                    Greetings, Architect. I&apos;ve finished analyzing the{" "}
                    <span className="rounded bg-tertiary-fixed px-1 font-bold text-tertiary-container">
                      Core Banking Engine
                    </span>{" "}
                    schema migration script (PR #402).
                  </p>
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-error/20 bg-error-container/10 p-4">
                    <MaterialIcon name="warning" className="text-error" />
                    <div>
                      <p className="font-label-sm text-[12px] font-bold uppercase tracking-wider text-error">
                        Critical Risk Detected
                      </p>
                      <p className="text-[13px] text-on-surface/80">
                        Line 42:{" "}
                        <code className="rounded bg-error/5 px-1">DROP COLUMN meta_json</code> may cause
                        data loss in 3 downstream microservices.
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 font-body-md text-body-md text-on-surface">
                    I recommend a{" "}
                    <span className="font-bold text-secondary underline decoration-secondary/30 underline-offset-4">
                      non-destructive pattern
                    </span>{" "}
                    to ensure zero-downtime.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex animate-slide-up items-start justify-end gap-4 opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
              <div className="max-w-[85%]">
                <div className="rounded-2xl rounded-tr-none border border-primary/10 bg-primary-container p-5 text-on-primary-container shadow-lg">
                  <p className="font-body-md text-body-md leading-relaxed">
                    Can you show me the downstream services affected and the recommended SQL fix for
                    zero-downtime?
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1">
                  <MaterialIcon name="check_circle" className="text-[14px] text-secondary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
                    Delivered • 14:22 PM
                  </span>
                </div>
              </div>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-fixed shadow-md">
                <MaterialIcon name="person" className="text-primary material-symbols-filled" />
              </div>
            </div>

            <div className="flex animate-slide-up items-start gap-4 opacity-0" style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary-container shadow-sm">
                <MaterialIcon name="smart_toy" className="text-primary-fixed-dim material-symbols-filled" />
              </div>
              <div className="max-w-[85%]">
                <div className="message-bubble-ai rounded-2xl rounded-tl-none p-5 shadow-sm">
                  <p className="mb-4 font-body-md text-body-md text-on-surface">
                    Certainly. The affected services are:{" "}
                    <code className="rounded bg-surface-variant/30 px-1.5 py-0.5 text-[13px] font-bold">
                      ledger-service
                    </code>
                    ,{" "}
                    <code className="rounded bg-surface-variant/30 px-1.5 py-0.5 text-[13px] font-bold">
                      reporting-worker
                    </code>
                    , and{" "}
                    <code className="rounded bg-surface-variant/30 px-1.5 py-0.5 text-[13px] font-bold">
                      audit-vault
                    </code>
                    .
                  </p>
                  <div className="relative my-5 overflow-hidden rounded-xl border border-white/10 bg-primary/95 font-mono text-[13px] shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/5 bg-white/10 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-secondary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary-fixed-dim">
                          PostgreSQL • migration_v4.sql
                        </span>
                      </div>
                      <button className="text-white/60 transition-colors hover:text-white">
                        <MaterialIcon name="content_copy" size={16} />
                      </button>
                    </div>
                    <pre className="overflow-x-auto p-5 leading-relaxed text-primary-fixed-dim">
                      <code>{`-- 1. Create a shadow column instead of dropping
ALTER TABLE transactions RENAME COLUMN meta_json TO meta_json_deprecated;
ALTER TABLE transactions ADD COLUMN metadata JSONB;

-- 2. Trigger for dual-write during transition
CREATE OR REPLACE FUNCTION sync_metadata() RETURNS trigger AS $$
BEGIN
  NEW.metadata := NEW.meta_json_deprecated;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`}</code>
                    </pre>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-secondary/20 bg-secondary/5 p-3">
                    <MaterialIcon name="verified" className="text-[20px] text-secondary" />
                    <p className="text-[13px] font-semibold text-secondary">
                      This pattern ensures <span className="uppercase tracking-tighter">zero downtime</span>{" "}
                      across all microservices.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {messages.slice(1).map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex animate-slide-up items-start justify-end gap-4">
                  <div className="max-w-[85%]">
                    <div className="rounded-2xl rounded-tr-none border border-primary/10 bg-primary-container p-5 text-on-primary-container shadow-lg">
                      <p className="font-body-md text-body-md leading-relaxed">{msg.content}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <MaterialIcon name="check_circle" className="text-[14px] text-secondary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
                        Just now
                      </span>
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
              <button
                type="button"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-primary-fixed/20 hover:text-primary"
              >
                <MaterialIcon name="attach_file_add" />
              </button>
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
