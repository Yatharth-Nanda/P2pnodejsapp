const { lookupUser } = require("../util/lookupUser");
const { sendMessage } = require("../util/sendMessage");
const { v4: uuidv4 } = require("uuid");
const { getCurrentUri } = require("../util/getCurrentUri");
const dotenv = require("dotenv");
const { getRandomSeedServer } = require("../server/getRandomSeedServer");

async function send(req, res) {
  const { to, message } = req.body;
  try {
    const foundUser = await lookupUser(getRandomSeedServer().uri, to, uuidv4());
    console.log("found user", foundUser);
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
    return res.status(404).send("user not found");
  }
}

async function findUser(to) {
  try {
    const foundUser = await lookupUser(getRandomSeedServer().uri, to, uuidv4());
    console.log("found user", foundUser);
    return foundUser; // Return the found user information
  } catch (err) {
    console.log(err);
    throw new Error("User not found");
  }
}

module.exports = { send, findUser };
