const { createClient } = require("@supabase/supabase-js");

let supabase;
const connectDB = () => {
  try {
    supabase = createClient(process.env.SUPABASE_PROJECT_URL, process.env.SUPABASE_API_KEY);
    console.log("Connected to Supabase");
  } catch (error) {
    console.error("Error connecting to Supabase:", error);
    throw error;
  }
};

const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error("Supabase client is not initialized. Call connectDB first.");
  }
  return supabase;
};

connectDB()

module.exports = { getSupabaseClient };