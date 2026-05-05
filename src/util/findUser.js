const { lookupUser } = require("./lookupUser");
const { v4: uuidv4 } = require("uuid");
const { getRandomSeedServer } = require("../server/getRandomSeedServer");

/**
 * Look up a user on a random seed server.
 * @param {string} to - the username to find
 * @returns {Promise<object>} the found user information
 */
async function findUser(to) {
  try {
    const foundUser = await lookupUser(getRandomSeedServer().uri, to, uuidv4());
    console.log("found user", foundUser);
    return foundUser;
  } catch (err) {
    console.log(err);
    throw new Error("User not found");
  }
}

module.exports = { findUser };
