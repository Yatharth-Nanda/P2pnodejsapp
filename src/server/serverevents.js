// socketEvents.js
module.exports = function (io) {
  io.on("connection", (socket) => {
    const username = socket.handshake.auth.username;
    console.log(`A user connected: ${username}`);

    // Listen for chat messages
    socket.on("chat", ({ line, username }) => {
      console.log(`${username}: ${line}`);
    });

    // Handle client disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};
