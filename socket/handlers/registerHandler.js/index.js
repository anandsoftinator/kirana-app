module.exports = (io, socket, userSockets) => {
  const getAllUsers = () => {
    return Array.from(userSockets.keys());
  };

  const removeUser = (val) => {
    for (const [key, value] of userSockets) {
      if (value.length == 1 && value[0] === val) {
        userSockets.delete(key);
      } else if (value.includes(val)) {
        const filteredArray = value.filter((num) => num !== val);
        userSockets.set(key, filteredArray);
      }
    }
  };

  const activateUser = async ({ username }) => {
    try {
      if (!userSockets.has(username)) {
        userSockets.set(username, []);
      }
      userSockets.get(username).push(socket.id);
      console.log("userSockets", userSockets.keys(), userSockets.values());
      const users = getAllUsers();

      io.emit("active-users", { users });
    } catch (error) {
      console.error("Error: activate-user", error.message);
    }
  };

  const deactiavateUser = () => {
    try {
      console.log(`A user disconnected with id ${socket.id}`);
      userSockets.delete(socket.id);
      removeUser(socket.id);
      const users = getAllUsers();
      console.log("userSockets", userSockets.keys(), userSockets.values());
      io.emit("active-users", { users });
    } catch (error) {
      console.error("Error: disconnect", error.message);
    }
  };

  socket.on("activate-user", activateUser);
  socket.on("disconnect", deactiavateUser);
};
