import "dotenv/config";
import cors from "cors";
import express from "express";

const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.use(cors());
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "carebridge-api" });
});

app.listen(PORT, () => {
  console.log(`CareBridge API listening on http://localhost:${PORT}`);
});
