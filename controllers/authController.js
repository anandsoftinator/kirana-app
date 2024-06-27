const { StatusCodes } = require("http-status-codes");
const { CustomAPIError, UnauthenticatedError } = require("../errors");
const { v4: uuidv4 } = require("uuid");
const {
  encryptPassword,
  isPasswordValid,
  isPasswordCorrect,
  createJWT,
  storeImage,
} = require("../utils");
const validator = require("validator");
const { getSupabaseClient } = require("../db/connect");
const { blacklistToken } = require("../utils/jwt");
const { reverseGeocodeCoordinates } = require("../utils/externalCall");

const supabase = getSupabaseClient();

const register = async (req, res) => {
  const { name, phone_number, password, address, latitude, longitude } =
    req.body;

  if (
    !phone_number ||
    !validator.isMobilePhone(phone_number, "any", { strictMode: false })
  ) {
    throw new CustomAPIError("Invalid phone number");
  }

  if (phone_number.length !== 10 || !/^\d{10}$/.test(phone_number)) {
    return res
      .status(400)
      .json({ error: "Phone number must be 10 digits long." });
  }

  if (!password || !isPasswordValid(password)) {
    throw new CustomAPIError(
      "Password must contain 8-16 characters, including at least one uppercase letter, one lowercase letter, one number, and one special character. No spaces allowed."
    );
  }

  const { data: existingUser, error: userLookupError } = await supabase
    .from("user")
    .select("*")
    .eq("phone_number", phone_number)
    .maybeSingle();

  if (userLookupError) {
    throw new CustomAPIError(`Error looking up user!`);
  }

  if (existingUser) {
    throw new CustomAPIError(`User already exists with this phone number!`);
  }

  const hashedPassword = await encryptPassword(password);
  let userData = {
    uuid: uuidv4(),
    name: name,
    phone_number: phone_number,
    password: hashedPassword,
    address,
    latitude: latitude != null ? latitude.toString : "0.0",
    longitude: longitude != null ? longitude.toString : "0.0",
    status: "active",
    last_online_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user")
    .insert([userData])
    .select();

  if (error) {
    throw new CustomAPIError(`Registration Failed!`);
  }

  const token = createJWT({
    uuid: data.uuid,
    phone_number: phone_number,
    name: data.name,
  });

  const { password: _, ...userInfo } = userData;
  res
    .status(StatusCodes.OK)
    .json({ message: "success", data: userInfo, token, error: false });
};

const registerShop = async (req, res) => {
  const {
    shop_name,
    phone_number,
    address,
    category,
    latitude,
    longitude,
    password,
  } = req.body;
  const imageFile = req.file;

  if (
    !phone_number ||
    !validator.isMobilePhone(phone_number, "any", { strictMode: false })
  ) {
    throw new CustomAPIError("Invalid phone number");
  }

  if (phone_number.length !== 10 || !/^\d{10}$/.test(phone_number)) {
    return res
      .status(400)
      .json({ error: "Phone number must be 10 digits long." });
  }

  if (!password || !isPasswordValid(password)) {
    throw new CustomAPIError(
      "Password must contain 8-16 characters, including at least one uppercase letter, one lowercase letter, one number, and one special character. No spaces allowed."
    );
  }

  let newAddress = async () => {
    if (latitude && longitude) {
      return await reverseGeocodeCoordinates(latitude, longitude);
    }
    if (address) {
      return address.trim();
    }
    return null;
  };

  const { data: existingUser, error: userLookupError } = await supabase
    .from("shop")
    .select("*")
    .eq("phone_number", phone_number)
    .maybeSingle();

  if (userLookupError) {
    throw new CustomAPIError(`Error looking up user!`);
  }

  if (existingUser) {
    throw new CustomAPIError(`User already exists with this phone number!`);
  }
  const hashedPassword = await encryptPassword(password);

  let imageUrl = null;
  if (imageFile) {
    imageUrl = await storeImage(imageFile, "Logo");
  }

  let shopData = {
    uuid: uuidv4(),
    shop_name: shop_name,
    phone_number: phone_number,
    address: await newAddress(),
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    category,
    logo: imageUrl,
    status: "active",
    last_online_at: new Date().toISOString(),
    password: hashedPassword,
  };

  const { data, error } = await supabase
    .from("shop")
    .insert([shopData])
    .select();

  if (error) {
    throw new CustomAPIError(`An error occurred ${error.message}`);
  }

  const token = createJWT({
    uuid: data.uuid,
    phone_number: phone_number,
    name: data.shop_name,
  });

  const { password: _, ...userInfo } = data;
  res
    .status(StatusCodes.OK)
    .json({ message: "success", data: userInfo, token, error: false });
};

const login = async (req, res) => {
  const { phone_number, password } = req.body;

  if (!phone_number || !password) {
    throw new CustomAPIError("Please provide phone number and password");
  }

  const { data, error } = await supabase
    .from("user")
    .select(
      "uuid, phone_number, name, address, status, last_online_at, password, role, userImage"
    )
    .eq("phone_number", phone_number)
    .maybeSingle();

  if (error) {
    throw new CustomAPIError(
      `Error occured while retrieving information ${error.message}`
    );
  }

  if (!data) {
    throw new CustomAPIError("Invalid credentials");
  }

  const passCheck = await isPasswordCorrect(password, data.password);
  if (!passCheck) {
    throw new UnauthenticatedError("Password is incorrect");
  }

  const token = createJWT({
    uuid: data.uuid,
    phone_number: phone_number,
    name: data.name,
    role: data.role,
  });

  const { password: _, ...userInfo } = data;

  res.status(StatusCodes.OK).json({
    message: "success",
    user: userInfo,
    error: false,
    token,
    error: false,
  });
};

const shopLogin = async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Please provide phone number and password" });
    }

    const { data, error } = await supabase
      .from("shop")
      .select(
        "uuid, phone_number, shop_name, address, status, last_online_at, password, logo, category, latitude, longitude"
      )
      .eq("phone_number", phone_number)
      .maybeSingle();

    if (error) {
      throw new CustomAPIError(
        `Error occurred while retrieving information: ${error.message}`
      );
    }

    if (!data) {
      throw new CustomAPIError(`Invalid credentials`);
    }

    const isPasswordValid = await isPasswordCorrect(password, data.password);
    if (!isPasswordValid) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "Invalid Credentials" });
    }

    const token = createJWT({
      uuid: data.uuid,
      phone_number: data.phone_number,
      name: data.shop_name,
      role: "shop",
    });

    const { password: _, ...userInfo } = data;

    res.status(StatusCodes.OK).json({
      message: "success",
      shop: userInfo,
      error: false,
      token,
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: err.message,
      error: true,
    });
  }
};

const logout = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid token", error: true });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid token", error: true });
  }

  blacklistToken(token);

  res
    .status(StatusCodes.OK)
    .json({ message: "user logged out!", error: false });
};

const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !["admin", "superadmin"].includes(role)) {
    throw new UnauthorizedError("You are not authorized to update roles");
  }

  const { data, error } = await supabase
    .from("user")
    .update({ role })
    .eq("uuid", id);

  if (error) {
    throw new CustomAPIError(
      `Error occurred: ${error.message}`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  res
    .status(StatusCodes.OK)
    .json({ message: "User role updated successfully", data });
};

module.exports = {
  register,
  registerShop,
  login,
  logout,
  updateUserRole,
  shopLogin,
};
