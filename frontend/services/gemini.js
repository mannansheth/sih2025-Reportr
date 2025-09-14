import axios from "axios";

const backendURL = process.env.EXPO_PUBLIC_BACKEND_URL
export const detectIssues = async (base64Image, mimeType) => {
  try {
    const response = await axios.post(`${backendURL}api/getPredictions`, {
      base64Image,
      mimeType,
    })
    console.log(response.data);
    return response.data; 
  } catch (err) {
    console.error(err);
  }
}