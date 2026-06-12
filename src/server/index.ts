import "dotenv/config";
import cors from "cors";
import express from "express";
import { parseRouter } from "./routes/parse.js";
import { syntheticRouter } from "./routes/synthetic.js";

const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.use(cors());
app.use(express.json({ limit: "64kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "carebridge-api" });
});

app.use("/api/parse", parseRouter);
app.use("/api/synthetic-patient", syntheticRouter);

app.listen(PORT, () => {
  console.log(`CareBridge API listening on http://localhost:${PORT}`);
});
