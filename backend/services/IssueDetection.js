const dotenv = require("dotenv")
dotenv.config();
const {
  GEMINI_API_KEY 
} = process.env

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are an expert at analyzing images for civic issues. Your task is to carefully examine the provided image and identify any civic issues. A civic issue is any problem in a public space that requires maintenance or attention from a local authority. Examples include, but are not limited to, potholes, broken street lights, garbage overflow, traffic violations, damaged signage, graffiti, and infrastructure damage.

Respond ONLY with a JSON array of objects. Each object in the array MUST have four keys:
- "issue" (a string corresponding to the detected issue)
- "probability" (a floating-point number from 0 to 1, representing your confidence in the detection, include items with less confidence as well)
- "description" (a brief, one-sentence string describing the issue in the image)
- "bounding_box" (an array of four integers [ymin, xmin, ymax, xmax] representing the coordinates of the issue on a 1000x1000 grid. These are normalized coordinates and must be scaled for your image.)

If no civic issues are detected, return an empty JSON array: [].
Do not include any other text, explanation, or markdown formatting outside of the JSON array.`;

const detectIssues = async (base64Image, mimeType) => {
  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
    systemInstruction: {
      parts: [
        {
          text: SYSTEM_PROMPT,
        },
      ],
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const jsonString = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonString) {
      console.error("No valid JSON string found in API response.");
      return [];
    }

    // Parse the JSON string to get the final data
    const parsedData = JSON.parse(jsonString);
    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return [];
  }
}
module.exports = { detectIssues }