// import OpenAI from "openai";
// import { DataAPIClient } from "@datastax/astra-db-ts";
// import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer";
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import "dotenv/config";

// type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

// const {
//   ASTRA_DB_NAMESPACE,
//   ASTRA_DB_COLLECTION,
//   ASTRA_DB_API_ENDPOINT,
//   ASTRA_DB_APPLICATION_TOKEN,
//   OPENAI_API_KEY,
// } = process.env;

// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// const f1Data = [
//   "https://en.wikipedia.org/wiki/Formula_One",
//   "https://www.skysports.com/f1/news/12433/13294444/lewis-hamilton-ferrari-f1-driver-energised-after-first-test-for-new-team-at-fiorano-ahead-of-2025-formula-1-season",
//   "https://www.forbes.com/sites/brettknight/2024/12/10/formula-1s-highest-paid-drivers-2024/",
//   "https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions",
//   "https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions",
//   "https://www.formula1.com/",
// ];

// const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
// const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

// const spilliter = new RecursiveCharacterTextSplitter({
//   chunkSize: 512,
//   chunkOverlap: 100,
// });

// const createCollection = async (
//   similarityMetric: SimilarityMetric = "dot_product"
// ) => {
//   const res = await db.createCollection(ASTRA_DB_COLLECTION, {
//     vector: {
//       dimension: 1536,
//       metric: similarityMetric,
//     },
//   });

//   console.log(res);
// };

// const loadSampleData = async () => {
//   const collection = await db.collection(ASTRA_DB_COLLECTION);
//   for await (const url of f1Data) {
//     const content = await scrapePage(url);
//     const chunks = await spilliter.splitText(content);
//     for await (const chunk of chunks) {
//       const embedding = await openai.embeddings.create({
//         model: "text-embedding-3-small",
//         input: chunk,
//         encoding_format: "float",
//       });

//       const vector = embedding.data[0].embedding;

//       const res = await collection.insertOne({
//         $vector: vector,
//         text: chunk,
//       });

//       console.log(res);
//     }
//   }
// };

// const scrapePage = async (url: string) => {
//   const loader = new PuppeteerWebBaseLoader(url, {
//     launchOptions: {
//       headless: true,
//     },
//     gotoOptions: {
//       waitUntil: "domcontentloaded",
//     },
//     evaluate: async (page, browser) => {
//       const result = await page.evaluate(() => document.body.innerHTML);
//       await browser.close();
//       return result;
//     },
//   });

//   return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
// };

// createCollection().then(() => loadSampleData());

import { GoogleGenerativeAI } from "@google/generative-ai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import "dotenv/config";

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GOOGLE_API_KEY,
} = process.env;

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

const f1Data = [
  "https://en.wikipedia.org/wiki/Formula_One",
  "https://www.skysports.com/f1/news/12433/13294444/lewis-hamilton-ferrari-f1-driver-energised-after-first-test-for-new-team-at-fiorano-ahead-of-2025-formula-1-season",
  "https://www.forbes.com/sites/brettknight/2024/12/10/formula-1s-highest-paid-drivers-2024/",
  "https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions",
  "https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions",
  "https://www.formula1.com/",
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

const EMBEDDING_DIMENSION = 768;

const createCollection = async (
  similarityMetric: SimilarityMetric = "dot_product"
) => {
  const res = await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: {
      dimension: EMBEDDING_DIMENSION,
      metric: similarityMetric,
    },
  });

  console.log(res);
};

const loadSampleData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  for await (const url of f1Data) {
    const content = await scrapePage(url);
    const chunks = await splitter.splitText(content);
    for await (const chunk of chunks) {
      const embeddingResult = await model.embedContent(chunk);
      const vector = embeddingResult.embedding.values;

      const res = await collection.insertOne({
        $vector: vector,
        text: chunk,
      });

      console.log(res);
    }
  }
};

const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true,
    },
    gotoOptions: {
      waitUntil: "domcontentloaded",
    },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return result;
    },
  });

  return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
};

createCollection().then(() => loadSampleData());
