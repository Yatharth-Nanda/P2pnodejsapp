const fetch = require("cross-fetch");

function lookupUser(uri, user, requestId) {
  // console.log("lookupUser called url is: ", `${uri}/lookup?user=${user}`);
  return fetch(`${uri}/lookup?user=${user}`, {
    headers: {
      "x-request-id": requestId,
    },
  }).then((response) => {
    //  console.log("response status:, ", response.status);
    if (response.ok) {
      return response.json();
    }
    //  console.log("I am throwing error");
    throw new Error("user not found");
  });
}

module.exports = { lookupUser };
