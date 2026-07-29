import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

async function test() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const model = genAI.getGenerativeModel({
            model: "gemini-3.5-flash-lite",
        });

        const result = await model.generateContent("Say hello in one word.");

        console.log(result.response.text());

    } catch (err) {
        console.error(err);
    }
}

test();