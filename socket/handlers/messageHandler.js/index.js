module.exports = (io, socket, userSockets) => {
  const getMessage = () => {};
  const sendMessage = () => {};
  socket.on("get-messsage", getMessage);
  socket.on("send-messsage", sendMessage);
};
