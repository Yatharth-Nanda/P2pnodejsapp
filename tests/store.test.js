const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Set a test port so the store uses a unique data directory
process.env.PORT = "9999";
process.env.USERNAME = "testuser";

const {
  loadPeers,
  savePeers,
  saveMessage,
  getMessages,
  getCurrentUser,
  DATA_DIR,
} = require("../src/store");

const { cleanup } = require("./helpers");

function runTests() {
  console.log("Running store persistence tests...\n");

  // --- getCurrentUser tests ---

  console.log("Test: getCurrentUser returns USERNAME env var");
  assert.strictEqual(getCurrentUser(), "testuser");
  console.log("  PASSED\n");

  // --- Peer persistence tests ---

  console.log("Test: loadPeers returns empty array when no file exists");
  cleanup(DATA_DIR);
  const emptyPeers = loadPeers();
  assert.deepStrictEqual(emptyPeers, []);
  console.log("  PASSED\n");

  console.log("Test: savePeers and loadPeers round-trip");
  const peers = [
    { user: "alice", uri: "http://localhost:4000" },
    { user: "bob", uri: "http://localhost:5000" },
  ];
  savePeers(peers);
  const loaded = loadPeers();
  assert.deepStrictEqual(loaded, peers);
  console.log("  PASSED\n");

  console.log("Test: savePeers overwrites previous data");
  const newPeers = [{ user: "charlie", uri: "http://localhost:6000" }];
  savePeers(newPeers);
  const reloaded = loadPeers();
  assert.deepStrictEqual(reloaded, newPeers);
  assert.strictEqual(reloaded.length, 1);
  console.log("  PASSED\n");

  // --- Message persistence tests ---

  console.log("Test: getMessages returns empty array when no file exists");
  cleanup(DATA_DIR);
  const emptyMsgs = getMessages();
  assert.deepStrictEqual(emptyMsgs, []);
  console.log("  PASSED\n");

  console.log("Test: saveMessage appends messages");
  saveMessage({ from: "alice", to: "bob", message: "Hello Bob!" });
  saveMessage({ from: "bob", to: "alice", message: "Hi Alice!" });
  const msgs = getMessages();
  assert.strictEqual(msgs.length, 2);
  assert.strictEqual(msgs[0].from, "alice");
  assert.strictEqual(msgs[0].to, "bob");
  assert.strictEqual(msgs[0].message, "Hello Bob!");
  assert.strictEqual(msgs[1].from, "bob");
  assert.strictEqual(msgs[1].to, "alice");
  assert.strictEqual(msgs[1].message, "Hi Alice!");
  // Verify timestamps are added
  assert.ok(msgs[0].timestamp);
  assert.ok(msgs[1].timestamp);
  console.log("  PASSED\n");

  console.log("Test: saveMessage preserves provided timestamp");
  cleanup(DATA_DIR);
  const customTime = "2024-01-15T10:30:00.000Z";
  saveMessage({
    from: "alice",
    to: "bob",
    message: "timed msg",
    timestamp: customTime,
  });
  const timedMsgs = getMessages();
  assert.strictEqual(timedMsgs[0].timestamp, customTime);
  console.log("  PASSED\n");

  console.log("Test: getMessages returns all messages when no filter");
  cleanup(DATA_DIR);
  saveMessage({ from: "alice", to: "bob", message: "msg1" });
  saveMessage({ from: "charlie", to: "bob", message: "msg2" });
  saveMessage({ from: "bob", to: "alice", message: "msg3" });
  const allMsgs = getMessages();
  assert.strictEqual(allMsgs.length, 3);
  console.log("  PASSED\n");

  console.log("Test: getMessages filters by peer");
  const aliceMsgs = getMessages("alice");
  assert.strictEqual(aliceMsgs.length, 2); // msg1 (from alice) + msg3 (to alice)
  assert.ok(aliceMsgs.every((m) => m.from === "alice" || m.to === "alice"));
  console.log("  PASSED\n");

  console.log("Test: getMessages with limit returns most recent");
  const limited = getMessages(undefined, 2);
  assert.strictEqual(limited.length, 2);
  assert.strictEqual(limited[0].message, "msg2");
  assert.strictEqual(limited[1].message, "msg3");
  console.log("  PASSED\n");

  console.log("Test: getMessages with peer and limit combined");
  const aliceLimited = getMessages("alice", 1);
  assert.strictEqual(aliceLimited.length, 1);
  assert.strictEqual(aliceLimited[0].message, "msg3"); // most recent alice msg
  console.log("  PASSED\n");

  // --- Edge cases ---

  console.log("Test: handles corrupted JSON peers file gracefully");
  const peersFile = path.join(DATA_DIR, "peers.json");
  fs.writeFileSync(peersFile, "not valid json{{{", "utf8");
  const corruptedPeers = loadPeers();
  assert.deepStrictEqual(corruptedPeers, []);
  console.log("  PASSED\n");

  console.log("Test: handles corrupted ndjson messages file gracefully");
  const messagesFile = path.join(DATA_DIR, "messages.ndjson");
  fs.writeFileSync(messagesFile, "bad line\n{\"from\":\"a\",\"to\":\"b\",\"message\":\"ok\",\"timestamp\":\"t\"}\n", "utf8");
  const partialMsgs = getMessages();
  // Should skip the bad line and parse the valid one
  assert.strictEqual(partialMsgs.length, 1);
  assert.strictEqual(partialMsgs[0].from, "a");
  console.log("  PASSED\n");

  // Cleanup
  cleanup(DATA_DIR);

  console.log("All tests passed!");
}

runTests();
