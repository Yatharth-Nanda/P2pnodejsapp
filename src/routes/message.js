const { saveMessage } = require("../store");

async function message(req, res) {
  const { from, message: msg } = req.body;
  const currentUser = process.env.USERNAME || "unknown";

  console.log(`${from}: ${msg}`);

  // Persist the incoming message
  saveMessage({
    from: from,
    to: currentUser,
    message: msg,
  });

  res.json({ message: "success" });
}

module.exports = { message };
