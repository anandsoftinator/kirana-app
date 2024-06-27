const {
  registerHandler,
  messageHandler,
  conversationHandler,
  orderHandler,
} = require("./handlers");

const onConnection = (io) => {
  return function (socket) {
    console.log(`A user connected with id ${socket.id}`);
    registerHandler(io, socket);
    conversationHandler(io, socket);
    messageHandler(io, socket);
    orderHandler(io, socket);
  };
};

module.exports = onConnection;
