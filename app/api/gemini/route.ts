import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GOOGLE_API_KEY,
} = process.env;

const google = createGoogleGenerativeAI({
  apiKey: GOOGLE_API_KEY || "",
});

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const latestMessage = messages[messages?.length - 1]?.content;

    let docContext = "";

    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embeddingResult = await model.embedContent(latestMessage);
    const embedding = embeddingResult.embedding.values;

    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION);
      const cursor = collection.find(null, {
        sort: {
          $vector: embedding,
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
      ...messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      })),
    };

    const result = await streamText({
      model: google("gemini-1.5-pro-latest"),
      messages: [template, ...messages],
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.log(error);
    return new Response("An error occurred", { status: 500 });
  }
}
