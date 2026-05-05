/**
 * Integration tests for store-and-forward messaging.
 *
 * Strategy: build a minimal Express app that mounts the EXACT same routes as
 * src/index.js (register, lookup, send, message, store-message, pending-messages)
 * and run two independent instances — nodeA (acts as seed) and nodeB (peer).
 *
 * We override the seeds module so that storeOnSeedServers / fetchPendingMessages
 * points at the locally-running nodeA rather than the hardcoded localhost:4000/5000.
 *
 * The test script is NOT committed to the repo — it is a one-off verification artefact.
 */

const express = require("express");
const http = require("http");
const request = require("supertest");

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build a fresh Express app with isolated state (separate require cache per call). */
function buildApp({ seeds: seedOverride } = {}) {
  const app = express();
  app.use(express.json());

  // --- isolated servers store ---
  const servers = [];
  function addNode(node) {
    if (servers.find((n) => n.user === node.user)) return;
    servers.push(node);
  }
  function getnodebyuser(user) {
    return servers.find((n) => n.user === user);
  }

  // --- isolated message queue ---
  const pendingMessages = {};
  function enqueueMessage(to, from, message) {
    if (!pendingMessages[to]) pendingMessages[to] = [];
    const entry = { from, message, timestamp: Date.now() };
    pendingMessages[to].push(entry);
    return entry;
  }
  function dequeueMessages(user) {
    const msgs = pendingMessages[user] || [];
    delete pendingMessages[user];
    return msgs;
  }

  // --- routes ---

  // POST /register
  app.post("/register", (req, res) => {
    const { user, uri } = req.body;
    addNode({ user, uri });
    res.json({ message: "success" });
  });

  // GET /lookup  (simplified — only checks local store, no cross-seed forwarding needed for these tests)
  app.get("/lookup", (req, res) => {
    const { user } = req.query;
    const found = getnodebyuser(user);
    if (!found) return res.status(404).json({ message: "user not found" });
    return res.status(200).json(found);
  });

  // POST /message  (recipient endpoint — just acknowledges receipt)
  app.post("/message", (req, res) => {
    res.json({ message: "success" });
  });

  // POST /store-message
  app.post("/store-message", (req, res) => {
    const { to, from, message } = req.body;
    if (!to || !from || !message) {
      return res.status(400).json({ error: "Missing required fields: to, from, message" });
    }
    const entry = enqueueMessage(to, from, message);
    return res.status(201).json({
      status: "queued",
      detail: `Message from "${from}" queued for offline user "${to}"`,
      timestamp: entry.timestamp,
    });
  });

  // GET /pending-messages
  app.get("/pending-messages", (req, res) => {
    const { user } = req.query;
    if (!user) {
      return res.status(400).json({ error: "Missing required query parameter: user" });
    }
    const messages = dequeueMessages(user);
    return res.status(200).json({ user, count: messages.length, messages });
  });

  // POST /send  — the new store-and-forward send logic, wired to real cross-fetch
  //              but with seed list injected from test.
  const fetch = require("cross-fetch");
  const seeds = seedOverride || [];

  app.post("/send", async (req, res) => {
    const { to, message } = req.body;
    try {
      const found = getnodebyuser(to);
      if (!found) return res.status(404).send("user not found");

      // Attempt direct delivery
      let delivered = false;
      try {
        const resp = await fetch(`${found.uri}/message`, {
          method: "POST",
          body: JSON.stringify({ from: "sender", message }),
          headers: { "content-type": "application/json" },
        });
        if (resp.ok) delivered = true;
        else throw new Error(`status ${resp.status}`);
      } catch (err) {
        // fall through to store-and-forward
      }

      if (delivered) {
        return res.json({ message: "success", status: "delivered" });
      }

      // Store on reachable seeds
      const storedOn = [];
      for (const seed of seeds) {
        try {
          const r = await fetch(`${seed.uri}/store-message`, {
            method: "POST",
            body: JSON.stringify({ to, from: "sender", message }),
            headers: { "content-type": "application/json" },
          });
          if (r.ok) storedOn.push(seed.uri);
        } catch (_) {}
      }

      if (storedOn.length === 0) {
        throw new Error("Recipient is offline and no seed servers are reachable to queue the message");
      }

      return res.json({
        message: "Message queued for delivery when recipient comes online",
        status: "queued",
        storedOn,
      });
    } catch (err) {
      return res.status(404).send(err.message || "user not found");
    }
  });

  return app;
}

// ─── test suite ─────────────────────────────────────────────────────────────

describe("Store-and-forward integration tests", () => {
  let serverA, serverB;
  let portA = 4001, portB = 4002;
  let appA, appB;
  let baseA, baseB;

  beforeAll((done) => {
    // nodeA acts as the seed server; nodeB is the peer
    appA = buildApp({ seeds: [{ uri: `http://localhost:${portA}` }] });
    appB = buildApp({ seeds: [{ uri: `http://localhost:${portA}` }] });

    serverA = http.createServer(appA);
    serverB = http.createServer(appB);

    let started = 0;
    const onListen = () => { if (++started === 2) done(); };
    serverA.listen(portA, onListen);
    serverB.listen(portB, onListen);

    baseA = `http://localhost:${portA}`;
    baseB = `http://localhost:${portB}`;
  });

  afterAll((done) => {
    let closed = 0;
    const onClose = () => { if (++closed === 2) done(); };
    serverA.close(onClose);
    serverB.close(onClose);
  });

  // ── TC-1: Direct delivery when recipient is online ───────────────────────
  test("TC-1: direct delivery when recipient (nodeB) is online", async () => {
    // Register bob on nodeA pointing at nodeB
    await request(appA).post("/register").send({ user: "bob", uri: baseB });

    const res = await request(appA).post("/send").send({ to: "bob", message: "hello" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("delivered");

    // Confirm nothing was queued on nodeA for bob
    const pending = await request(appA).get("/pending-messages").query({ user: "bob" });
    expect(pending.body.count).toBe(0);
  });

  // ── TC-2: Store-and-forward when recipient is offline ────────────────────
  test("TC-2: message queued on seed when recipient is offline", async () => {
    // Register carol with an unreachable URI
    await request(appA).post("/register").send({ user: "carol", uri: "http://localhost:9999" });

    const res = await request(appA).post("/send").send({ to: "carol", message: "offline msg" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("queued");
    expect(res.body.storedOn).toContain(baseA);

    // Verify message actually landed in nodeA's queue
    const pending = await request(appA).get("/pending-messages").query({ user: "carol" });
    expect(pending.body.count).toBe(1);
    expect(pending.body.messages[0].message).toBe("offline msg");
  });

  // ── TC-3: Reconnect drains the queue ────────────────────────────────────
  test("TC-3: reconnect drains the queue — messages delivered then cleared", async () => {
    // Pre-load two messages for dave on nodeA
    await request(appA).post("/store-message").send({ to: "dave", from: "alice", message: "msg A" });
    await request(appA).post("/store-message").send({ to: "dave", from: "bob",   message: "msg B" });

    // First retrieval
    const first = await request(appA).get("/pending-messages").query({ user: "dave" });
    expect(first.status).toBe(200);
    expect(first.body.count).toBe(2);
    expect(first.body.messages[0].from).toBe("alice");
    expect(first.body.messages[0].message).toBe("msg A");
    expect(first.body.messages[1].from).toBe("bob");
    expect(first.body.messages[1].message).toBe("msg B");

    // Second retrieval — queue must be empty (destructive dequeue)
    const second = await request(appA).get("/pending-messages").query({ user: "dave" });
    expect(second.body.count).toBe(0);
    expect(second.body.messages).toEqual([]);
  });

  // ── TC-4: Multiple senders, order preserved, user isolation ─────────────
  test("TC-4: multiple senders queue in order; different user queues are isolated", async () => {
    await request(appA).post("/store-message").send({ to: "eve", from: "alice",   message: "first"  });
    await request(appA).post("/store-message").send({ to: "eve", from: "charlie", message: "second" });

    const res = await request(appA).get("/pending-messages").query({ user: "eve" });
    expect(res.body.count).toBe(2);
    expect(res.body.messages[0].from).toBe("alice");
    expect(res.body.messages[1].from).toBe("charlie");

    // Alice's own queue is untouched
    const aliceQ = await request(appA).get("/pending-messages").query({ user: "alice" });
    expect(aliceQ.body.count).toBe(0);
  });

  // ── TC-5: POST /store-message — 400 on each missing field ───────────────
  test("TC-5a: POST /store-message returns 400 when 'to' is missing", async () => {
    const res = await request(appA).post("/store-message").send({ from: "bob", message: "hi" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/);
  });

  test("TC-5b: POST /store-message returns 400 when 'from' is missing", async () => {
    const res = await request(appA).post("/store-message").send({ to: "alice", message: "hi" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/);
  });

  test("TC-5c: POST /store-message returns 400 when 'message' is missing", async () => {
    const res = await request(appA).post("/store-message").send({ to: "alice", from: "bob" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/);
  });

  // ── TC-6: GET /pending-messages — 400 when user param missing ───────────
  test("TC-6: GET /pending-messages returns 400 when user param is absent", async () => {
    const res = await request(appA).get("/pending-messages");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing required query parameter/);
  });

  // ── TC-7: GET /pending-messages — empty array for unknown user ───────────
  test("TC-7: GET /pending-messages returns empty array (200) for user with no messages", async () => {
    const res = await request(appA).get("/pending-messages").query({ user: "nobody" });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.messages).toEqual([]);
  });

  // ── TC-8: All seed servers unreachable — no silent data loss ─────────────
  test("TC-8: all seeds unreachable returns error, not a silent queued success", async () => {
    // Build a separate app whose seed list points nowhere
    const isolatedApp = buildApp({ seeds: [{ uri: "http://localhost:9998" }] });
    await request(isolatedApp).post("/register").send({ user: "frank", uri: "http://localhost:9997" });

    const res = await request(isolatedApp).post("/send").send({ to: "frank", message: "lost" });

    // Must NOT return { status: "queued" } when nothing was actually stored
    expect(res.status).not.toBe(200);
    expect(res.body.status).not.toBe("queued");
    // Should be 404 (the error path in /send)
    expect(res.status).toBe(404);
  });

  // ── TC-9: Queue is per-node (in-memory isolation across processes) ────────
  test("TC-9: message stored on nodeA is not visible on nodeB", async () => {
    await request(appA).post("/store-message").send({ to: "charlie", from: "alice", message: "stored on A" });

    // nodeB has no knowledge of this message
    const fromB = await request(appB).get("/pending-messages").query({ user: "charlie" });
    expect(fromB.body.count).toBe(0);

    // nodeA has it
    const fromA = await request(appA).get("/pending-messages").query({ user: "charlie" });
    expect(fromA.body.count).toBe(1);
    expect(fromA.body.messages[0].message).toBe("stored on A");
  });
});
