const { StatusCodes } = require("http-status-codes");
const { CustomAPIError } = require("../errors");
const { storeImage } = require("../utils");
const { getSupabaseClient } = require("../db/connect");

const supabase = getSupabaseClient();

const handleUploadOrderImage = async (req, res) => {
  const imageFile = req.file;
  if (!imageFile) {
    throw new CustomAPIError(`No image file provided.`);
  }
  const imageUrl = await storeImage(imageFile);
  res.status(StatusCodes.CREATED).json({ message: "success", data: imageUrl });
};

const handleGetCategories = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const start = limit ? (page - 1) * limit : null;
  const end = limit ? start + limit - 1 : null;
  const search = req.query.search || "";

  const fields = ["category"];

  let query = supabase.from("categories").select("*", { count: "exact" });

  if (start !== null && end !== null) {
    query = query.range(start, end);
  }

  if (search) {
    const conditions = fields
      .map((field) => `${field}.ilike.%${search}%`)
      .join(",");
    query = query.or(conditions);
  }

  const { data, error } = await query;

  if (error) {
    throw new CustomAPIError(`Error occured : ${error.message}`);
  }
  res.status(StatusCodes.OK).json({ message: "success", data: data });
};

const handleAddCategory = async (req, res) => {
  const { category } = req.body;

  if (!category) {
    throw new CustomAPIError(`Category should be specified`);
  }

  let { data: existingCategories, error: selectError } = await supabase
    .from("categories")
    .select("category")
    .ilike("category", category.trim());

  if (selectError) {
    throw new CustomAPIError(`Error occured : ${selectError.message}`);
  }

  if (existingCategories.length > 0) {
    throw new CustomAPIError(`Category already exists!`);
  }

  let { data: newCategory, error: insertError } = await supabase
    .from("categories")
    .insert([{ category: category.trim() }]);

  if (insertError) {
    throw new CustomAPIError(`Error occured : ${insertError.message}`);
  }

  res.status(StatusCodes.OK).json({ message: "success", data: newCategory });
};

const handleGetAllShops = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const start = limit ? (page - 1) * limit : null;
  const end = limit ? start + limit - 1 : null;
  const search = req.query.search || "";

  const fields = ["shop_name", "phone_number", "status", "address", "category"];

  let query = supabase.from("shop").select("*", { count: "exact" });

  if (start !== null && end !== null) {
    query = query.range(start, end);
  }

  if (search) {
    const conditions = fields
      .map((field) => `${field}.ilike.%${search}%`)
      .join(",");
    query = query.or(conditions);
  }

  const { data, error } = await query;

  if (error) {
    throw new CustomAPIError(`Error occured : ${error.message}`);
  }
  res.status(StatusCodes.OK).json({ message: "success", data: data });
};

const handleGetShopByID = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("shop")
    .select("*")
    .eq("uuid", id)
    .single();

  if (error) {
    throw new CustomAPIError(`An error occured: ${error.message}`);
  }

  res.status(StatusCodes.OK).json({ message: "Success", data: data });
};

const handleUpdateShopByID = async (req, res) => {
  const { id } = req.params;
  const { phone_number } = req.body;
  const imageFile = req.file;

  if (
    phone_number &&
    !validator.isMobilePhone(phone_number, "any", { strictMode: false })
  ) {
    throw new CustomAPIError("Invalid phone number");
  }

  if (
    phone_number &&
    (phone_number.length !== 10 || !/^\d{10}$/.test(phone_number))
  ) {
    throw new CustomAPIError("Phone number must be 10 digits long.");
  }

  let imageUrl = null;
  if (imageFile) {
    imageUrl = await storeImage(imageFile, "Logo");
  }
  console.log("check here", req.body, imageUrl, imageFile);
  let shopData = {
    logo: imageUrl,
    ...req.body,
  };

  const { data, error } = await supabase
    .from("shop")
    .update(shopData)
    .eq("uuid", id);

  if (error) {
    throw new CustomAPIError(`An error occured: ${error.message}`);
  }
  res.status(StatusCodes.OK).json({ message: "Success", data: data });
};

const handleDeleteShopByID = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("shop").delete().eq("uuid", id);

  if (error) {
    throw new CustomAPIError(`An error occured: ${error.message}`);
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
    throw new CustomAPIError(`An error occured: ${error.message}`);
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
  handleFindShowByPhone,
};
