import { InboxDashboard } from "@/components/inbox-dashboard";
import { getInboxMessages } from "@/lib/inbox-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const messages = await getInboxMessages();
  return <InboxDashboard initialMessages={messages} demoMode={process.env.DEMO_MODE === "true"} />;
}
