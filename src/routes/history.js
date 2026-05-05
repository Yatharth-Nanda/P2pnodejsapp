const { getMessages } = require("../store");

/**
 * Returns true if the request originates from the loopback interface.
 */
function isLoopback(req) {
  const ip = req.ip || req.connection.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

/**
 * GET /history?peer=<username>&limit=<number>
 * Returns chat message history, optionally filtered by peer and limited in count.
 * Restricted to loopback (local) requests only — remote peers cannot read the
 * persisted chat log.
 */
function history(req, res) {
  if (!isLoopback(req)) {
    return res.status(403).json({ error: "history is only accessible locally" });
  }

  const { peer, limit } = req.query;

  if (limit !== undefined) {
    const parsed = parseInt(limit, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return res
        .status(400)
        .json({ error: "limit must be a positive integer" });
    }
    const messages = getMessages(peer, parsed);
    return res.json({ messages });
  }

  const messages = getMessages(peer);
  res.json({ messages });
}

module.exports = { history };
