const fetch = require("cross-fetch");
const { seeds } = require("../server/seeds");

/**
 * Fetch all pending messages for the current user from all seed servers in parallel.
 * Called when this peer starts up / reconnects to the network.
 * Messages are dequeued from the seed servers upon retrieval and deduplicated
 * by messageId (since the same message may be stored on multiple seeds).
 *
 * @param {string} username - the current peer's username
 * @returns {Promise<Array>} array of delivered messages (deduplicated)
 */
async function fetchPendingMessages(username) {
  const settled = await Promise.allSettled(
    seeds.map(async (seed) => {
      const response = await fetch(`${seed.uri}/pending-messages?user=${encodeURIComponent(username)}`, {
        headers: { "x-requesting-user": username },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          console.log(
            `[store-and-forward] Retrieved ${data.messages.length} pending message(s) from ${seed.uri}`
          );
          return data.messages;
        }
      }
      return [];
    })
  );

  // Collect all messages from successful seed responses
  const rawMessages = settled
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Deduplicate by message ID (same message may be stored on multiple seeds)
  const seen = new Set();
  const allMessages = [];
  for (const msg of rawMessages) {
    if (msg.id) {
      if (seen.has(msg.id)) continue;
      seen.add(msg.id);
    }
    allMessages.push(msg);
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
