const fs = require("fs");
const path = require("path");

// Data directory lives next to the project root, namespaced by port
// so multiple nodes on the same machine don't collide.
const DATA_DIR = path.join(
  __dirname,
  "..",
  "..",
  "data",
  `node-${process.env.PORT || 4000}`
);

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PEERS_FILE = path.join(DATA_DIR, "peers.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.ndjson");

/**
 * Atomically write JSON data to a file.
 * Writes to a temp file first, then renames to avoid corruption on crash.
 */
function writeJSON(filePath, data) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

/**
 * Read JSON data from a file. Returns defaultValue if file doesn't exist.
 */
function readJSON(filePath, defaultValue) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    // File doesn't exist or is corrupted — return default
    return defaultValue;
  }
}

// --- Peer Registry Persistence ---

/**
 * Load all persisted peers from disk.
 * @returns {Array<{user: string, uri: string}>}
 */
function loadPeers() {
  return readJSON(PEERS_FILE, []);
}

/**
 * Save the full peer list to disk.
 * @param {Array<{user: string, uri: string}>} peers
 */
function savePeers(peers) {
  writeJSON(PEERS_FILE, peers);
}

// --- Message Persistence (newline-delimited JSON for O(1) appends) ---

/**
 * Load all persisted messages from disk.
 * Reads newline-delimited JSON (one JSON object per line).
 * @returns {Array<{from: string, to: string, message: string, timestamp: string}>}
 */
function loadMessages() {
  try {
    const raw = fs.readFileSync(MESSAGES_FILE, "utf8");
    if (!raw.trim()) return [];
    return raw
      .trim()
      .split("\n")
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    return [];
  }
}

/**
 * Append a message to the persisted message history.
 * Uses append-only writes for O(1) performance per message.
 * @param {{from: string, to: string, message: string, timestamp?: string}} msg
 */
function saveMessage(msg) {
  const entry = {
    from: msg.from,
    to: msg.to,
    message: msg.message,
    timestamp: msg.timestamp || new Date().toISOString(),
  };
  fs.appendFileSync(MESSAGES_FILE, JSON.stringify(entry) + "\n", "utf8");
}

/**
 * Get message history, optionally filtered by peer username.
 * @param {string} [peerUser] - If provided, returns only messages to/from this user.
 * @param {number} [limit] - Max number of messages to return (most recent first).
 * @returns {Array<{from: string, to: string, message: string, timestamp: string}>}
 */
function getMessages(peerUser, limit) {
  let messages = loadMessages();

  if (peerUser) {
    messages = messages.filter(
      (m) => m.from === peerUser || m.to === peerUser
    );
  }

  if (limit && limit > 0) {
    messages = messages.slice(-limit);
  }

  return messages;
}

module.exports = {
  loadPeers,
  savePeers,
  saveMessage,
  loadMessages,
  getMessages,
  DATA_DIR,
};
