const express = require("express");
const { register } = require("./routes/register.js");
const { getRandomSeedServer } = require("./server/getRandomSeedServer.js");
const {
  registerWithSeedServer,
} = require("./server/regsiterWithSeedServer.js");
const { lookup } = require("./routes/lookup.js");
const { addNode } = require("./server/servers.js");
const { seeds } = require("./server/seeds.js");
const { servers } = require("./server/servers.js");
const { send } = require("./routes/send.js");
const { message } = require("./routes/message.js");
const { history } = require("./routes/history.js");
const setupSocketEvents = require("./server/serverevents");
const { initiateChat } = require("./client/client.js");
const http = require("http");
const socketIo = require("socket.io");
const readline = require("readline");
const { rl } = require("./util/readlineinterface.js");

const port = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins
  },
});

setupSocketEvents(io);

app.use(express.json());

//methods used to send back status and responses
app.post("/register", register);
app.get("/lookup", lookup);
app.post("/send", send);
app.post("/message", message);
app.get("/history", history);

server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// Log persisted peers that were loaded from disk
if (servers.length > 0) {
  console.log(`Restored ${servers.length} peer(s) from local store`);
}

setTimeout(intialise, 10000);

async function intialise() {
  // set up new instances of the server which will register with a seed server

  for (let seed of seeds) {
    addNode(seed);
  }

  const randomserverUri = getRandomSeedServer();

  await registerWithSeedServer(randomserverUri.uri);
}

// Prompt the user after 20 seconds
setTimeout(() => {
  rl.question("Do you want to initiate chat? (yes/no) ", (answer) => {
    if (answer.toLowerCase() === "yes") {
      initiateChat();
    } else {
      console.log("Chat initiation skipped.");
    }
  });
}, 20000);

setTimeout(() => console.log(servers), 16000);
