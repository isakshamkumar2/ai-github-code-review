import Groq from "groq-sdk";
import * as dotenv from "dotenv";

dotenv.config();
const groq = new Groq({ apiKey: "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" });

export default groq;
