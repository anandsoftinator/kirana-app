const { userSockets } = require("../db/connect");

const getSocketIds = async (receiverUUID) => {
  let array = await userSockets.get(receiverUUID);
  if (array) {
    return new Set(array);
  }
  return undefined;
};

const getAllUsers = () => {
  return new Set(Array.from(userSockets.keys()));
};

const removeUser = (val) => {
  for (const [key, value] of userSockets) {
    if (value.length == 1 && value[0] === val) {
      userSockets.delete(key);
    } else if (value.includes(val)) {
      const filteredArray = value.filter((num) => num !== val);
      userSockets.set(key, filteredArray);
    }
  }
};

module.exports = { removeUser, getAllUsers, getSocketIds };
