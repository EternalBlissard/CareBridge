import "dotenv/config";
import cors from "cors";
import express from "express";
import { parseRouter } from "./routes/parse.js";
import { drugLabelRouter } from "./routes/drug-label.js";
import { patientViewRouter } from "./routes/patient-view.js";
import { syntheticRouter } from "./routes/synthetic.js";
import { PARSE_DEGRADED_MSG } from "./errors.js";

const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.use(cors());
app.use(express.json({ limit: "64kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "carebridge-api" });
});

app.use("/api/parse", parseRouter);
app.use("/api/patient-view", patientViewRouter);
app.use("/api/drug-label", drugLabelRouter);
app.use("/api/synthetic-patient", syntheticRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled API error:", err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Request failed",
        warning: PARSE_DEGRADED_MSG,
      });
    }
  },
);

app.listen(PORT, () => {
  console.log(`CareBridge API listening on http://localhost:${PORT}`);
});
