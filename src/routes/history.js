const { getMessages } = require("../store");

/**
 * GET /history?peer=<username>&limit=<number>
 * Returns chat message history, optionally filtered by peer and limited in count.
 */
function history(req, res) {
  const { peer, limit } = req.query;
  const parsedLimit = limit ? parseInt(limit, 10) : undefined;

  const messages = getMessages(peer, parsedLimit);
  res.json({ messages });
}

module.exports = { history };
