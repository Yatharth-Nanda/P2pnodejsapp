const fetch = require("cross-fetch");

function registerWithSeedServer(uri) {
  //sends a post request to the seed server with the credentials of the new server
  return fetch(`${uri}/register`, {
    // makes a postr request to the uri/register which is the seed server
    method: "POST",
    body: JSON.stringify({
      uri: `http://localhost:${process.env.PORT}`, //${process.env.PORT}
      user: process.env.USERNAME, //
    }),
    headers: { "Content-Type": "application/json" },
  }).then((res) => res.json());
}

module.exports = { registerWithSeedServer };
//registerWithSeedServer return a promise containing the json body ?
