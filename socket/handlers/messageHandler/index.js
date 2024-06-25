const { getSupabaseClient } = require("../../../db/connect");
const { getSocketIds } = require("../../../utils");

const supabase = getSupabaseClient();

module.exports = (io, socket) => {
  const sendGetMessage = async ({
    convId,
    message,
    senderUUID,
    receiverUUID,
    type,
    imageUrl = null,
  }) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            conv_uuid: convId,
            created_at: new Date().toISOString(),
            text: message,
            senderUUID: senderUUID,
            receiverUUID: receiverUUID,
            type: type,
            image: imageUrl,
            status: "Pending",
          },
        ])
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

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
          .eq("uuid", convId);

      if (conversationError) {
        throw new Error(conversationError.message);
      }

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("conv_uuid", convId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (messageError) {
        throw new Error(messageError.message);
      }
      conversationData[0].lastMessage = messageData;

      const receiverIds = await getSocketIds(receiverUUID);
      if (receiverIds) {
        receiverIds.forEach((receiverId) => {
          socket.to(receiverId.toString()).emit("get-message", { data });
          socket
            .to(receiverId.toString())
            .emit("get-conversation", { data: conversationData });
        });
      }
      socket.emit("get-conversation", { data: conversationData });
      socket.emit("get-message", { data });
    } catch (error) {
      console.error("Error: send-message", error.message);
    }
  };

  const getAllMessages = async ({ convId }) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conv_uuid", convId);

      if (error) {
        throw new Error(error.message);
      }
      socket.emit("all-messages", { data });
    } catch (error) {
      console.error("Error: send-message", error.message);
    }
  };

  socket.on("send-message", sendGetMessage);
  socket.on("get-all-messages", getAllMessages);
};
