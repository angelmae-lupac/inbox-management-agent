import { InboxDashboard } from "@/components/inbox-dashboard";
import { getInboxMessages } from "@/lib/inbox-data";

export default async function Home() {
  const messages = await getInboxMessages();
  return <InboxDashboard initialMessages={messages} />;
}
