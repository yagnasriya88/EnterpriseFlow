"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, MessageCircleReply, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { fadeInUp } from "@/lib/motion";
import { formatMoney } from "@/lib/format";
import type { FollowUpCandidate } from "@/lib/api";
import { searchFollowUpsAction, sendFollowUpAction } from "@/app/(dashboard)/followups/actions";

export function FollowUpSearch({ whatsappConfigured }: { whatsappConfigured: boolean }) {
  const [description, setDescription] = useState("");
  const [candidates, setCandidates] = useState<FollowUpCandidate[] | null>(null);
  const [isSearching, startSearch] = useTransition();

  const [selected, setSelected] = useState<FollowUpCandidate | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [isSending, startSend] = useTransition();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendError, setSendError] = useState<string | null>(null);

  function handleSearch() {
    const query = description.trim();
    if (!query || isSearching) return;
    startSearch(async () => {
      const results = await searchFollowUpsAction(query);
      setCandidates(results);
    });
  }

  function openReview(candidate: FollowUpCandidate) {
    setSelected(candidate);
    setDraftMessage(candidate.draft_message);
    setSendError(null);
  }

  function handleSend() {
    if (!selected || isSending) return;
    startSend(async () => {
      const sent = await sendFollowUpAction(selected, draftMessage);
      if (sent) {
        setSentIds((prev) => new Set(prev).add(`${selected.document_type}:${selected.document_id}`));
        setSelected(null);
      } else {
        setSendError("Delivery failed — check Settings for WhatsApp connection status, or try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="followup-description" className="text-body-sm font-medium text-neutral-500">
            Describe the order or customer
          </label>
          <Input
            id="followup-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder='e.g. "the customer who asked for 100 wireless mice"'
          />
        </div>
        <Button icon={Search} onClick={handleSearch} loading={isSearching} disabled={!description.trim()}>
          Search
        </Button>
      </Card>

      {!whatsappConfigured && (
        <p className="text-body-sm text-warning-600">
          WhatsApp isn&apos;t configured yet — search still works, but sending will fail until it&apos;s set up
          in Settings.
        </p>
      )}

      {candidates === null ? (
        <EmptyState
          icon={MessageCircleReply}
          title="Find a past interaction"
          description='Try something like "the customer who asked for 100 wireless mice" — only quotations/invoices the customer actually received are searched.'
        />
      ) : candidates.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching past interaction"
          description="Try different wording, or fewer specifics — only delivered quotations/invoices are searched."
        />
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-3">
            {candidates.map((candidate) => {
              const key = `${candidate.document_type}:${candidate.document_id}`;
              const alreadySent = sentIds.has(key);
              return (
                <motion.div key={key} variants={fadeInUp} initial="hidden" animate="visible">
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
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
                    {alreadySent ? (
                      <Badge tone="success">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        Sent
                      </Badge>
                    ) : (
                      <Button size="sm" variant="secondary" icon={Send} onClick={() => openReview(candidate)}>
                        Review & send
                      </Button>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      <Modal open={selected !== null} onClose={() => setSelected(null)} title="Review follow-up">
        {selected && (
          <div className="space-y-4">
            <p className="text-body-sm text-neutral-500">
              To <span className="font-medium text-neutral-800">{selected.customer_name || selected.customer_phone}</span>{" "}
              · {selected.summary} · {formatMoney(selected.total, selected.currency)}
            </p>
            <Textarea
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              rows={4}
              placeholder="Follow-up message"
            />
            {sendError && <p className="text-body-sm text-danger-600">{sendError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={isSending} onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button
                icon={Send}
                loading={isSending}
                disabled={!draftMessage.trim()}
                onClick={handleSend}
              >
                Send via WhatsApp
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
