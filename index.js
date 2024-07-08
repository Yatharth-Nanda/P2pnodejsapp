const express = require("express");
const { register } = require("./src/routes/register.js");
const { getRandomSeedServer } = require("./src/getRandomSeedServer.js");
const { registerWithSeedServer } = require("./src/regsiterWithSeedServer.js");
const { lookup } = require("./src/routes/lookup.js");
const { addNode } = require("./src/servers.js");
const { seeds } = require("./seeds");
const { servers } = require("./src/servers.js");
const { send } = require("./src/routes/send.js");
const { message } = require("./src/routes/message.js");
const port = process.env.PORT || 4000;

//rn seed servers themselvees might register up to other seed servers
const app = express();
app.use(express.json());

//methods used to send back status and responses
app.post("/register", register); //register is the function to be called
app.get("/lookup", lookup);
app.post("/send", send);
app.post("/message", message);

app.listen(port, () => {
  //firing up the server
  console.log(`Listening on port ${port}`);
});

setTimeout(intialise, 10000); // does not block thread

async function intialise() {
  // set up new instances of the server which will register with a seed server

  for (let seed of seeds) {
    //use of to iterate over the seeds
    addNode(seed);
  }

  const randomserverUri = getRandomSeedServer();

  await registerWithSeedServer(randomserverUri.uri);
}

setTimeout(() => console.log(servers), 16000);
