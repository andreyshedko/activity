import { cookies } from "next/headers";
import { ActivityStarter } from "./starter";
import { verifySession } from "../lib/auth";
import { demoInvoiceId } from "../lib/demo-data";

export default async function Home() {
  const token = (await cookies()).get("activity_session")?.value;
  const session = verifySession(token);
  return <ActivityStarter invoiceId={demoInvoiceId} session={session} />;
}
