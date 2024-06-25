const { userSockets } = require("../../../db/connect");
const { removeUser, getAllUsers } = require("../../../utils/index");

module.exports = (io, socket) => {
  const activateUser = async ({ uuid }) => {
    try {
      console.log("userid", uuid);
      if (!userSockets.has(uuid)) {
        userSockets.set(uuid, []);
      }
      userSockets.get(uuid).push(socket.id);
      const users = getAllUsers();
      io.emit("active-users", { users });
      socket.emit("active-confirm", { message: "success" });
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
      io.emit("active-users", { users });
    } catch (error) {
      console.error("Error: disconnect", error.message);
    }
  };

  socket.on("activate-user", activateUser);
  socket.on("disconnect", deactiavateUser);
};
