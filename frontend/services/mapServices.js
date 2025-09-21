import axios from 'axios';
const backendURL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const getAllReports = async () => {
  try {
    const response = await axios.get(`${backendURL}api/reports/getAllReports`);
    return response.data;
  } catch (err) {
    console.error(err);
  }
}
export const getReportData = async (Rid ) => {
  try {
    const response = await axios.post(`${backendURL}api/reports/getReportData`, {
      Rid: Rid
    });
    return response.data;
  } catch (err) {
    console.error(err);
  }
}