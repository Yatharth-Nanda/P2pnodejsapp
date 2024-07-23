const { getnodebyuser, getAllNodes } = require("../server/servers");
console.log("Found succesfully");
const { lookupUser } = require("../util/lookupUser");
const { v4: uuidv4 } = require("uuid");
const { servers, addNode } = require("../server/servers");
const { seeds } = require("../server/seeds");

const seenIds = new Set();

async function lookup(req, res) {
  const { user } = req.query;
  const requestId = req.get("x-request-id") ?? uuidv4();

  if (seenIds.has(requestId)) {
    return res
      .status(404)
      .json({ message: "returning from seen id user not found" });
  }

  seenIds.add(requestId); // this has to
  const serverByUser = getnodebyuser(user); //searches for user in already existing collection
  console.log(`a request for ${user} was made `, serverByUser);

  // look up in exisiting list of user
  if (!serverByUser) {
    let foundUser;

    for (let seed of seeds) {
      try {
        foundUser = await lookupUser(seed.uri, user, requestId);
      } catch (err) {}
    }

    if (foundUser) {
      addNode(foundUser); //caching the user
      console.log("found user and added to this server");
      return res.status(200).json(foundUser);
    } else {
      return res.status(404).json({ message: "user not found" });
    }
  }

  res.status(200).json(serverByUser);
}

module.exports = { lookup };
