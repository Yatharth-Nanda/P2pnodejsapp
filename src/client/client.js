const { lookupUser } = require("../util/lookupUser.js");
const { sendMessage } = require("../util/sendMessage.js"); // Placeholder import for sendMessage
const { v4: uuidv4 } = require("uuid");
const { getCurrentUri } = require("../util/getCurrentUri.js");
const dotenv = require("dotenv"); 
dotenv.config(); 
const { getRandomSeedServer } = require("../server/getRandomSeedServer.js");
const clientIo = require("socket.io-client");
const readline = require("readline");
const { rl } = require("../util/readlineinterface.js");

async function initiateChat() {
  rl.question("Enter the username you want to connect to: ", async (input) => {
    const username = input.trim();
    console.log("Looking up user:", username);
    try {
      const user = await findUser(username);
      console.log("User found:", user);
      await setupChat(user);
      // After setupChat, you can continue with the chat logic or further prompts as needed
    } catch (error) {
      console.error("Failed to setup chat:", error.message);
    }
  });
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

// Main function to setup chat if user is found
async function setupChat(user) {
  try {
    const port = process.env.PORT || process.argv[2] || 3000;
    const ownUrl = `http://localhost:${port}`;
    const otherPeerUrl = user.uri; // Use the found user's URL for the chat session

    const socket = clientIo(otherPeerUrl, {
      auth: {
        username: process.env.USERNAME,
      },
    });

    socket.on("connect", () => {
      console.log("Connected to the other peer. Type your messages:");
      rl.on("line", (line) => {
        username = process.env.USERNAME;
        if (line === "quit") {
          console.log("Disconnecting from the peer.");
          socket.disconnect();
          return;
        }
        socket.emit("chat", { line, username });
      });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from the peer.");
      rl.close();
    });
  } catch (error) {
    console.error("Failed to setup chat:", error.message);
  }
}

module.exports = { initiateChat };
