const { lookupUser } = require("../util/lookupUser");
const { sendMessage } = require("../util/sendMessage");
const { v4: uuidv4 } = require("uuid");
const { getRandomSeedServer } = require("../server/getRandomSeedServer");
const { findUser } = require("../util/findUser");

async function send(req, res) {
  const { to, message } = req.body;

  let foundUser;
  try {
    foundUser = await lookupUser(getRandomSeedServer().uri, to, uuidv4());
    console.log("found user", foundUser);
  } catch (err) {
    console.log(err);
    return res.status(404).send("user not found");
  }

  try {
    const result = await sendMessage(process.env.USERNAME, message, foundUser.uri, to);

    if (result.status === "delivered") {
      return res.json({ message: "success", status: "delivered" });
    } else {
      return res.json({
        message: "Message queued for delivery when recipient comes online",
        status: "queued",
        storedOn: result.storedOn,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(503).json({
      error: "Failed to deliver or queue message",
      detail: err.message,
    });
  }
}

module.exports = { send, findUser };
