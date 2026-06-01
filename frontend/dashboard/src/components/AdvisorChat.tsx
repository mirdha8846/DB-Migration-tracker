"use client";

import type { ChatMessage } from "@/types";

type Props = {
  messages: ChatMessage[];
};

export function AdvisorChat({ messages }: Props) {
  return (
    <div className="glass-card flex h-[560px] flex-col p-4">
      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-on-surface/60">Ask about schema migrations and risks.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.role === "user" ? "text-right" : "text-left"}
            >
              <div
                className={
                  msg.role === "user"
                    ? "inline-block rounded-2xl bg-espresso px-4 py-2 text-white"
                    : "inline-block rounded-2xl bg-white/60 px-4 py-2"
                }
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
