import { SUPPORT_TOPICS } from "../src/data/support-topics";
import { TICKET_PRIORITY, TICKET_STATUS, canUseDoctorsTopic, topicTitle } from "../src/lib/support";
import { db } from "../src/lib/db";

async function main() {
  const keys = SUPPORT_TOPICS.map((t) => t.key).join(",");
  if (keys !== "customers,academy,doctors") throw new Error(`bad topics: ${keys}`);
  const faqs = SUPPORT_TOPICS.flatMap((t) => t.frequentQuestions);
  if (faqs.length !== 19) throw new Error(`bad FAQ count: ${faqs.length}`);
  if (new Set(faqs.map((q) => q.id)).size !== faqs.length) throw new Error("duplicate FAQ ids");
  for (const t of SUPPORT_TOPICS) {
    if (!t.frequentQuestions.length || !t.title || !t.hint) throw new Error(`incomplete topic: ${t.key}`);
  }
  for (const key of ["OPEN", "ANSWERED", "CLOSED"]) {
    if (!TICKET_STATUS[key]?.label) throw new Error(`missing status: ${key}`);
  }
  for (const key of ["LOW", "NORMAL", "HIGH"]) {
    if (!TICKET_PRIORITY[key]?.label) throw new Error(`missing priority: ${key}`);
  }
  if (!canUseDoctorsTopic("ADMIN") || canUseDoctorsTopic("PATIENT")) throw new Error("bad doctors-topic access rule");
  if (topicTitle("academy") !== "آکادمی و دورهها") throw new Error("bad topic title");

  const tickets = await db.ticket.count();
  const messages = await db.ticketMessage.count();
  console.log(`topics=${SUPPORT_TOPICS.length} faqs=${faqs.length} tickets=${tickets} messages=${messages}`);
  console.log("✓ ticket system smoke check passed");
  await db.$disconnect();
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
