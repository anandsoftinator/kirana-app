const registerOrderHandlers = require("./handlers/registerHandler.js");

const userSockets = new Map();

const onConnection = (socket) => {
  console.log(`A user connected with id ${socket.id}`);

  registerOrderHandlers(io.socket, userSockets);

  socket.on("disconnect", () => {
    console.log(`A user disconnected with id ${socket.id}`);
  });
};

const createUniqueId = (id1, id2) => {
  return [id1, id2].sort().join("-"); // Ensure consistent ordering
};

const checkConnection = async (connectionKey) => {
  const { data: existingConnection, error: connectionLookupError } =
    await supabase
      .from("chat")
      .select("*")
      .eq("connectionKey", connectionKey)
      .maybeSingle();
  return existingConnection;
};

const getConversations = async (userUUID) => {
  try {
    const { data: chatData, error: chatError } = await supabase
      .from("chat")
      .select("*")
      .or(`shopUUID.eq.${userUUID},userUUID.eq.${userUUID}`);

    if (chatError) {
      console.error("Error fetching getConversations:", chatError);
      return [];
    }

    // Filter out chats with no messages
    const filteredChatData = await Promise.all(
      chatData.map(async (chat) => {
        const { data: userData, error: userError } = await supabase
          .from("user")
          .select("name, userImage")
          .eq("uuid", chat.userUUID)
          .single();

        if (userError) {
          console.error("Error fetching user data:", userError);
        }

        if (userData) {
          chat.userName = userData.name;
          chat.userImage = userData.userImage;
        }

        const { data: messages, error: messageError } = await supabase
          .from("messages")
          .select("text, created_at, type, messageType")
          .eq("chat_uuid", chat.uuid)
          .order("created_at", { ascending: false })
          .limit(1);

        if (messageError) {
          console.error("Error fetching the last message:", messageError);
          return null;
        }

        const message = messages[0];
        if (!message) {
          // No messages found, skip this chat
          return null;
        }

        // Update chat object with data from last message
        chat.lastMessage = message.text;
        chat.lastMessageDateTime = message.created_at;
        chat.type = message.type;
        chat.messageType = message.messageType;

        return chat;
      })
    );

    // Remove null entries (chats with no messages)
    const updatedChatData = filteredChatData.filter((chat) => chat !== null);

    return updatedChatData;
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
};

const getConversationsByID = async (userUUID, shopUUID) => {
  try {
    const { data: chatData, error: chatError } = await supabase
      .from("chat")
      .select("*")
      .eq("shopUUID", shopUUID)
      .eq("userUUID", userUUID)
      .single();

    if (chatError) {
      console.error("Error fetching getConversationsByID:", chatError);
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("user")
      .select("name, userImage")
      .eq("uuid", chatData.userUUID)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError);
    }

    if (userData) {
      chatData.userName = userData.name;
      chatData.userImage = userData.userImage;
    }

    const { data: messages, error: messageError } = await supabase
      .from("messages")
      .select("text, created_at, type, messageType")
      .eq("chat_uuid", chatData.uuid)
      .order("created_at", { ascending: false })
      .limit(1);

    if (messageError) {
      console.error("Error fetching the last message:", messageError);
    }

    const message = messages[0] || null;
    if (message) {
      chatData.lastMessage = message.text;
      chatData.lastMessageDateTime = message.created_at;
      chatData.type = message.type;
      chatData.messageType = message.messageType;
    }

    return chatData;
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
};

const getChatByUUID = async (uuid) => {
  const { data: existingConnection, error: connectionLookupError } =
    await supabase.from("chat").select("*").eq("uuid", uuid).maybeSingle();
  return existingConnection;
};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("establish_connection", async ({ shopUUID, userUUID }) => {
    const connectionKey = createUniqueId(shopUUID, userUUID);
    // Check if user already exists
    const existingConnection = await checkConnection(connectionKey);

    if (existingConnection) {
      socket.emit("connection_status", {
        status: "Existing connection",
        existingConnection: existingConnection,
      });
    } else {
      const roomId = uuid.v4();
      const { data, error } = await supabase
        .from("chat")
        .insert([
          {
            uuid: roomId,
            shopUUID: shopUUID,
            userUUID: userUUID,
            connectionKey: connectionKey,
          },
        ])
        .select();

      const existingConnection = await checkConnection(connectionKey);
      if (error) {
        console.log("Error inserting into Supabase:", error);
      }

      socket.emit("connection_status", {
        status: "New connection",
        existingConnection: existingConnection,
      });
    }
  });

  socket.on("join_room_orders", async ({ joinUser, connectionPage }) => {
    userSockets.set(joinUser, {
      SocketID: socket.id,
      connectionPage: connectionPage,
    });
  });

  socket.on(
    "join_room",
    async ({ connectionKey, joinUser, connectionPage }) => {
      let room = null;
      let roomId = null;
      let shopUUID = null;
      let userUUID = null;
      let active = null;

      userSockets.set(joinUser, {
        SocketID: socket.id,
        connectionPage: connectionPage,
      });

      let connection = getChatByUUID(connectionKey);

      await connection
        .then((dataReceived) => {
          roomId = dataReceived.uuid;
          shopUUID = dataReceived.shopUUID;
          userUUID = dataReceived.userUUID;
          active = dataReceived.active;
        })
        .catch((error) => {
          console.error("Error:", error);
        });

      room = {
        roomId,
        members: new Set([shopUUID, userUUID]),
        active: active,
        shopUUID,
        userUUID,
      };

      room.members.add(joinUser);
      socket.join(roomId);

      if (room.members.size === 2) {
        room.active = true;
        await connection
          .then(async (dataReceived) => {
            try {
              const { data: updateData, error: updateError } = await supabase
                .from("chat")
                .update({ active: true })
                .eq("id", dataReceived.id)
                .select();

              if (updateError) {
                console.error("Update failed:", updateError);
                return;
              }
              updateConnection = updateData[0];
            } catch (error) {
              console.error("Error:", error);
            }
          })
          .catch((error) => {
            console.error("Error:", error);
          });

        io.to(roomId).emit(
          "room_joined",
          "Chat is now active. Both members have joined the room."
        );
      } else {
        socket.emit("room_joined", "Chat is already active.");
      }
      return;
    }
  );

  socket.on(
    "send_message",
    async ({
      roomId,
      message,
      senderUUID,
      receiverUUID,
      type,
      messageType,
    }) => {
      // Find the connection key for the given roomId
      let room = null;
      let shopUUID = null;
      let userUUID = null;
      let active = null;

      let connection = getChatByUUID(roomId);
      await connection
        .then((dataReceived) => {
          roomId = dataReceived.uuid;
          shopUUID = dataReceived.shopUUID;
          userUUID = dataReceived.userUUID;
          active = dataReceived.active;
        })
        .catch((error) => {
          console.error("Error:", error);
        });

      room = {
        roomId,
        members: new Set([shopUUID, userUUID]),
        active: active,
        shopUUID,
        userUUID,
      };

      if (room && room.active) {
        const { data: insertedData, error: insertError } = await supabase
          .from("messages")
          .insert([
            {
              chat_uuid: roomId,
              created_at: new Date().toISOString(),
              text: message,
              senderUUID: senderUUID,
              receiverUUID: receiverUUID,
              messageType: messageType,
              type: type,
            },
          ])
          .select("*")
          .single();

        if (insertError) {
          console.error("Insertion failed:", insertError);
          return;
        }

        const senderSocketJson = userSockets.get(senderUUID);
        if (senderSocketJson) {
          io.to(senderSocketJson.SocketID).emit("sender_message", {
            message: "success",
            senderData: insertedData,
          });
        } else {
          console.error("Sender UUID not found in userSockets map");
        }

        socket.to(roomId).emit("receive_message", {
          message: "success",
          receiveData: insertedData,
        });

        let conversations = getConversationsByID(userUUID, shopUUID);
        userSockets.forEach((value, key) => {
          if (value.connectionPage === "Orders" && key == shopUUID) {
            conversations
              .then((conversationsData) => {
                socket.to(value.SocketID).emit("get_conversations", {
                  message: "success",
                  conversationsData: conversationsData,
                });
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }
        });
      } else {
        socket.emit("error", "Chat not active or room does not exist.");
      }
    }
  );

  socket.on(
    "send_message_order",
    async ({
      roomId,
      message,
      senderUUID,
      receiverUUID,
      type,
      messageType,
    }) => {
      const messageObj = JSON.parse(message);

      let room = null;
      let shopUUID = null;
      let userUUID = null;
      let active = null;

      let connection = getChatByUUID(roomId);
      await connection
        .then((dataReceived) => {
          roomId = dataReceived.uuid;
          shopUUID = dataReceived.shopUUID;
          userUUID = dataReceived.userUUID;
          active = dataReceived.active;
        })
        .catch((error) => {
          console.error("Error:", error);
        });

      room = {
        roomId,
        members: new Set([shopUUID, userUUID]),
        active: active,
        shopUUID,
        userUUID,
      };

      if (room && room.active) {
        const { data: insertedData, error: insertError } = await supabase
          .from("messages")
          .insert([
            {
              chat_uuid: roomId,
              created_at: new Date().toISOString(),
              text: messageObj,
              senderUUID: senderUUID,
              receiverUUID: receiverUUID,
              messageType: messageType,
              type: type,
            },
          ])
          .select("*")
          .single();

        if (insertError) {
          console.error("Insertion failed:", insertError);
          return;
        }

        const senderSocketJson = userSockets.get(senderUUID);
        if (senderSocketJson) {
          io.to(senderSocketJson.SocketID).emit("sender_message", {
            message: "success",
            senderData: insertedData,
          });
        } else {
          console.error("Sender UUID not found in userSockets map");
        }

        socket.to(roomId).emit("receive_message", {
          message: "success",
          receiveData: insertedData,
        });

        let conversations = getConversationsByID(userUUID, shopUUID);
        userSockets.forEach((value, key) => {
          if (value.connectionPage === "Orders" && key == shopUUID) {
            conversations
              .then((conversationsData) => {
                socket.to(value.SocketID).emit("get_conversations", {
                  message: "success",
                  conversationsData: conversationsData,
                });
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }
        });
      } else {
        socket.emit("error", "Chat not active or room does not exist.");
      }
    }
  );

  socket.on("get_all_conversations", async ({ userUUID }) => {
    let conversations = getConversations(userUUID);
    await conversations
      .then((conversationsData) => {
        socket.emit("get_all_conversations", {
          message: "success",
          chatData: conversationsData,
        });
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });

  socket.on("get_all_messages", async ({ chatUUID }) => {
    const { data: messageData, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_uuid", chatUUID)
      .order("created_at", { ascending: false });

    if (messageError) {
      console.error("Error fetching get_all_messages:", messageError);
      return;
    }
    socket.emit("get_all_messages", {
      message: "success",
      messageData: messageData,
    });
  });

  socket.on("order_status_changed", async ({ ID, status, roomId }) => {
    console.log(ID, status, roomId);
    const { data: updateData, error: updateError } = await supabase
      .from("messages")
      .update({ status: status })
      .eq("id", ID)
      .select();
    if (updateError) {
      console.error("Update failed:", updateError);
      return;
    } else {
      console.log(updateData);
      socket.to(roomId).emit("update_message", {
        message: "success",
        updateMessage: updateData,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    userSockets.forEach((value, key) => {
      if (value === socket.id) {
        console.log(`User ${key} disconnected and removed from map`);
        userSockets.delete(key);
      }
    });
  });
});

module.exports = onConnection;
