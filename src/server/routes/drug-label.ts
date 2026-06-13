import { Router } from "express";
import { FDA_UNAVAILABLE_MSG } from "../errors.js";
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
    res.status(200).json({
      labels: [],
      attribution: "Data provided by the U.S. Food and Drug Administration.",
      warning: FDA_UNAVAILABLE_MSG,
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
    res.status(200).json({
      drugName: req.params.drugName ?? "",
      found: false,
      source: "unavailable",
      warning: FDA_UNAVAILABLE_MSG,
    });
  }
});
