const { getSupabaseClient } = require("../../../db/connect");
const { v4: uuidv4 } = require("uuid");
const supabase = getSupabaseClient();

module.exports = (io, socket, userSockets) => {
  const getUsername = async (number) => {
    return await userSockets.get(number);
  };

  const createConversation = async ({ shopUUID, userUUID, reciever }) => {
    try {
      console.log("here");
      const { data, error } = await supabase
        .from("conversation")
        .insert([
          {
            uuid: uuidv4(),
            shopUUID: shopUUID,
            userUUID: userUUID,
          },
        ])
        .select();

      if (error) {
        throw new Error(error.message);
      }
      const receiverIds = await getUsername(reciever);
      if (receiverIds) {
        console.log("here inside");
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
