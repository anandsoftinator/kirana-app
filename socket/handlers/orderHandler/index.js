const { getSupabaseClient } = require("../../../db/connect");
const { getSocketIds } = require("../../../utils");
const supabase = getSupabaseClient();

module.exports = (io, socket) => {
  const changeOrderStatus = async ({ orderUUID, userUUID, status }) => {
    try {
      const { data: updateData, error: updateError } = await supabase
        .from("orders")
        .update({ status: status })
        .eq("uuid", orderUUID)
        .select();

      if (updateError) {
        throw new Error(updateError.message);
      }

      const receiverIds = await getSocketIds(userUUID);
      if (receiverIds) {
        receiverIds.forEach((receiverId) => {
          socket
            .to(receiverId)
            .emit("order-status-confirm", { data: updateData[0] });
        });
      }
      socket.emit("order-status-confirm", { data: updateData[0] });
    } catch (error) {
      console.error("Error: order-status", error.message);
    }
  };

  socket.on("order-status", changeOrderStatus);
};
