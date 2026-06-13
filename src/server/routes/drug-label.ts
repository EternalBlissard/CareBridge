import { Router } from "express";
import { DrugLabelsRequestSchema } from "../openfda/schemas.js";
import { lookupDrugLabels } from "../openfda/service.js";

export const drugLabelRouter = Router();

drugLabelRouter.post("/", async (req, res) => {
  const parsed = DrugLabelsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const result = await lookupDrugLabels(
      parsed.data.drugs,
      parsed.data.coDrugs ?? parsed.data.drugs,
    );
    res.json(result);
  } catch {
    res.status(500).json({
      error: "Drug label lookup failed",
      warning: "FDA label lookup unavailable.",
    });
  }
});

drugLabelRouter.get("/:drugName", async (req, res) => {
  const drugName = req.params.drugName?.trim();
  if (!drugName) {
    res.status(400).json({ error: "Drug name required" });
    return;
  }

  try {
    const result = await lookupDrugLabels([drugName]);
    res.json(result.labels[0] ?? { drugName, found: false, source: "unavailable" });
  } catch {
    res.status(500).json({
      error: "Drug label lookup failed",
      warning: "FDA label lookup unavailable.",
    });
  }
});
