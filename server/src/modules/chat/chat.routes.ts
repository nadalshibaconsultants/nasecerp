// Real-user chat: direct & group conversations with persisted messages,
// per-member unread counts, and realtime delivery to each member's user room.
import { Router } from "express";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { conversations, conversationMembers, chatMessages, users } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError } from "../../middleware/errors.js";
import { emitToUser } from "../../lib/realtime.js";

export const chatRouter = Router();
chatRouter.use(requireAuth);

const me = (req: any) => req.user!.sub as string;

async function assertMember(conversationId: string, userId: string) {
  const m = (await db.select().from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId))).limit(1))[0];
  if (!m) throw new HttpError(403, "You are not a member of this conversation");
  return m;
}

// Directory of real users to start chats with (excludes self + non-active).
chatRouter.get("/users", async (req, res, next) => {
  try {
    const rows = await db.select({ id: users.id, displayName: users.displayName, role: users.role, avatarColor: users.avatarColor })
      .from(users).where(and(eq(users.status, "active"), ne(users.id, me(req)))).orderBy(users.displayName);
    res.json(rows);
  } catch (e) { next(e); }
});

// My conversations with other-member names, last message, and unread count.
chatRouter.get("/conversations", async (req, res, next) => {
  try {
    const uid = me(req);
    const myMemberships = await db.select().from(conversationMembers).where(eq(conversationMembers.userId, uid));
    if (!myMemberships.length) return res.json([]);
    const convoIds = myMemberships.map((m) => m.conversationId);
    const convos = await db.select().from(conversations).where(inArray(conversations.id, convoIds));
    const allMembers = await db.select({ conversationId: conversationMembers.conversationId, userId: conversationMembers.userId, displayName: users.displayName, avatarColor: users.avatarColor })
      .from(conversationMembers).innerJoin(users, eq(users.id, conversationMembers.userId))
      .where(inArray(conversationMembers.conversationId, convoIds));

    const lastReadByConvo = new Map(myMemberships.map((m) => [m.conversationId, m.lastReadAt]));
    const out = [];
    for (const c of convos) {
      const members = allMembers.filter((m) => m.conversationId === c.id);
      const others = members.filter((m) => m.userId !== uid);
      const last = (await db.select().from(chatMessages).where(eq(chatMessages.conversationId, c.id)).orderBy(desc(chatMessages.createdAt)).limit(1))[0];
      const lastRead = lastReadByConvo.get(c.id);
      // Unread = messages from others created after my last_read_at.
      const unreadRow = (await db.select({ n: sql<number>`count(*)::int` }).from(chatMessages)
        .where(and(
          eq(chatMessages.conversationId, c.id),
          ne(chatMessages.senderId, uid),
          lastRead ? sql`${chatMessages.createdAt} > ${lastRead}` : sql`true`,
        )))[0];
      out.push({
        id: c.id,
        type: c.type,
        name: c.type === "group" ? (c.name || "Group") : (others[0]?.displayName || "Direct message"),
        members: members.map((m) => ({ id: m.userId, displayName: m.displayName, avatarColor: m.avatarColor })),
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.createdAt ?? c.updatedAt,
        unread: unreadRow?.n ?? 0,
      });
    }
    out.sort((a, b) => new Date(b.lastMessageAt as any).getTime() - new Date(a.lastMessageAt as any).getTime());
    res.json(out);
  } catch (e) { next(e); }
});

const createSchema = z.object({
  type: z.enum(["dm", "group"]).default("dm"),
  memberIds: z.array(z.string().uuid()).min(1),
  name: z.string().optional(),
});

// Create (or reuse, for DMs) a conversation.
chatRouter.post("/conversations", async (req, res, next) => {
  try {
    const uid = me(req);
    const input = createSchema.parse(req.body);
    const memberIds = Array.from(new Set([uid, ...input.memberIds]));

    if (input.type === "dm" && memberIds.length === 2) {
      // Reuse an existing 1:1 DM between exactly these two users.
      const mine = await db.select({ c: conversationMembers.conversationId }).from(conversationMembers).where(eq(conversationMembers.userId, uid));
      for (const { c } of mine) {
        const convo = (await db.select().from(conversations).where(eq(conversations.id, c)).limit(1))[0];
        if (convo?.type !== "dm") continue;
        const mem = await db.select().from(conversationMembers).where(eq(conversationMembers.conversationId, c));
        if (mem.length === 2 && mem.every((m) => memberIds.includes(m.userId))) {
          return res.json({ id: c, reused: true });
        }
      }
    }

    const convo = (await db.insert(conversations).values({
      type: input.type,
      name: input.type === "group" ? (input.name || "Group chat") : null,
      createdByUserId: uid,
    }).returning())[0];
    await db.insert(conversationMembers).values(memberIds.map((userId) => ({ conversationId: convo.id, userId })));
    res.status(201).json({ id: convo.id, reused: false });
  } catch (e) { next(e); }
});

// Messages of a conversation (also marks them read for the caller).
chatRouter.get("/conversations/:id/messages", async (req, res, next) => {
  try {
    const uid = me(req);
    await assertMember(req.params.id, uid);
    const rows = await db.select({
      id: chatMessages.id, body: chatMessages.body, createdAt: chatMessages.createdAt,
      senderId: chatMessages.senderId, senderName: users.displayName, avatarColor: users.avatarColor,
    }).from(chatMessages).leftJoin(users, eq(users.id, chatMessages.senderId))
      .where(eq(chatMessages.conversationId, req.params.id)).orderBy(asc(chatMessages.createdAt));
    await db.update(conversationMembers).set({ lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, req.params.id), eq(conversationMembers.userId, uid)));
    res.json(rows.map((r) => ({ ...r, mine: r.senderId === uid })));
  } catch (e) { next(e); }
});

const sendSchema = z.object({ body: z.string().min(1).max(8000) });

// Send a message; delivers to every other member's user room in realtime.
chatRouter.post("/conversations/:id/messages", async (req, res, next) => {
  try {
    const uid = me(req);
    await assertMember(req.params.id, uid);
    const { body } = sendSchema.parse(req.body);
    const msg = (await db.insert(chatMessages).values({ conversationId: req.params.id, senderId: uid, body }).returning())[0];
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, req.params.id));
    // Sender has implicitly read their own message.
    await db.update(conversationMembers).set({ lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, req.params.id), eq(conversationMembers.userId, uid)));

    const sender = (await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, uid)).limit(1))[0];
    const members = await db.select().from(conversationMembers).where(eq(conversationMembers.conversationId, req.params.id));
    const payload = { conversationId: req.params.id, message: { ...msg, senderName: sender?.displayName, mine: false } };
    for (const m of members) if (m.userId !== uid) emitToUser(m.userId, "chat:message", payload);

    res.status(201).json({ ...msg, senderName: sender?.displayName, mine: true });
  } catch (e) { next(e); }
});

// Mark a conversation read (clears its unread count for the caller).
chatRouter.post("/conversations/:id/read", async (req, res, next) => {
  try {
    const uid = me(req);
    await assertMember(req.params.id, uid);
    await db.update(conversationMembers).set({ lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, req.params.id), eq(conversationMembers.userId, uid)));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Total unread across all my conversations — drives the nav-icon badge.
chatRouter.get("/unread-count", async (req, res, next) => {
  try {
    const uid = me(req);
    const memberships = await db.select().from(conversationMembers).where(eq(conversationMembers.userId, uid));
    let total = 0;
    for (const m of memberships) {
      const row = (await db.select({ n: sql<number>`count(*)::int` }).from(chatMessages)
        .where(and(
          eq(chatMessages.conversationId, m.conversationId),
          ne(chatMessages.senderId, uid),
          m.lastReadAt ? sql`${chatMessages.createdAt} > ${m.lastReadAt}` : sql`true`,
        )))[0];
      total += row?.n ?? 0;
    }
    res.json({ unread: total });
  } catch (e) { next(e); }
});
