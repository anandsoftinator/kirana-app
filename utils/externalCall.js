const axios = require("axios");

const fetch = async (url) => {
  const response = await axios.get(url);
  return response.data;
};

const reverseGeocodeCoordinates = async (latitude, longitude) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
    latitude
  )}&lon=${encodeURIComponent(longitude)}`;

  const data = await fetch(url);

  if (data && data.address) {
    const address = `${data.address.road ? data.address.road + ", " : ""}${
      data.address.city ? data.address.city + ", " : ""
    }${data.address.state ? data.address.state + ", " : ""}${
      data.address.postcode ? data.address.postcode + ", " : ""
    }${data.address.country}`;
    return address;
  } else {
    return null;
  }
};

module.exports = { fetch, reverseGeocodeCoordinates };
