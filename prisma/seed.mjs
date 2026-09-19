import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sampleMessages = [
  {
    id: "MSG-1042",
    senderName: "Alicia Morgan",
    senderEmail: "alicia@northstarhome.com",
    subject: "Urgent: order #NS-2041 delayed",
    body:
      "Hi, I placed an order last week and the delivery date passed without updates. My package says it has not moved since dispatch and I need confirmation by today. This is urgent because I am hosting a family event this weekend. Can someone please contact me as soon as possible?",
    category: "Urgent",
    status: "Pending",
    requiresHumanReview: true,
    confidence: 0.96,
    extractedDetails: {
      orderNumber: "NS-2041",
      requestedDate: "today",
      customerName: "Alicia Morgan",
      issueType: "shipping delay",
    },
    draftReply:
      "Hi Alicia, thank you for reaching out. I’m sorry your order has been delayed. I’ve flagged this for our operations team and will follow up with a shipment update today.",
    aiReason:
      "Contains shipping complaint language, explicit urgency, and time-sensitive service impact.",
  },
  {
    id: "MSG-1043",
    senderName: "Marcus Lee",
    senderEmail: "marcus.lee@claritylabs.io",
    subject: "Request for a meeting next Tuesday",
    body:
      "Hello, we would like to schedule a walkthrough of your automation services for next Tuesday afternoon. We are exploring workflow support for sales follow-up and internal triage. Please let us know your availability and whether you offer a discovery call.",
    category: "Routine",
    status: "Pending",
    requiresHumanReview: false,
    confidence: 0.9,
    extractedDetails: {
      customerName: "Marcus Lee",
      requestedDate: "next Tuesday",
      issueType: "sales inquiry",
    },
    draftReply:
      "Hi Marcus, thank you for your interest in our automation services. We’d be happy to schedule a discovery call. Please share your preferred time and we’ll send a calendar invite.",
    aiReason:
      "This is a standard sales inquiry with a clear request for a meeting and no escalation signal.",
  },
  {
    id: "MSG-1044",
    senderName: "Noreply Support",
    senderEmail: "noreply@creditupdate-verify.com",
    subject: "Final notice: action required",
    body:
      "Your account requires immediate verification to prevent suspension. Click here to confirm your payment method and secure your business profile. This is an urgent notice and final warning before access is restricted.",
    category: "Spam",
    status: "Handled",
    requiresHumanReview: false,
    confidence: 0.98,
    extractedDetails: {
      issueType: "phishing-like account alert",
    },
    draftReply:
      "This message has been marked as spam and no action is required. We recommend deleting it and reporting the sender if it appears in the inbox again.",
    aiReason:
      "Pattern matches phishing language, generic sender identity, and a suspicious urgency trigger without a real business context.",
  },
  {
    id: "MSG-1045",
    senderName: "Priya Shah",
    senderEmail: "priya@shopmira.co",
    subject: "Question about custom packaging",
    body:
      "Hello, I am looking to add branded packaging for a small batch order due at the end of the month. Could you let me know if that is available and what the additional cost would be? We would also like a sample before confirming.",
    category: "Routine",
    status: "Pending",
    requiresHumanReview: false,
    confidence: 0.88,
    extractedDetails: {
      customerName: "Priya Shah",
      requestedDate: "end of the month",
      issueType: "custom packaging inquiry",
    },
    draftReply:
      "Hi Priya, thanks for getting in touch. We can absolutely provide branded packaging options for a smaller production run. I’ll send the pricing details and sample information shortly.",
    aiReason:
      "This is a normal product inquiry with a specific request and no sign of complaints or security issues.",
  },
];

for (const item of sampleMessages) {
  await prisma.message.upsert({
    where: { id: item.id },
    update: item,
    create: item,
  });
}

console.log(`Seeded ${sampleMessages.length} messages.`);

await prisma.$disconnect();
