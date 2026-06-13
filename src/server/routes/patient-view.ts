import { Router } from "express";
import { PATIENT_DEGRADED_MSG } from "../errors.js";
import { buildPatientView } from "../patient-view/service.js";
import { PatientViewRequestSchema } from "../patient-view/schemas.js";

export const patientViewRouter = Router();

patientViewRouter.post("/", async (req, res) => {
  const parsed = PatientViewRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const result = await buildPatientView(parsed.data.story);
    res.json(result);
  } catch {
    res.status(500).json({
      error: "Patient view failed",
      warning: PATIENT_DEGRADED_MSG,
    });
  }
});
