// socketEvents.js
const { saveMessage } = require("../store");

module.exports = function (io) {
  io.on("connection", (socket) => {
    const username = socket.handshake.auth.username;
    console.log(`A user connected: ${username}`);

    // Listen for chat messages
    socket.on("chat", ({ line, username: sender }) => {
      console.log(`${sender}: ${line}`);

      // Persist the socket chat message
      saveMessage({
        from: sender,
        to: process.env.USERNAME || "unknown",
        message: line,
      });
    });

    // Handle client disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};
