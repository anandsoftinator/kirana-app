const { v4: uuidv4 } = require("uuid");
const { getSupabaseClient } = require("../db/connect");
const CustomError = require("../errors");
const supabase = getSupabaseClient();

const storeImage = async (imageFile) => {
  const uniqueFilename = `${uuidv4()}-${imageFile.originalname}`;
  const imagePath = `Order/${uniqueFilename}`;

  const { data, error: uploadError } = await supabase.storage
    .from("Order")
    .upload(imagePath, imageFile.buffer, {
      contentType: imageFile.mimetype,
    });

  if (uploadError) {
    throw new CustomError.CustomAPIError(
      `Error uploading image: ${uploadError.message}`
    );
  }

  const publicUrl = `${process.env.SUPABASE_PROJECT_URL}/storage/v1/object/public/${imagePath}`;
  return publicUrl;
};

module.exports = { storeImage };
