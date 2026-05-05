const fetch = require("cross-fetch");
const { seeds } = require("../server/seeds");

/**
 * Fetch all pending messages for the current user from all seed servers.
 * Called when this peer starts up / reconnects to the network.
 * Messages are dequeued from the seed servers upon retrieval.
 *
 * @param {string} username - the current peer's username
 * @returns {Promise<Array>} array of delivered messages
 */
async function fetchPendingMessages(username) {
  const allMessages = [];

  for (const seed of seeds) {
    try {
      const response = await fetch(`${seed.uri}/pending-messages?user=${encodeURIComponent(username)}`);

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          allMessages.push(...data.messages);
          console.log(
            `[store-and-forward] Retrieved ${data.messages.length} pending message(s) from ${seed.uri}`
          );
        }
      }
    } catch (err) {
      // Seed server unreachable, skip
      console.log(`[store-and-forward] Could not reach seed server ${seed.uri}: ${err.message}`);
    }
  }

  if (allMessages.length > 0) {
    console.log(`\n--- ${allMessages.length} pending message(s) received while you were offline ---`);
    allMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((msg) => {
        const time = new Date(msg.timestamp).toLocaleString();
        console.log(`  [${time}] ${msg.from}: ${msg.message}`);
      });
    console.log("--- end of pending messages ---\n");
  } else {
    console.log("[store-and-forward] No pending messages.");
  }

  return allMessages;
}

module.exports = { fetchPendingMessages };
