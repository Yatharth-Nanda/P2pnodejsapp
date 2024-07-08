const fetch = require("cross-fetch");

function sendMessage(from, message, uri) {
  console.log("sendMessage called", from, message, uri);
  return fetch(`${uri}/message`, {
    //send to the uri of the user , it makes a post request to the uri ( so a different server )
    method: "POST",
    body: JSON.stringify({
      from, // part of the message being sent
      message,
    }),
    headers: {
      "content-type": "application/json",
    },
  });
}

module.exports = { sendMessage };
