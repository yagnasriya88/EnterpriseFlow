"use client";

import { useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, RotateCcw, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fadeInUp } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { AgentMessageResponse } from "@/lib/api";
import { sendPlaygroundMessageAction, startPlaygroundSessionAction } from "@/app/(dashboard)/playground/actions";

type ChatMessage = {
  id: string;
  role: "owner" | "agent";
  text: string;
  meta?: AgentMessageResponse;
  failed?: boolean;
};

export function PlaygroundChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const sessionRef = useRef<{ customerId: string; conversationId: string } | null>(null);

  function handleReset() {
    sessionRef.current = null;
    setMessages([]);
    setInput("");
  }

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "owner", text }]);

    startTransition(async () => {
      try {
        if (!sessionRef.current) {
          sessionRef.current = await startPlaygroundSessionAction();
        }
        const { customerId, conversationId } = sessionRef.current;
        const reply = await sendPlaygroundMessageAction(customerId, conversationId, text);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "agent", text: reply.reply, meta: reply },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "agent",
            text: "The agent couldn't process that message. Check that the backend and OPENAI_API_KEY are configured, then try again.",
            failed: true,
          },
        ]);
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-body font-medium text-neutral-900">Talk to your agent as a customer would</p>
            <p className="text-body-sm text-neutral-500">
              Runs the real Intake → Context → Generate → Review → Approval pipeline. Nothing is sent to a real
              customer.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={handleReset} disabled={messages.length === 0}>
          New conversation
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {messages.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Send a test message"
            description={'Try something like "Hi, I need 20 blue throw pillows delivered by Friday" to see how the agent responds.'}
          />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className={cn("flex", message.role === "owner" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2.5 text-body",
                    message.role === "owner"
                      ? "bg-primary-600 text-white"
                      : message.failed
                        ? "border border-danger-500/30 bg-danger-50 text-danger-700"
                        : "border border-neutral-200 bg-neutral-50 text-neutral-800"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.meta && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="info">{message.meta.intent}</Badge>
                      {message.meta.document_type && (
                        <Badge tone="primary">
                          {message.meta.document_type}
                          {message.meta.total != null ? ` · ${formatMoney(message.meta.total)}` : ""}
                        </Badge>
                      )}
                      {message.meta.requires_human_approval && (
                        <Badge tone="warning">Needs your approval</Badge>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {isPending && (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="flex justify-start">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-body-sm text-neutral-400">
              Agent is thinking…
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-neutral-200 px-5 py-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message as a customer would send it…"
          rows={2}
          className="resize-none"
        />
        <Button icon={Send} onClick={handleSend} loading={isPending} disabled={!input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
