const assert = require("assert");
const http = require("http");
const path = require("path");

// Set test environment
process.env.PORT = "9998";
process.env.USERNAME = "testnode";

const { DATA_DIR, loadPeers, getMessages } = require("../src/store");
const { cleanup } = require("./helpers");

const express = require("express");
const { register } = require("../src/routes/register");
const { lookup } = require("../src/routes/lookup");
const { message } = require("../src/routes/message");
const { send } = require("../src/routes/send");
const { history } = require("../src/routes/history");

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  cleanup(DATA_DIR);

  console.log("Running integration tests...\n");

  const app = express();
  app.use(express.json());
  app.post("/register", register);
  app.get("/lookup", lookup);
  app.post("/message", message);
  app.post("/send", send);
  app.get("/history", history);

  const server = app.listen(9998);

  try {
    // Test: Register a peer
    console.log("Test: POST /register persists peer");
    const regRes = await makeRequest(
      {
        hostname: "localhost",
        port: 9998,
        path: "/register",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { user: "alice", uri: "http://localhost:4000" }
    );
    assert.strictEqual(regRes.status, 200);

    // Verify peer was persisted
    const peers = loadPeers();
    const alicePeer = peers.find((p) => p.user === "alice");
    assert.ok(alicePeer, "alice should be persisted");
    assert.strictEqual(alicePeer.uri, "http://localhost:4000");
    console.log("  PASSED\n");

    // Test: Re-register with updated URI
    console.log("Test: POST /register updates URI for existing peer");
    const regRes2 = await makeRequest(
      {
        hostname: "localhost",
        port: 9998,
        path: "/register",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { user: "alice", uri: "http://localhost:7001" }
    );
    assert.strictEqual(regRes2.status, 200);
    const updatedPeers = loadPeers();
    const updatedAlice = updatedPeers.find((p) => p.user === "alice");
    assert.strictEqual(updatedAlice.uri, "http://localhost:7001");
    // Should not duplicate the entry
    assert.strictEqual(
      updatedPeers.filter((p) => p.user === "alice").length,
      1
    );
    console.log("  PASSED\n");

    // Test: Lookup the registered peer
    console.log("Test: GET /lookup returns registered peer");
    const lookupRes = await makeRequest({
      hostname: "localhost",
      port: 9998,
      path: "/lookup?user=alice",
      method: "GET",
    });
    assert.strictEqual(lookupRes.status, 200);
    assert.strictEqual(lookupRes.body.user, "alice");
    console.log("  PASSED\n");

    // Test: Receive a message and persist it
    console.log("Test: POST /message persists incoming message");
    const msgRes = await makeRequest(
      {
        hostname: "localhost",
        port: 9998,
        path: "/message",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { from: "alice", message: "Hello testnode!" }
    );
    assert.strictEqual(msgRes.status, 200);

    const messages = getMessages();
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].from, "alice");
    assert.strictEqual(messages[0].to, "testnode");
    assert.strictEqual(messages[0].message, "Hello testnode!");
    console.log("  PASSED\n");

    // Test: History endpoint returns messages
    console.log("Test: GET /history returns persisted messages");
    const histRes = await makeRequest({
      hostname: "localhost",
      port: 9998,
      path: "/history",
      method: "GET",
    });
    assert.strictEqual(histRes.status, 200);
    assert.strictEqual(histRes.body.messages.length, 1);
    assert.strictEqual(histRes.body.messages[0].from, "alice");
    console.log("  PASSED\n");

    // Test: History with peer filter
    console.log("Test: GET /history?peer=alice filters correctly");
    // Add another message from a different user
    await makeRequest(
      {
        hostname: "localhost",
        port: 9998,
        path: "/message",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { from: "bob", message: "Hey there!" }
    );

    const histAlice = await makeRequest({
      hostname: "localhost",
      port: 9998,
      path: "/history?peer=alice",
      method: "GET",
    });
    assert.strictEqual(histAlice.status, 200);
    assert.strictEqual(histAlice.body.messages.length, 1);
    assert.strictEqual(histAlice.body.messages[0].from, "alice");
    console.log("  PASSED\n");

    // Test: History with limit
    console.log("Test: GET /history?limit=1 returns most recent");
    const histLimited = await makeRequest({
      hostname: "localhost",
      port: 9998,
      path: "/history?limit=1",
      method: "GET",
    });
    assert.strictEqual(histLimited.status, 200);
    assert.strictEqual(histLimited.body.messages.length, 1);
    assert.strictEqual(histLimited.body.messages[0].from, "bob");
    console.log("  PASSED\n");

    // Test: History with invalid limit returns 400
    console.log("Test: GET /history?limit=abc returns 400");
    const histBad = await makeRequest({
      hostname: "localhost",
      port: 9998,
      path: "/history?limit=abc",
      method: "GET",
    });
    assert.strictEqual(histBad.status, 400);
    assert.ok(histBad.body.error);
    console.log("  PASSED\n");

    // Test: POST /message rejects missing fields
    console.log("Test: POST /message returns 400 when from is missing");
    const msgBadRes = await makeRequest(
      {
        hostname: "localhost",
        port: 9998,
        path: "/message",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { message: "no sender" }
    );
    assert.strictEqual(msgBadRes.status, 400);
    assert.ok(msgBadRes.body.error);
    console.log("  PASSED\n");

    console.log("Test: POST /message returns 400 when message is missing");
    const msgBadRes2 = await makeRequest(
      {
        hostname: "localhost",
        port: 9998,
        path: "/message",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { from: "alice" }
    );
    assert.strictEqual(msgBadRes2.status, 400);
    assert.ok(msgBadRes2.body.error);
    console.log("  PASSED\n");

    console.log("All integration tests passed!");
  } finally {
    server.close();
    cleanup(DATA_DIR);
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
