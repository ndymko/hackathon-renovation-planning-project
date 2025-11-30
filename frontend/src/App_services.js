import axios from "axios";

const rapidApiKey =
  process.env.REACT_APP_RAPIDAPI_KEY ||
  "2127d88b7amshb9eace1b9e27312p100aa8jsn099b896b2aae";
const rapidApiHost = "floor-plan-digitalization.p.rapidapi.com";

export const sendPlanJson = async (planJson) => {
  try {
    await fetch("http://localhost:7070", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: planJson,
    });
  } catch (err) {
    // swallow network errors silently; UI shows parse errors separately
    console.error("Failed to send plan JSON", err);
  }
};

export const sendFloorPlanImage = async (base64Image) => {
  if (!base64Image) {
    throw new Error("Image payload is empty");
  }

  try {
    const response = await axios.post(
      "https://floor-plan-digitalization.p.rapidapi.com/raster-to-vector-base64",
      { image: base64Image },
      {
        headers: {
          "x-rapidapi-key": rapidApiKey,
          "x-rapidapi-host": rapidApiHost,
          "Content-Type": "application/json",
        },
      }
    );

    return response?.data;
  } catch (err) {
    const errPayload =
      err.response?.data && typeof err.response.data === "object"
        ? JSON.stringify(err.response.data)
        : err.response?.data || err.message;
    console.error("Failed to send floor plan image", errPayload);
    throw err;
  }
};

export const sendChatMessage = async (text) => {
  try {
    const response = await axios.post(
      "http://localhost:8080/api/llm",
      { prompt: text },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = response?.data;
    let replyText = "";

    if (typeof data === "string") {
      replyText = data;
    } else if (data) {
      replyText =
        data.response ||
        data.message ||
        data.answer ||
        data.text ||
        JSON.stringify(data);
    }

    return replyText?.toString?.().trim?.() || "";
  } catch (err) {
    const errPayload =
      err.response?.data && typeof err.response.data === "object"
        ? JSON.stringify(err.response.data)
        : err.response?.data || err.message;
    console.error("Failed to send chat message", errPayload);
    throw err;
  }
};
