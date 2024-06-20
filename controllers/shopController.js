const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { storeImage } = require("../utils");
const { getSupabaseClient } = require("../db/connect");
const { v4: uuidv4 } = require("uuid");

const supabase = getSupabaseClient();

const handleUploadOrderImage = async (req, res) => {
  const imageFile = req.file;
  if (!imageFile) {
    throw new CustomError.CustomAPIError(`No image file provided.`);
  }
  const imageUrl = await storeImage(imageFile);
  res.status(StatusCodes.CREATED).json({ message: "success", data: imageUrl });
};

const handleGetCategories = async (req, res) => {
  let { data, error } = await supabase.from("categories").select("*");
  if (error) {
    throw new CustomError.CustomAPIError(`Error occured : ${error}`);
  }
  res.status(StatusCodes.OK).json({ message: "success", data });
};

const handleAddCategory = async (req, res) => {
  const { category } = req.body;

  let { data: existingCategories, error: selectError } = await supabase
    .from("categories")
    .select("category")
    .ilike("category", category.trim());

  if (selectError) {
    throw new CustomError.CustomAPIError(`Error occured : ${selectError}`);
  }

  if (existingCategories.length > 0) {
    throw new CustomError.CustomAPIError(`Category already exists!`);
  }

  let { data: newCategory, error: insertError } = await supabase
    .from("categories")
    .insert([{ category: category.trim() }]);

  if (insertError) {
    throw new CustomError.CustomAPIError(`Error occured : ${insertError}`);
  }

  res.status(StatusCodes.OK).json({ messafe: "success", data: newCategory });
};

const handleGetAllShops = async (req, res) => {
  const { data, error } = await supabase.from("shop").select("*");
  if (error) {
    throw new CustomError.CustomAPIError(`An error occured: ${error}`);
  }
  if (data.length == 0) {
    throw new CustomError.NotFoundError(`No shop found`);
  }
  res.status(StatusCodes.OK).json({ message: "Success", data: data });
};

const handleGetShopByID = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("shop")
    .select("*")
    .eq("uuid", id)
    .single();

  if (error) {
    throw new CustomError.CustomAPIError(`An error occured: ${error}`);
  }

  res.status(StatusCodes.OK).json({ message: "Success", data: data });
};

const handleUpdateShopByID = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("shop")
    .update(req.body)
    .eq("uuid", id);

  if (error) {
    throw new CustomError.CustomAPIError(`An error occured: ${error}`);
  }
  res.status(StatusCodes.OK).json({ message: "Success", data: data });
};

const handleDeleteShopByID = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("shop").delete().eq("uuid", id);

  if (error) {
    throw new CustomError.CustomAPIError(`An error occured: ${error}`);
  }
  res.status(StatusCodes.OK).json({ message: "Success", data: data });
};

const handleCreateNewShop = async (req, res) => {
  const { name, phone_number, address, category, latitude, longitude } =
    req.body;
  const imageFile = req.file;

  let newAddress = async () => {
    if (latitude && longitude) {
      return await reverseGeocodeCoordinates(latitude, longitude);
    }
    if (address) {
      return address.trim();
    }
    return null;
  };
  const imageUrl = await storeImage(imageFile);

  let userData = {
    uuid: uuidv4(),
    shop_name: name,
    phone_number: phone_number,
    newAddress: await newAddress(),
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    category,
    logo: imageUrl,
    status: "active",
    last_online_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("shop").insert([userData]);

  if (error) {
    throw new CustomError.CustomAPIError(`An error occured: ${error}`);
  }

  res.status(StatusCodes.OK).json({ message: "Success", data: data });
};

const handleFindShowByPhone = async (req, res) => {
  const { phone_number } = req.body;
  const { data, error } = await supabase
    .from("shop")
    .select(
      "uuid, shop_name, logo, phone_number, category, address, last_online_at, status, password"
    )
    .eq("phone_number", phone_number)
    .single();

  if (error) {
    throw new CustomError.CustomAPIError(`An error occured: ${error}`);
  }
  res.status(StatusCodes.OK).json({ message: "Success", data: data });
};

module.exports = {
  handleUploadOrderImage,
  handleGetCategories,
  handleAddCategory,
  handleGetAllShops,
  handleGetShopByID,
  handleUpdateShopByID,
  handleDeleteShopByID,
  handleCreateNewShop,
  handleFindShowByPhone,
};
