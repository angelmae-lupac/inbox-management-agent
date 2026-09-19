export type MessageStatus = "Pending" | "Handled";
export type MessageCategory = "Urgent" | "Routine" | "Spam";

export type InboxMessage = {
  id: string;
  sender: string;
  email: string;
  subject: string;
  preview: string;
  body: string;
  category: MessageCategory;
  confidence: number;
  status: MessageStatus;
  deliveryStatus: "NotSent" | "Queued" | "Sent" | "Delivered" | "Failed";
  requiresHumanReview: boolean;
  extracted: {
    orderNumber?: string;
    requestedDate?: string;
    customerName?: string;
    issueType?: string;
  };
  draftReply: string;
  aiReason: string;
  createdAt: string;
};

export const messages: InboxMessage[] = [
  {
    id: "MSG-1042",
    sender: "Alicia Morgan",
    email: "alicia@northstarhome.com",
    subject: "Urgent: order #NS-2041 delayed",
    preview: "Hi, I placed an order last week and the delivery date passed without updates...",
    body:
      "Hi, I placed an order last week and the delivery date passed without updates. My package says it has not moved since dispatch and I need confirmation by today. This is urgent because I am hosting a family event this weekend. Can someone please contact me as soon as possible?",
    category: "Urgent",
    confidence: 0.96,
    status: "Pending",
    deliveryStatus: "NotSent",
    requiresHumanReview: true,
    extracted: {
      orderNumber: "NS-2041",
      requestedDate: "today",
      customerName: "Alicia Morgan",
      issueType: "shipping delay",
    },
    draftReply:
      "Hi Alicia, thank you for reaching out. I'm sorry your order has been delayed. I've flagged this for our operations team and will follow up with a shipment update today.",
    aiReason:
      "Contains shipping complaint language, explicit urgency, and time-sensitive service impact.",
    createdAt: "2026-09-11T09:10:00.000Z",
  },
  {
    id: "MSG-1043",
    sender: "Marcus Lee",
    email: "marcus.lee@claritylabs.io",
    subject: "Request for a meeting next Tuesday",
    preview: "Hello, we would like to schedule a walkthrough of your automation services...",
    body:
      "Hello, we would like to schedule a walkthrough of your automation services for next Tuesday afternoon. We are exploring workflow support for sales follow-up and internal triage. Please let us know your availability and whether you offer a discovery call.",
    category: "Routine",
    confidence: 0.9,
    status: "Pending",
    deliveryStatus: "NotSent",
    requiresHumanReview: false,
    extracted: {
      customerName: "Marcus Lee",
      requestedDate: "next Tuesday",
      issueType: "sales inquiry",
    },
    draftReply:
      "Hi Marcus, thank you for your interest in our automation services. We'd be happy to schedule a discovery call. Please share your preferred time and we'll send a calendar invite.",
    aiReason:
      "This is a standard sales inquiry with a clear request for a meeting and no escalation signal.",
    createdAt: "2026-09-11T08:15:00.000Z",
  },
  {
    id: "MSG-1044",
    sender: "Noreply Support",
    email: "noreply@creditupdate-verify.com",
    subject: "Final notice: action required",
    preview: "Your account requires immediate verification to prevent suspension...",
    body:
      "Your account requires immediate verification to prevent suspension. Click here to confirm your payment method and secure your business profile. This is an urgent notice and final warning before access is restricted.",
    category: "Spam",
    confidence: 0.98,
    status: "Handled",
    deliveryStatus: "NotSent",
    requiresHumanReview: false,
    extracted: {
      issueType: "phishing-like account alert",
    },
    draftReply:
      "This message has been marked as spam and no action is required. We recommend deleting it and reporting the sender if it appears in the inbox again.",
    aiReason:
      "Pattern matches phishing language, generic sender identity, and a suspicious urgency trigger without a real business context.",
    createdAt: "2026-09-11T07:40:00.000Z",
  },
  {
    id: "MSG-1045",
    sender: "Priya Shah",
    email: "priya@shopmira.co",
    subject: "Question about custom packaging",
    preview: "Hello, I am looking to add branded packaging for a small batch order...",
    body:
      "Hello, I am looking to add branded packaging for a small batch order due at the end of the month. Could you let me know if that is available and what the additional cost would be? We would also like a sample before confirming.",
    category: "Routine",
    confidence: 0.88,
    status: "Pending",
    deliveryStatus: "NotSent",
    requiresHumanReview: false,
    extracted: {
      customerName: "Priya Shah",
      requestedDate: "end of the month",
      issueType: "custom packaging inquiry",
    },
    draftReply:
      "Hi Priya, thanks for getting in touch. We can absolutely provide branded packaging options for a smaller production run. I'll send the pricing details and sample information shortly.",
    aiReason:
      "This is a normal product inquiry with a specific request and no sign of complaints or security issues.",
    createdAt: "2026-09-10T18:50:00.000Z",
  },
  {
    id: "MSG-1046",
    sender: "Maria Santos",
    email: "maria.santos@example.com",
    subject: "Question about my order status",
    preview: "I placed an order last week and haven't received a shipping confirmation yet...",
    body:
      "Hi there, I placed an order last week (order #4521) and haven't received a shipping confirmation yet. Can you let me know when it's expected to ship? Thanks, Maria Santos",
    category: "Routine",
    confidence: 0.93,
    status: "Pending",
    deliveryStatus: "NotSent",
    requiresHumanReview: false,
    extracted: {
      orderNumber: "4521",
      customerName: "Maria Santos",
      issueType: "shipping status inquiry",
    },
    draftReply:
      "Hi Maria, thanks for reaching out. I've checked on order #4521 and it's currently being prepared for shipment. You'll receive a tracking confirmation by email within the next 24 hours.",
    aiReason:
      "Standard shipping status question with no urgency language or complaint indicators.",
    createdAt: "2026-09-19T10:05:00.000Z",
  },
  {
    id: "MSG-1047",
    sender: "James Whitfield",
    email: "james.whitfield@example.com",
    subject: "URGENT - Wrong item received, need refund immediately",
    preview: "This is unacceptable. I ordered a laptop stand and received a broken phone case instead...",
    body:
      "This is unacceptable. I ordered a laptop stand and received a broken phone case instead. I paid $89 for this and I need a full refund TODAY or I'm disputing the charge with my bank and leaving a public review. This is the second time your company has messed up my order. I want a response within 24 hours.",
    category: "Urgent",
    confidence: 0.97,
    status: "Pending",
    deliveryStatus: "NotSent",
    requiresHumanReview: true,
    extracted: {
      customerName: "James Whitfield",
      issueType: "wrong item received, refund demand, repeat complaint",
    },
    draftReply:
      "Hi James, I'm very sorry for the mix-up with your order and the frustration this has caused, especially since this isn't the first issue. I'm escalating this for an immediate refund and will personally confirm once it's processed.",
    aiReason:
      "High-intensity language, explicit refund threat, mention of repeat issue, and dispute/chargeback risk. Flagged for human review before any reply is sent.",
    createdAt: "2026-09-19T10:12:00.000Z",
  },
  {
    id: "MSG-1048",
    sender: "Priya Nair",
    email: "priya.nair@example.com",
    subject: "Can I change my delivery address?",
    preview: "I need to update the delivery address for my recent order, I moved last week...",
    body:
      "Hello, I need to update the delivery address for my recent order (#4530). I moved last week and forgot to update it before checkout. New address: 123 Maple Street, Apt 4B, Austin, TX 78701. Please let me know if this is possible. Best, Priya Nair",
    category: "Routine",
    confidence: 0.91,
    status: "Handled",
    deliveryStatus: "Delivered",
    requiresHumanReview: false,
    extracted: {
      orderNumber: "4530",
      customerName: "Priya Nair",
      issueType: "delivery address change",
    },
    draftReply:
      "Hi Priya, no problem at all. I've updated the delivery address for order #4530 to 123 Maple Street, Apt 4B, Austin, TX 78701. You'll receive a confirmation once it ships.",
    aiReason:
      "Simple account update request with a clear, specific detail and no risk signals.",
    createdAt: "2026-09-18T15:30:00.000Z",
  },
];

export const messageSummary = {
  total: messages.length,
  urgent: messages.filter((m) => m.category === "Urgent").length,
  routine: messages.filter((m) => m.category === "Routine").length,
  spam: messages.filter((m) => m.category === "Spam").length,
  pending: messages.filter((m) => m.status === "Pending").length,
  humanReview: messages.filter((m) => m.requiresHumanReview).length,
};