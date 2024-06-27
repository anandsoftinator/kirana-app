const { v4: uuidv4 } = require("uuid");
const { getSupabaseClient } = require("../db/connect");
const CustomError = require("../errors");
const supabase = getSupabaseClient();

const storeImage = async (imageFile, type = "Order") => {
  const uniqueFilename = `${uuidv4()}-${imageFile.originalname}`;

  const validType = ["Order", "Logo", "UserImages", "Post"];

  if (!validType.includes(type)) {
    throw new CustomError.CustomAPIError(`Not valid type storage`);
  }

  const { data, error: uploadError } = await supabase.storage
    .from(type)
    .upload(`/${uniqueFilename}`, imageFile.buffer, {
      contentType: imageFile.mimetype,
    });

  if (uploadError) {
    throw new CustomError.CustomAPIError(
      `Error uploading image: ${uploadError.message}`
    );
  }

  const publicUrl = `${process.env.SUPABASE_PROJECT_URL}/storage/v1/object/public/${type}/${uniqueFilename}`;
  return publicUrl;
};

module.exports = { storeImage };
