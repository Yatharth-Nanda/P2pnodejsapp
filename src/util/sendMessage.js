const fetch = require("cross-fetch");
const { v4: uuidv4 } = require("uuid");
const { seeds } = require("../server/seeds");

/**
 * Attempt to send a message directly to the recipient's URI.
 * If the recipient is unreachable (offline), store the message on seed servers
 * for later delivery (store-and-forward).
 *
 * @param {string} from - sender username
 * @param {string} message - message content
 * @param {string} uri - recipient's URI
 * @param {string} toUser - recipient's username (needed for store-and-forward)
 * @returns {Promise<object>} result with status "delivered" or "queued"
 */
async function sendMessage(from, message, uri, toUser) {
  console.log("sendMessage called", from, message, uri);

  try {
    const response = await fetch(`${uri}/message`, {
      method: "POST",
      body: JSON.stringify({ from, message }),
      headers: { "content-type": "application/json" },
    });

    if (response.ok) {
      return { status: "delivered", uri };
    }

    // Non-OK response — treat as unreachable and fall through to store-and-forward
    throw new Error(`Recipient responded with status ${response.status}`);
  } catch (err) {
    console.log(`[store-and-forward] Recipient at ${uri} is unreachable: ${err.message}`);

    if (!toUser) {
      throw new Error("Recipient is offline and no username provided for store-and-forward");
    }

    // Generate a unique message ID so that duplicate storage across seeds can be deduplicated on retrieval
    const messageId = uuidv4();

    // Store the message on all reachable seed servers for redundancy
    const storeResults = await storeOnSeedServers(from, message, toUser, messageId);

    if (storeResults.length === 0) {
      throw new Error("Recipient is offline and no seed servers are reachable to queue the message");
    }

    console.log(`[store-and-forward] Message queued on ${storeResults.length} seed server(s) for "${toUser}"`);
    return { status: "queued", storedOn: storeResults };
  }
}

/**
 * Store a message on all reachable seed servers in parallel.
 * Returns an array of seed URIs that successfully stored the message.
 */
async function storeOnSeedServers(from, message, toUser, messageId) {
  const settled = await Promise.allSettled(
    seeds.map(async (seed) => {
      const response = await fetch(`${seed.uri}/store-message`, {
        method: "POST",
        body: JSON.stringify({ to: toUser, from, message, messageId }),
        headers: { "content-type": "application/json" },
      });

      if (response.ok) {
        return seed.uri;
      }
      throw new Error(`Seed ${seed.uri} responded with status ${response.status}`);
    })
  );

  return settled
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
}

module.exports = { sendMessage };
