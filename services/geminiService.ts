import { GoogleGenAI, Type } from "@google/genai";
import type { BusinessCard } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    name_th: { type: Type.STRING, description: "Full name of the person in Thai language (ชื่อ-สกุล ภาษาไทย). If not available, return empty string." },
    name_en: { type: Type.STRING, description: "Full name of the person in English language. If not available, return empty string." },
    company: { type: Type.STRING, description: "Company name. รองรับภาษาไทย" },
    title: { type: Type.STRING, description: "Job title or position. รองรับภาษาไทย" },
    phone_mobile: { type: Type.STRING, description: "Mobile phone number. If not available, return empty string." },
    phone_office: { type: Type.STRING, description: "Office or work phone number. If not available, return empty string." },
    email: { type: Type.STRING, description: "Contact email address." },
    website: { type: Type.STRING, description: "Company website." },
    address: { type: Type.STRING, description: "Physical address. รองรับภาษาไทย" },
  },
  required: ["name_th", "name_en", "company", "title", "phone_mobile", "phone_office", "email", "website", "address"],
};

export const extractInfoFromImage = async (
  base64Data: string,
  mimeType: string
): Promise<Omit<BusinessCard, 'id' | 'category' | 'createdAt'>> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this business card image. Extract the contact information. Separate the full name into Thai (name_th) and English (name_en). Also, separate the phone numbers into mobile (phone_mobile) and office (phone_office) numbers. Return the result as a JSON object. If a field is not found, return an empty string for it.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonString = response.text.trim();
    const parsedData = JSON.parse(jsonString) as Omit<BusinessCard, 'id' | 'category' | 'createdAt'>;
    return parsedData;

  } catch (error) {
    console.error("Error extracting info from Gemini:", error);
    throw new Error("Failed to analyze the business card. Please try again with a clearer image.");
  }
};