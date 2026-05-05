const { saveMessage, getCurrentUser } = require("../store");

function message(req, res) {
  const { from, message: msg } = req.body;

  if (!from || !msg) {
    return res.status(400).json({ error: "from and message are required" });
  }

  console.log(`${from}: ${msg}`);

  // Persist the incoming message
  saveMessage({
    from,
    to: getCurrentUser(),
    message: msg,
  });

  res.json({ message: "success" });
}

module.exports = { message };
