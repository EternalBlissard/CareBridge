import { Router } from "express";
import {
  getDefaultSyntheticPatient,
  getSyntheticPatient,
  listSyntheticPatients,
} from "../data/synthea.js";

export const syntheticRouter = Router();

syntheticRouter.get("/", (_req, res) => {
  res.json({ patients: listSyntheticPatients() });
});

syntheticRouter.get("/default", (_req, res) => {
  res.json(getDefaultSyntheticPatient());
});

syntheticRouter.get("/:id", (req, res) => {
  const patient = getSyntheticPatient(req.params.id);
  if (!patient) {
    res.status(404).json({ error: "Synthetic patient not found" });
    return;
  }
  res.json(patient);
});
