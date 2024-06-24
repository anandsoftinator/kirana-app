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
      const receiverIds = await getSocketIds(receiverUUID);
      console.log("invoked....");
      if (receiverIds) {
        receiverIds.forEach((receiverId) => {
          console.log("inside...");
          io.to(receiverId.toString()).emit("get-message", { data });
        });
      }
      socket.emit("get-message", { data });
    } catch (error) {
      console.error("Error: send-message", error.message);
    }
  };

  socket.on("send-message", sendGetMessage);
};
