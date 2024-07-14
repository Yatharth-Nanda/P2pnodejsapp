const { getnodebyuser, getAllNodes } = require("../servers");
console.log("Found succesfully");
const { lookupUser } = require("../lookupUser");
const { v4: uuidv4 } = require("uuid");
const { servers, addNode } = require("../servers");

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
  const serverByUser = getnodebyuser(user); //similar to khud pe look up chalana
  console.log(`a request for ${user} was made `, serverByUser);

  // look up in exisiting list of user
  if (!serverByUser) {
    //   console.log("entering seed lookup");
    let foundUser;

    for (let server of getAllNodes()) {
      //   console.log(`checking ${server.user}`);
      try {
        foundUser = await lookupUser(server.uri, user, requestId);
      } catch (err) {}
      //  console.log("found user", foundUser);
    }

    if (foundUser) {
      addNode(foundUser);
      return res.status(200).json(foundUser);
    } else {
      return res.status(404).json({ message: "user not found" });
    }
  }

  //  console.log("user found on this node");

  res.status(200).json(serverByUser);
  // console.log("server by user", serverByUser);
}

module.exports = { lookup };
