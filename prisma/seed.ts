import { PrismaClient, Priority, type Column, type Category } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const COLUMNS = [
  { name: "Ice Box", color: "#475569" },
  { name: "Emergency", color: "#dc2626" },
  { name: "In Progress", color: "#2563eb" },
  { name: "Testing", color: "#d97706" },
  { name: "Complete", color: "#16a34a" },
];

// Categories (swimlanes) mapped to Ctrl Tower's real domains + startup ops.
const CATEGORIES = [
  { name: "Frontend", color: "#64748b" },
  { name: "Backend & APIs", color: "#64748b" },
  { name: "AI Analysis Pipeline", color: "#64748b" },
  { name: "Cloud Integrations", color: "#64748b" },
  { name: "Compliance & Policies", color: "#64748b" },
  { name: "Documents & Processing", color: "#64748b" },
  { name: "Auth & User Management", color: "#64748b" },
  { name: "Infra & DevOps", color: "#64748b" },
  { name: "Billing & Payments", color: "#64748b" },
  { name: "Business & Outreach", color: "#64748b" },
];

const AVATAR_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

async function main() {
  const name = process.env.SEED_USER_NAME || "Alex Wang";
  const password = process.env.SEED_USER_PASSWORD;
  if (!password) {
    throw new Error(
      "SEED_USER_PASSWORD is required. Set it in your environment before seeding, e.g. SEED_USER_PASSWORD=... npm run db:seed",
    );
  }

  const admin = await prisma.user.upsert({
    where: { name },
    update: {},
    create: {
      name,
      passwordHash: await bcrypt.hash(password, 10),
      avatarColor: AVATAR_COLORS[0],
    },
  });
  console.log(`User ready: ${admin.name}`);

  // Columns
  const columns: Column[] = [];
  for (let i = 0; i < COLUMNS.length; i++) {
    const existing = await prisma.column.findFirst({ where: { name: COLUMNS[i].name } });
    const col = existing
      ? await prisma.column.update({ where: { id: existing.id }, data: { position: i, color: COLUMNS[i].color } })
      : await prisma.column.create({ data: { ...COLUMNS[i], position: i } });
    columns.push(col);
  }

  // Categories
  const categories: Category[] = [];
  for (let i = 0; i < CATEGORIES.length; i++) {
    const existing = await prisma.category.findFirst({ where: { name: CATEGORIES[i].name } });
    const cat = existing
      ? await prisma.category.update({ where: { id: existing.id }, data: { position: i, color: CATEGORIES[i].color } })
      : await prisma.category.create({ data: { ...CATEGORIES[i], position: i } });
    categories.push(cat);
  }

  // Demo tasks only if board empty
  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    const byCol = (n: string) => columns.find((c) => c.name === n)!;
    const byCat = (n: string) => categories.find((c) => c.name === n)!;

    const demo = [
      { title: "Polish dashboard ALE summary + risk donut", col: "In Progress", cat: "Frontend", priority: Priority.P2 },
      { title: "Migrate jobs queue from in-memory to Redis", col: "Ice Box", cat: "Backend & APIs", priority: Priority.P1 },
      { title: "Tune gap-analysis stage-1 prompt to cut false positives", col: "In Progress", cat: "AI Analysis Pipeline", priority: Priority.P1 },
      { title: "AWS evidence auto-collection: add GuardDuty findings", col: "Testing", cat: "Cloud Integrations", priority: Priority.P2 },
      { title: "Map ISO 27001 controls to evidence items", col: "Ice Box", cat: "Compliance & Policies", priority: Priority.P2 },
      { title: "PDF extraction OOM on large uploads", col: "Emergency", cat: "Documents & Processing", priority: Priority.P0 },
      { title: "Password reset flow + email verification", col: "Ice Box", cat: "Auth & User Management", priority: Priority.P2 },
      { title: "HTTPS/TLS on EC2 backend (nginx + cert)", col: "Emergency", cat: "Infra & DevOps", priority: Priority.P0 },
      { title: "Stripe subscription billing MVP", col: "Ice Box", cat: "Billing & Payments", priority: Priority.P2 },
      { title: "Follow up with SOC 2 design-partner leads", col: "In Progress", cat: "Business & Outreach", priority: Priority.P1 },
    ];

    for (let i = 0; i < demo.length; i++) {
      const d = demo[i];
      const task = await prisma.task.create({
        data: {
          title: d.title,
          priority: d.priority,
          position: i,
          columnId: byCol(d.col).id,
          categoryId: byCat(d.cat).id,
          createdById: admin.id,
          notes: { create: { body: "Seeded task — replace with real work.", authorId: admin.id } },
          links: { create: { url: "https://github.com/Ctrl-Tower/ctrl-tower-task-management", kind: "GITHUB", label: "Repo" } },
        },
      });
      await prisma.taskAssignee.create({ data: { taskId: task.id, userId: admin.id } });
    }
    console.log(`Seeded ${demo.length} demo tasks.`);
  } else {
    console.log("Tasks already exist — skipping demo tasks.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
