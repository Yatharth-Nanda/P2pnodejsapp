const assert = require("assert");
const http = require("http");
const path = require("path");

// Use port 4000 so the server acts as its own seed server
// (getRandomSeedServer returns localhost:4000 or localhost:5000)
process.env.PORT = "4000";
process.env.USERNAME = "sender";

const { DATA_DIR, getMessages } = require("../src/store");
const { cleanup } = require("./helpers");

const express = require("express");
const { register } = require("../src/routes/register");
const { send } = require("../src/routes/send");
const { lookup } = require("../src/routes/lookup");

function makeRequest(port, options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "localhost", port, ...options }, (res) => {
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

  console.log("Running send persistence tests...\n");

  // Set up the sender's server on port 4000 (a seed server port)
  const senderApp = express();
  senderApp.use(express.json());
  senderApp.post("/register", register);
  senderApp.post("/send", send);
  senderApp.get("/lookup", lookup);
  senderApp.post("/message", (req, res) => {
    res.json({ message: "success" });
  });

  const senderServer = senderApp.listen(4000);

  // Also run on port 5000 (the other seed server) so lookups always succeed
  // regardless of which seed getRandomSeedServer picks
  const seed2App = express();
  seed2App.use(express.json());
  seed2App.get("/lookup", lookup);
  seed2App.post("/register", register);

  const seed2Server = seed2App.listen(5000);

  // Set up a mock peer server (port 4001) that accepts /message
  const peerApp = express();
  peerApp.use(express.json());
  let receivedMessage = null;
  peerApp.post("/message", (req, res) => {
    receivedMessage = req.body;
    res.json({ message: "success" });
  });

  const peerServer = peerApp.listen(4001);

  try {
    // Register "bob" on both seed servers so lookup always finds it
    console.log("Test: POST /send persists outgoing message");
    await makeRequest(4000, {
      path: "/register",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, { user: "bob", uri: "http://localhost:4001" });

    await makeRequest(5000, {
      path: "/register",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, { user: "bob", uri: "http://localhost:4001" });

    // Now send a message to bob via /send
    const sendRes = await makeRequest(4000, {
      path: "/send",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, { to: "bob", message: "Hello Bob from sender!" });

    assert.strictEqual(sendRes.status, 200);

    // Verify the message was persisted on the sender's side
    const messages = getMessages();
    const outgoing = messages.find(
      (m) => m.from === "sender" && m.to === "bob"
    );
    assert.ok(outgoing, "Outgoing message should be persisted");
    assert.strictEqual(outgoing.message, "Hello Bob from sender!");
    assert.ok(outgoing.timestamp, "Timestamp should be set");

    // Verify the peer actually received the message
    assert.ok(receivedMessage, "Peer should have received the message");
    assert.strictEqual(receivedMessage.from, "sender");
    assert.strictEqual(receivedMessage.message, "Hello Bob from sender!");
    console.log("  PASSED\n");

    // Test: /send to non-existent peer does NOT persist a message
    console.log("Test: POST /send to unknown peer does not persist");
    const msgCountBefore = getMessages().length;
    const sendBadRes = await makeRequest(4000, {
      path: "/send",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, { to: "nonexistent", message: "Should not be stored" });

    assert.strictEqual(sendBadRes.status, 404);
    const msgCountAfter = getMessages().length;
    assert.strictEqual(msgCountAfter, msgCountBefore, "No message should be stored for failed send");
    console.log("  PASSED\n");

    console.log("All send persistence tests passed!");
  } finally {
    senderServer.close();
    seed2Server.close();
    peerServer.close();
    cleanup(DATA_DIR);
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
