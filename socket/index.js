const {
  registerHandler,
  messageHandler,
  conversationHandler,
} = require("./handlers");

const onConnection = (io) => {
  return function (socket) {
    console.log(`A user connected with id ${socket.id}`);
    registerHandler(io, socket);
    conversationHandler(io, socket);
    messageHandler(io, socket);
  };
};

module.exports = onConnection;
