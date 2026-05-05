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
const { storeMessage, getPendingMessages } = require("./routes/storeForward.js");
const { fetchPendingMessages } = require("./util/fetchPendingMessages.js");
const setupSocketEvents = require("./server/serverevents");
const { initiateChat } = require("./client/client.js");
const http = require("http");
const socketIo = require("socket.io"); // Corrected import for socket.io
const readline = require("readline");
const { rl } = require("./util/readlineinterface.js");

const port = process.env.PORT || 4000;

//rn seed servers themselvees might register up to other seed servers
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
app.post("/register", register); //register is the function to be called
app.get("/lookup", lookup);
app.post("/send", send);
app.post("/message", message);

// Store-and-forward routes
app.post("/store-message", storeMessage);
app.get("/pending-messages", getPendingMessages);

server.listen(port, () => {
  //firing up the server
  console.log(`Listening on port ${port}`);
});

setTimeout(intialise, 10000);

async function intialise() {
  // set up new instances of the server which will register with a seed server

  for (let seed of seeds) {
    //use of to iterate over the seeds
    addNode(seed);
  }

  const randomserverUri = getRandomSeedServer();

  await registerWithSeedServer(randomserverUri.uri);

  // After registering, fetch any pending messages that were stored while offline
  if (process.env.USERNAME) {
    await fetchPendingMessages(process.env.USERNAME);
  }
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
