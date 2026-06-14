import { Router } from "express";
import { z } from "zod";
import { groundedDrugInfo } from "../foundry/service.js";

const RequestSchema = z.object({
  question: z.string().min(1).max(500),
  drugs: z.array(z.string().min(1)).min(1).max(20),
});

export const groundedDrugInfoRouter = Router();

groundedDrugInfoRouter.post("/", async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  // The service never throws — it degrades to the deterministic FDA excerpt.
  const result = await groundedDrugInfo(parsed.data.question, parsed.data.drugs);
  res.json(result);
});
