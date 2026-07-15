import { api } from "@/lib/api";
import { FollowUpSearch } from "@/components/FollowUpSearch";

export default async function FollowUpsPage() {
  const status = await api.getIntegrationsStatus().catch(() => null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-heading-lg text-neutral-900">Follow-ups</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Describe a past order to find it, review a drafted message, and send a real WhatsApp
          follow-up to that customer.
        </p>
      </div>

      <FollowUpSearch whatsappConfigured={status?.whatsapp_configured ?? false} />
    </div>
  );
}
