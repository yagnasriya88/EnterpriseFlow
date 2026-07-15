// Thin fetch wrapper around the FastAPI backend. Called only from Server
// Components and Server Actions — the browser never talks to the backend
// directly, so no CORS config is needed there.

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type Customer = {
  id: string;
  name: string | null;
  phone_number: string;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  customer_id: string;
  channel: string;
  status: "active" | "closed";
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  body: string;
  agent: string | null;
  created_at: string;
};

export type LineItemAssumption = { field: string; assumed_value: string; reason: string };

export type LineItem = {
  sku: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_service: boolean;
  assumptions: LineItemAssumption[];
};

export type DocumentStatus = "draft" | "pending_approval" | "approved" | "rejected" | "sent";

export type DocumentRecord = {
  id: string;
  customer_id: string;
  conversation_id: string | null;
  quotation_id?: string | null;
  status: DocumentStatus;
  items: LineItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  pdf_url: string | null;
  customer_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ApprovalStatus = "pending" | "approved" | "rejected" | "edited";

export type Approval = {
  id: string;
  document_type: "quotation" | "invoice";
  document_id: string;
  status: ApprovalStatus;
  reason: string | null;
  approved_by: string | null;
  edited_items: LineItem[] | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApprovalDecideRequest = {
  action: "approve" | "reject" | "edit";
  decided_by: string;
  reason?: string;
  edited_items?: LineItem[];
  edited_customer_message?: string;
};

export type NotificationType = "approval_needed" | "delivery_failed" | "customer_replied" | "followup_sent";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link_type: string | null;
  link_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  category: string | null;
  stock_quantity: number;
  weight_grams: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PolicyDocument = {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
};

export type IntegrationsStatus = {
  whatsapp_configured: boolean;
  gmail_configured: boolean;
  auto_approve_threshold: number;
  tax_rate: number;
  currency: string;
};

export type AgentMessageResponse = {
  reply: string;
  intent: string;
  document_type: "quotation" | "invoice" | null;
  document_id: string | null;
  total: number | null;
  requires_human_approval: boolean;
};

export type FollowUpCandidate = {
  document_type: "quotation" | "invoice";
  document_id: string;
  conversation_id: string | null;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string;
  summary: string;
  total: number;
  currency: string;
  draft_message: string;
};

export const api = {
  listCustomers: () => request<Customer[]>("/customers?limit=500"),
  getCustomer: (id: string) => request<Customer>(`/customers/${id}`),
  createCustomer: (payload: { name?: string; phone_number: string; email?: string }) =>
    request<Customer>("/customers", { method: "POST", body: JSON.stringify(payload) }),

  createConversation: (payload: { customer_id: string; channel?: string }) =>
    request<Conversation>("/conversations", { method: "POST", body: JSON.stringify(payload) }),
  listConversations: () => request<Conversation[]>("/conversations?limit=200"),
  getConversation: (id: string) => request<Conversation>(`/conversations/${id}`),
  listMessages: (conversationId: string) =>
    request<ConversationMessage[]>(`/conversations/${conversationId}/messages`),

  listQuotations: () => request<DocumentRecord[]>("/quotations?limit=200"),
  getQuotation: (id: string) => request<DocumentRecord>(`/quotations/${id}`),
  listInvoices: () => request<DocumentRecord[]>("/invoices?limit=200"),
  getInvoice: (id: string) => request<DocumentRecord>(`/invoices/${id}`),

  listApprovals: (status?: ApprovalStatus) =>
    request<Approval[]>(`/approvals?limit=200${status ? `&status=${status}` : ""}`),
  getApproval: (id: string) => request<Approval>(`/approvals/${id}`),
  decideApproval: (id: string, payload: ApprovalDecideRequest) =>
    request<Approval>(`/approvals/${id}/decide`, { method: "POST", body: JSON.stringify(payload) }),

  listNotifications: (unreadOnly = false) =>
    request<Notification[]>(`/notifications?limit=50${unreadOnly ? "&unread_only=true" : ""}`),
  unreadNotificationCount: () => request<{ count: number }>("/notifications/unread-count"),
  markNotificationRead: (id: string) =>
    request<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),

  listProducts: () => request<Product[]>("/products?limit=500"),
  listPolicyDocuments: () => request<PolicyDocument[]>("/policy-documents"),

  async uploadPolicyDocument(title: string, file: File): Promise<PolicyDocument> {
    const form = new FormData();
    form.append("title", title);
    form.append("file", file);
    const res = await fetch(`${BACKEND_URL}/policy-documents/upload`, { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`upload policy document failed (${res.status}): ${body}`);
    }
    return res.json();
  },

  getIntegrationsStatus: () => request<IntegrationsStatus>("/integrations/status"),

  sendAgentMessage: (payload: { conversation_id: string; customer_id: string; message: string }) =>
    request<AgentMessageResponse>("/agent/message", { method: "POST", body: JSON.stringify(payload) }),

  searchFollowUps: (description: string) =>
    request<{ candidates: FollowUpCandidate[] }>("/follow-ups/search", {
      method: "POST",
      body: JSON.stringify({ description }),
    }),
  sendFollowUp: (payload: {
    document_type: "quotation" | "invoice";
    document_id: string;
    conversation_id: string | null;
    customer_id: string;
    message: string;
  }) => request<{ sent: boolean }>("/follow-ups/send", { method: "POST", body: JSON.stringify(payload) }),
};
