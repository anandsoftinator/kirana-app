const { getSupabaseClient } = require("../../../db/connect");
const { getSocketIds } = require("../../../utils");
const { v4: uuidv4 } = require("uuid");
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
      let msgData = null;
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            conv_uuid: convId,
            created_at: new Date().toISOString(),
            text: type == "order" ? "" : message,
            senderUUID: senderUUID,
            receiverUUID: receiverUUID,
            type: type,
            image: type == "order" ? null : imageUrl,
            status: "Pending",
          },
        ])
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      msgData = data;

      if (type === "order") {
        const { order, type } = JSON.parse(message);
        console.log("data", order, type);
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert([
            {
              uuid: uuidv4(),
              name: order,
              type: type,
              status: false,
              msg_id: msgData.id,
              image: type === "image" ? order : "",
            },
          ])
          .select("*")
          .single();

        if (orderError) {
          console.log("order", orderError.message);
          throw new Error(orderError.message);
        }
        msgData = { ...msgData, orderData: orderData };
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

      conversationData[0].lastMessage = msgData;

      const receiverIds = await getSocketIds(receiverUUID);
      if (receiverIds) {
        receiverIds.forEach((receiverId) => {
          socket
            .to(receiverId.toString())
            .emit("get-message", { data: msgData });
          socket
            .to(receiverId.toString())
            .emit("get-conversation", { data: conversationData[0] });
        });
      }
      socket.emit("get-conversation", { data: conversationData[0] });
      socket.emit("get-message", { data: msgData });
    } catch (error) {
      console.error("Error: send-message", error.message);
    }
  };

  const getAllMessages = async ({ convId }) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          orders (
            id,
            created_at,
            uuid,
            name,
            type,
            status,
            msg_id,
            image
          )
        `
        )
        .eq("conv_uuid", convId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      console.log("data here is", data);

      const messages = data.map((message) => {
        const orderData =
          message.orders.length > 0
            ? {
                id: message.orders[0].id,
                created_at: message.orders[0].created_at,
                uuid: message.orders[0].uuid,
                name: message.orders[0].name,
                type: message.orders[0].type,
                status: message.orders[0].status,
                msg_id: message.orders[0].msg_id,
                image: message.orders[0].image,
              }
            : null;

        return {
          id: message.id,
          created_at: message.created_at,
          conv_uuid: message.conv_uuid,
          senderUUID: message.senderUUID,
          receiverUUID: message.receiverUUID,
          text: message.text,
          type: message.type,
          image: message.image,
          status: message.status,
          orderData,
        };
      });
      socket.emit("all-messages", { data: messages });
    } catch (error) {
      console.error("Error: send-message", error.message);
    }
  };

  socket.on("send-message", sendGetMessage);
  socket.on("get-all-messages", getAllMessages);
};
