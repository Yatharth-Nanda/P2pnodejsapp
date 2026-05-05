const fs = require("fs");
const path = require("path");

/**
 * Remove persisted test data files for a given DATA_DIR.
 */
function cleanup(DATA_DIR) {
  const peersFile = path.join(DATA_DIR, "peers.json");
  const messagesFile = path.join(DATA_DIR, "messages.ndjson");
  if (fs.existsSync(peersFile)) fs.unlinkSync(peersFile);
  if (fs.existsSync(messagesFile)) fs.unlinkSync(messagesFile);
}

module.exports = { cleanup };
