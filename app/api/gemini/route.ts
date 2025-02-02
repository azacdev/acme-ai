// import { OpenAI } from "openai";
// import { v4 as uuidv4 } from "uuid";
// import { streamText, Message } from "ai";
// import { createGoogleGenerativeAI } from "@ai-sdk/google";

// const google = createGoogleGenerativeAI({
//   apiKey: process.env.GOOGLE_API_KEY || "",
// });

// export const runtime = "edge";

// const id = uuidv4();

// const buildGoogleGenAIPrompt = (messages: Message[]): Message[] => [
//   {
//     id,
//     role: "system",
//     content: `You are Lewis Hamilton, the legendary seven-time Formula 1 World Champion. You possess unparalleled expertise in F1 racing, car engineering, and race strategy. When discussing F1, you approach it with the same precision and focus you apply on the track. Your responses are insightful, technical when necessary, and aimed at helping fans and aspiring drivers understand the intricacies of the sport. You can break down complex racing concepts, explain team strategies, and offer a unique perspective on the evolution of F1 throughout your career. Your goal is to maximize the learner's understanding of F1, from the basics of racing lines to the complexities of aerodynamics and tire management.`,
//   },
//   ...messages.map((message) => ({
//     id: message.id,
//     role: message.role,
//     content: message.content,
//   })),
// ];

// export async function POST(request: Request) {
//   const { messages } = await request.json();

//   const stream = await streamText({
//     model: google("gemini-1.5-pro-latest"),
//     messages: buildGoogleGenAIPrompt(messages),
//     temperature: 1,
//   });

//   return stream.toDataStreamResponse();
// }

import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GOOGLE_API_KEY,
  OPENAI_API_KEY,
} = process.env;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const latestMessage = messages[messages?.length - 1]?.content;

    let docContext = "";

    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
      encoding_format: "float",
    });

    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION);
      const cursor = collection.find(null, {
        sort: {
          $vector: embedding.data[0].embedding,
        },
        limit: 10,
      });

      const documents = await cursor.toArray();

      const docsMap = documents.map((doc) => doc.text);

      docContext = JSON.stringify(docsMap);
    } catch (error) {
      console.log("Error querying db...");
      docContext = "";
    }

    const template = {
      role: "system",
      content: `You are an AI assistant who knows everything about Formula One. Use the below context to augment what you know about Formula One racing. The context will provide you with the most recent page data from Wikipedia, the official F1 website, and others. If the context doesn't include the information you need, answer based on your existing knowledge and don't mention the source of your information or what the context does or doesn't include. Format responses using markdown where applicable and don't return images.
      -------------
      START CONTEXT
      ${docContext}
      END CONTEXT
      -------------
      QUESTION: ${latestMessage}
      -------------`,
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      stream: true,
      messages: [template, ...messages],
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.log(error);
  }
}
