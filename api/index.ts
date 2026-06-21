import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);
let ready = false;

// Initialize routes once
const init = (async () => {
  await registerRoutes(httpServer, app);
  ready = true;
})();

export default async function handler(req: any, res: any) {
  await init;
  app(req, res);
}
