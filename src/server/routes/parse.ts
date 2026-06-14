import { Router } from "express";
import { PARSE_DEGRADED_MSG } from "../errors.js";
import { ParseRequestSchema } from "../parse/schemas.js";
import { parseNarrative } from "../parse/service.js";

export const parseRouter = Router();

parseRouter.post("/", async (req, res) => {
  const parsed = ParseRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const result = await parseNarrative(parsed.data.text);
    res.json(result);
  } catch {
    res.status(500).json({
      error: "Parse failed",
      warning: PARSE_DEGRADED_MSG,
    });
  }
});
