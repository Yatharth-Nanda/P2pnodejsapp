const { lookupUser } = require("../lookupUser");
const { sendMessage } = require("../sendMessage"); // Placeholder import for sendMessage
const { v4: uuidv4 } = require("uuid");
const { getCurrentUri } = require("../getCurrentUri");
const dotenv = require("dotenv"); // Import dotenv to manage environment variables
const { getRandomSeedServer } = require("../getRandomSeedServer");

async function send(req, res) {
  const { to, message } = req.body;
  try {
    const foundUser = await lookupUser(getRandomSeedServer().uri, to, uuidv4()); // instead of getting random server , we can also start with our owm self if we are implementing a
    console.log("found user", foundUser);
    await sendMessage(process.env.USERNAME, message, foundUser.uri);
    return res.json({ message: "success" });
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

module.exports = { send, findUser }; // exporting the function message
