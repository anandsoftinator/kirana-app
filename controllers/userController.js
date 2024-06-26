const { getSupabaseClient } = require("../db/connect");
const { StatusCodes } = require("http-status-codes");
const { CustomAPIError } = require("../errors");
const { storeImage } = require("../utils/fileUpload");

// Initialize the Supabase client
const supabase = getSupabaseClient();

const handleGetAllUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data, error } = await supabase
    .from("user")
    .select("*", { count: "exact" })
    .range(start, end);

  if (error) {
    throw new CustomAPIError(`Error occured : ${error.message}`);
  }

  res.status(StatusCodes.OK).json({ message: "success", data: data });
};

const handleGetUserByID = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("user")
    .select("*")
    .eq("uuid", id)
    .single();

  if (!data) {
    throw new CustomAPIError(`No user with id : ${req.params.id}`);
  }

  if (error) {
    throw new CustomAPIError(`Error occured : ${error.message}`);
  }

  res.status(StatusCodes.OK).json({ message: "success", data: data });
};

const handleUpdateUserByID = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const imageFile = req.file;

  if (!id || !updateData) {
    throw new CustomAPIError("Invalid request data", StatusCodes.BAD_REQUEST);
  }

  const validFields = [
    "name",
    "phone_number",
    "address",
    "latitude",
    "longitude",
    "status",
    "last_online_at",
  ];
  const updateFields = Object.keys(updateData).filter((key) =>
    validFields.includes(key)
  );
  const validUpdateData = updateFields.reduce((obj, key) => {
    obj[key] = updateData[key];
    return obj;
  }, {});

  if (imageFile) {
    validUpdateData.userImage = await storeImage(imageFile, "UserImages");
  }

  if (Object.keys(validUpdateData).length === 0) {
    throw new CustomAPIError(
      "No valid fields to update",
      StatusCodes.BAD_REQUEST
    );
  }

  const { data, error } = await supabase
    .from("user")
    .update(validUpdateData)
    .eq("uuid", id)
    .select();

  if (error) {
    console.error("Supabase error:", error);
    throw new CustomAPIError(
      `Error occurred: ${error.message}`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  res.status(StatusCodes.OK).json({ message: "success", data });
};

const handleDeleteUserByID = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("user").delete().eq("uuid", id);

  if (error) {
    throw new CustomAPIError(`Error occured : ${error.message}`);
  }

  res.status(StatusCodes.OK).json({ message: "success", data, errors: false });
};

module.exports = {
  handleGetAllUsers,
  handleGetUserByID,
  handleUpdateUserByID,
  handleDeleteUserByID,
};
