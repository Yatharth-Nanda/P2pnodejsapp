const { enqueueMessage, dequeueMessages } = require("../store/messageQueue");

/**
 * POST /store-message
 * Called by peers (or other seed servers) to queue a message for an offline recipient.
 * Body: { to, from, message, messageId }
 */
function storeMessage(req, res) {
  const { to, from, message, messageId } = req.body;

  if (!to || !from || !message) {
    return res.status(400).json({ error: "Missing required fields: to, from, message" });
  }

  const entry = enqueueMessage(to, from, message, messageId);
  return res.status(201).json({
    status: "queued",
    detail: `Message from "${from}" queued for offline user "${to}"`,
    timestamp: entry.timestamp,
  });
}

/**
 * GET /pending-messages?user=<username>
 * Called by a peer when it comes online to retrieve all pending messages.
 * Returns the messages and clears them from the queue.
 *
 * Authorization: The request must include an X-Requesting-User header
 * that matches the requested user, to prevent one peer from reading
 * another peer's queued messages.
 */
function getPendingMessages(req, res) {
  const { user } = req.query;

  if (!user) {
    return res.status(400).json({ error: "Missing required query parameter: user" });
  }

  const requestingUser = req.headers["x-requesting-user"];
  if (!requestingUser || requestingUser !== user) {
    return res.status(403).json({
      error: "Forbidden: you can only retrieve your own pending messages",
    });
  }

  const messages = dequeueMessages(user);
  return res.status(200).json({
    user,
    count: messages.length,
    messages,
  });
}

module.exports = { storeMessage, getPendingMessages };
