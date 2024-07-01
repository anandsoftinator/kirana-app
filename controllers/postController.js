const { StatusCodes } = require("http-status-codes");
const { CustomAPIError } = require("../errors");
const { storeImage } = require("../utils");
const { getSupabaseClient } = require("../db/connect");
const { v4: uuidv4 } = require("uuid");

const supabase = getSupabaseClient();

const handleGetAllPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const start = limit ? (page - 1) * limit : null;
  const end = limit ? start + limit - 1 : null;
  const search = req.query.search || "";

  const fields = ["description"];

  let query = supabase.from("posts").select("*", { count: "exact" });

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

const handleGetPostByID = async (req, res) => {
  const { id } = req.params;
  const { uuid } = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const offset = (page - 1) * limit;

  if (!uuid) {
    throw new CustomAPIError("uuid not provided");
  }
  const { data, error } = await supabase.rpc(
    "get_posts_with_likes_and_user_liked",
    {
      in_shop_uuid: id,
      in_user_uuid: uuid,
      limit_param: limit,
      offset_param: offset,
    }
  );

  if (error) {
    throw new CustomAPIError(`An error occurred: ${error.message}`);
  }

  res.status(StatusCodes.OK).json({ message: "Success", data });
};

const handleGetPostByIDDummy = async (req, res) => {
  const { id } = req.params;
  const { uuid } = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const offset = (page - 1) * limit;

  if (!uuid) {
    throw new CustomAPIError("uuid not provided");
  }
  const { data, error } = await supabase.rpc(
    "get_posts_with_likes_and_user_liked",
    {
      in_shop_uuid: id,
      in_user_uuid: uuid,
      limit_param: limit,
      offset_param: offset,
    }
  );

  if (error) {
    throw new CustomAPIError(`An error occurred: ${error.message}`);
  }

  res.status(StatusCodes.OK).json({ message: "Success", data });
};

const handleAddLike = async (req, res) => {
  const { id } = req.params;
  const { uuid } = req.user;

  const { data, error } = await supabase.from("likes").upsert(
    [
      {
        post_uuid: id,
        user_uuid: uuid,
      },
    ],
    {
      onConflict: ["post_uuid"],
    }
  );

  if (error) {
    throw new CustomAPIError(`An error occured: ${error.message}`);
  }
  res.status(StatusCodes.OK).json({ message: "Success", data: data });
};

const handleCreateNewPost = async (req, res) => {
  const { desc, shop_uuid } = req.body;
  const { image, video } = req.files;

  if (!shop_uuid) {
    throw new CustomAPIError(`Please provide post's uuid`);
  }

  const { data: shopData, error: shopError } = await supabase
    .from("shop")
    .select()
    .eq("uuid", shop_uuid);

  if (shopError || !shopData) {
    throw new CustomAPIError(`Shop uuid is not valid`);
  }

  if (!desc && !video && !image) {
    throw new CustomAPIError(`All fields must be provided`);
  }

  if (video && image) {
    throw new CustomAPIError(
      `Only one of either a video or an image must be provided`
    );
  }

  let imageUrl = null;
  let videoUrl = null;

  if (image) {
    const imageFile = image[0];
    if (!imageFile.mimetype.startsWith("image/")) {
      throw new CustomAPIError("Uploaded file is not an image");
    }
    imageUrl = await storeImage(imageFile, "Post");
  }

  if (video) {
    const videoFile = video[0];
    if (!videoFile.mimetype.startsWith("video/")) {
      throw new CustomAPIError("Uploaded file is not a video");
    }
    videoUrl = await storeImage(videoFile, "Post");
  }

  let postData = {
    uuid: uuidv4(),
    description: desc,
    video: videoUrl,
    image: imageUrl,
    shop_uuid,
  };

  const { data, error } = await supabase.from("posts").insert([postData]);

  if (error) {
    throw new CustomAPIError(`An error occurred: ${error.message}`);
  }

  res.status(StatusCodes.OK).json({ message: "Success", data: data });
};

module.exports = {
  handleCreateNewPost,
  handleGetAllPosts,
  handleGetPostByID,
  handleAddLike,
  handleGetPostByIDDummy,
};
