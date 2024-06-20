const { StatusCodes } = require("http-status-codes");
const { CustomAPIError, UnauthenticatedError } = require("../errors");
const { v4: uuidv4 } = require("uuid");
const {
  encryptPassword,
  isPasswordValid,
  isPasswordCorrect,
  createJWT,
} = require("../utils");
const validator = require("validator");
const { getSupabaseClient } = require("../db/connect");
const { blacklistToken } = require("../utils/jwt");

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

const login = async (req, res) => {
  const { phone_number, password } = req.body;

  if (!phone_number || !password) {
    throw new CustomAPIError("Please provide phone number and password");
  }

  const { data, error } = await supabase
    .from("user")
    .select(
      "uuid, phone_number, name, address, status, last_online_at, password, role"
    )
    .eq("phone_number", phone_number)
    .single();

  if (!isPasswordCorrect(password, data.password) || error) {
    throw new UnauthenticatedError("Invalid Credentials");
  }

  const token = createJWT({
    uuid: data.uuid,
    phone_number: phone_number,
    name: data.name,
    role: data.role,
  });

  const { password: _, role, ...userInfo } = data;

  res.status(StatusCodes.OK).json({
    message: "success",
    user: userInfo,
    error: false,
    token,
    error: false,
  });
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
  login,
  logout,
  updateUserRole,
};
