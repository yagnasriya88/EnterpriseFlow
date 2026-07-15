"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, MessageCircleReply, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fadeIn, fadeInUp } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { FollowUpCandidate } from "@/lib/api";
import { searchFollowUpsAction, sendFollowUpAction } from "@/app/(dashboard)/followups/actions";

type Turn = {
  id: string;
  query: string;
  status: "searching" | "done";
  candidates: FollowUpCandidate[];
};

function candidateKey(candidate: FollowUpCandidate) {
  return `${candidate.document_type}:${candidate.document_id}`;
}

export function FollowUpSearch({ whatsappConfigured }: { whatsappConfigured: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [isSearching, startSearch] = useTransition();

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [isSending, startSend] = useTransition();
  const [sentKeys, setSentKeys] = useState<Set<string>>(new Set());
  const [sendError, setSendError] = useState<string | null>(null);

  function handleReset() {
    setTurns([]);
    setInput("");
    setExpandedKey(null);
    setDraftMessage("");
    setSentKeys(new Set());
    setSendError(null);
  }

  function handleSearch() {
    const query = input.trim();
    if (!query || isSearching) return;
    setInput("");
    const turnId = crypto.randomUUID();
    setTurns((prev) => [...prev, { id: turnId, query, status: "searching", candidates: [] }]);
    startSearch(async () => {
      const results = await searchFollowUpsAction(query);
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, status: "done", candidates: results } : t)));
    });
  }

  function openReview(candidate: FollowUpCandidate) {
    setExpandedKey(candidateKey(candidate));
    setDraftMessage(candidate.draft_message);
    setSendError(null);
  }

  function closeReview() {
    setExpandedKey(null);
    setSendError(null);
  }

  function handleSend(candidate: FollowUpCandidate) {
    if (isSending) return;
    startSend(async () => {
      const sent = await sendFollowUpAction(candidate, draftMessage);
      if (sent) {
        setSentKeys((prev) => new Set(prev).add(candidateKey(candidate)));
        setExpandedKey(null);
      } else {
        setSendError("Delivery failed — check Settings for WhatsApp connection status, or try again.");
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <MessageCircleReply className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-body font-medium text-neutral-900">Find a past order and follow up</p>
            <p className="text-body-sm text-neutral-500">
              Only quotations/invoices the customer actually received are searched. Nothing sends until you
              review and confirm.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={handleReset} disabled={turns.length === 0}>
          New search
        </Button>
      </div>

      {!whatsappConfigured && (
        <div className="border-b border-warning-500/20 bg-warning-50 px-5 py-2.5">
          <p className="text-body-sm text-warning-700">
            WhatsApp isn&apos;t configured yet — search still works, but sending will fail until it&apos;s set
            up in Settings.
          </p>
        </div>
      )}

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
        {turns.length === 0 ? (
          <EmptyState
            icon={MessageCircleReply}
            title="Find a past interaction"
            description='Try something like "the customer who asked for 100 wireless mice" — only delivered quotations/invoices are searched.'
          />
        ) : (
          <AnimatePresence initial={false}>
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-3">
                <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="flex justify-end">
                  <div className="max-w-[80%] rounded-lg bg-primary-600 px-4 py-2.5 text-body text-white">
                    {turn.query}
                  </div>
                </motion.div>

                {turn.status === "searching" ? (
                  <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="flex justify-start">
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-body-sm text-neutral-400">
                      Searching past orders…
                    </div>
                  </motion.div>
                ) : turn.candidates.length === 0 ? (
                  <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-body-sm text-neutral-600">
                      No matching past interaction. Try different wording, or fewer specifics.
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex justify-start">
                    <div className="w-full max-w-[80%] space-y-2">
                      {turn.candidates.map((candidate) => {
                        const key = candidateKey(candidate);
                        const isSent = sentKeys.has(key);
                        const isExpanded = expandedKey === key;
                        return (
                          <motion.div
                            key={key}
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                            className="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-neutral-900">
                                    {candidate.customer_name || candidate.customer_phone}
                                  </p>
                                  <Badge tone="primary">{candidate.document_type}</Badge>
                                </div>
                                <p className="mt-0.5 text-body-sm text-neutral-500">
                                  {candidate.summary} · {formatMoney(candidate.total, candidate.currency)}
                                </p>
                              </div>
                              {isSent ? (
                                <Badge tone="success">
                                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                                  Sent
                                </Badge>
                              ) : !isExpanded ? (
                                <Button size="sm" variant="secondary" icon={Send} onClick={() => openReview(candidate)}>
                                  Review & send
                                </Button>
                              ) : null}
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  variants={fadeIn}
                                  initial="hidden"
                                  animate="visible"
                                  exit="hidden"
                                  className={cn("mt-3 space-y-2 border-t border-neutral-200 pt-3")}
                                >
                                  <Textarea
                                    value={draftMessage}
                                    onChange={(e) => setDraftMessage(e.target.value)}
                                    rows={3}
                                    placeholder="Follow-up message"
                                    autoFocus
                                  />
                                  {sendError && <p className="text-body-sm text-danger-600">{sendError}</p>}
                                  <div className="flex justify-end gap-2">
                                    <Button variant="secondary" size="sm" disabled={isSending} onClick={closeReview}>
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      icon={Send}
                                      loading={isSending}
                                      disabled={!draftMessage.trim()}
                                      onClick={() => handleSend(candidate)}
                                    >
                                      Send via WhatsApp
                                    </Button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-neutral-200 px-5 py-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder='e.g. "the customer who asked for 100 wireless mice"'
          rows={2}
          className="resize-none"
        />
        <Button icon={Search} onClick={handleSearch} loading={isSearching} disabled={!input.trim()}>
          Search
        </Button>
      </div>
    </div>
  );
}
