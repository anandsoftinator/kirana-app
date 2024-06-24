const { getSupabaseClient } = require("../../../db/connect");
const { v4: uuidv4 } = require("uuid");
const { getSocketIds } = require("../../../utils");
const supabase = getSupabaseClient();

module.exports = (io, socket) => {
  const createConversation = async ({
    shopUUID,
    userUUID,
    reciever,
    active,
  }) => {
    try {
      const { data, error } = await supabase
        .from("conversation")
        .insert([
          {
            uuid: uuidv4(),
            shopUUID: shopUUID,
            userUUID: userUUID,
            active: active ? true : false,
          },
        ])
        .select();

      if (error) {
        throw new Error(error.message);
      }
      const recieverId = reciever === "user" ? userUUID : shopUUID;
      const receiverIds = await getSocketIds(recieverId);
      if (receiverIds) {
        receiverIds.forEach((receiverId) => {
          io.to(receiverId).emit("get-conversation-id", { data });
        });
      }
      socket.emit("get-conversation-id", { data });
    } catch (error) {
      console.error("Error: create-conversation", error.message);
    }
  };
  socket.on("create-conversation", createConversation);
};
