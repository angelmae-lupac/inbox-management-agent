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
