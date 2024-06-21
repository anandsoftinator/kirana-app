const { getSupabaseClient } = require("../../../db/connect");
const { v4: uuidv4 } = require("uuid");
const supabase = getSupabaseClient();

module.exports = (io, socket, userSockets) => {
  const getUsername = async (username) => {
    return await userSockets.get(username);
  };

  const createConversation = async ({ shopUUID, userUUID, sender }) => {
    try {
      const { data, error } = await supabase
        .from("conversation")
        .insert([
          {
            uuid: uuidv4,
            shopUUID: shopUUID,
            userUUID: userUUID,
          },
        ])
        .select();

      if (error) {
        throw new Error(error.message);
      }
      const reciever = sender === "user" ? shopUUID : userUUID;
      const receiverIds = await getUsername(reciever);

      receiverIds.forEach((receiverId) => {
        io.to(receiverId).emit("", message);
      });
      socket.emit("");
    } catch (error) {
      console.error("Error: create-conversation", error.message);
    }
  };
  socket.on("create-conversation", createConversation);
};
