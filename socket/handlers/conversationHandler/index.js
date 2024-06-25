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
          socket.to(receiverId).emit("get-conversation-id", { data });
        });
      }
      socket.emit("get-conversation-id", { data });
    } catch (error) {
      console.error("Error: create-conversation", error.message);
    }
  };

  const getAllConversation = async ({ shopUUID }) => {
    try {
      const { data: conversationData, error: conversationError } =
        await supabase
          .from("conversation")
          .select(
            `
              uuid,
              userUUID,
              user:userUUID (
                uuid,
                phone_number,
                address,
                latitude,
                longitude,
                last_online_at,
                userImage,
                name,
                status
              )
            `
          )
          .eq("shopUUID", shopUUID);

      if (conversationError) {
        throw new Error(conversationError.message);
      }

      for (const conversation of conversationData) {
        const { userUUID } = conversation;

        const { data: messageData, error: messageError } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(senderUUID.eq.${shopUUID},receiverUUID.eq.${userUUID}),and(senderUUID.eq.${userUUID},receiverUUID.eq.${shopUUID})`
          )
          .order("created_at", { ascending: false })
          .limit(1);

        if (messageError) {
          throw new Error(messageError.message);
        }

        conversation.lastMessage = messageData[0] || null;
      }

      console.log("conversationData", conversationData);
      socket.emit("all-conversations", { data: conversationData });
    } catch (error) {
      console.error("Error: get-all-conversations", error.message);
    }
  };

  socket.on("create-conversation", createConversation);
  socket.on("get-all-conversations", getAllConversation);
};
