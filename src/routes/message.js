const { saveMessage, getCurrentUser } = require("../store");

function message(req, res) {
  const { from, message: msg } = req.body;

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
