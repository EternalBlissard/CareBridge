#!/usr/bin/env node
/**
 * CareBridge MCP server — deterministic safety tools for Copilot agent mode.
 * Transport: stdio (spawned by VS Code / Cursor mcp.json).
 */
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkInteractions } from "../rules/check-interactions.js";
import { detectRedFlags } from "../rules/detect-red-flags.js";
import {
  getDefaultSyntheticPatient,
  getSyntheticPatient,
  listSyntheticPatients,
} from "../server/data/synthea.js";
import { lookupDrugLabels } from "../server/openfda/service.js";
import type { Medication } from "../shared/types.js";

function jsonContent(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function toMedications(names: string[]): Medication[] {
  return names.map((name) => {
    const normalized = name.toLowerCase().trim();
    return {
      name: name.trim(),
      normalizedName: normalized,
      provenance: "deterministic-rule",
    };
  });
}

const server = new McpServer({
  name: "carebridge",
  version: "1.0.0",
});

server.registerTool(
  "check_interactions",
  {
    description:
      "Check drug-drug interactions via bundled DDInter lookup. Severity is deterministic — never LLM.",
    inputSchema: {
      medications: z
        .array(z.string().min(1))
        .min(1)
        .describe("Medication names (e.g. warfarin, ibuprofen)"),
    },
  },
  async ({ medications }) => {
    const meds = toMedications(medications);
    const interactions = checkInteractions(meds);
    return jsonContent({
      medications: meds.map((m) => m.normalizedName),
      interactions,
      provenance: "deterministic-rule",
      source: "DDInter bundled subset",
    });
  },
);

server.registerTool(
  "lookup_drug_label",
  {
    description:
      "Fetch FDA drug label interaction text from openFDA (live + 24h cache). Label text only — severity from DDInter.",
    inputSchema: {
      drug: z.string().min(1).optional().describe("Single drug name"),
      drugs: z
        .array(z.string().min(1))
        .optional()
        .describe("Batch drug names"),
      co_drugs: z
        .array(z.string().min(1))
        .optional()
        .describe("Other meds in regimen — picks relevant interaction excerpt"),
    },
  },
  async ({ drug, drugs, co_drugs }) => {
    const list = drugs ?? (drug ? [drug] : []);
    if (list.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: "Provide drug or drugs" }),
          },
        ],
        isError: true,
      };
    }
    const result = await lookupDrugLabels(list, co_drugs ?? list);
    return jsonContent(result);
  },
);

server.registerTool(
  "detect_red_flags",
  {
    description:
      "Detect clinical red flags from narrative text via curated deterministic rules. Never LLM.",
    inputSchema: {
      text: z.string().min(1).describe("Patient narrative (synthetic data only)"),
    },
  },
  async ({ text }) => {
    const emptyStory = {
      timeline: [],
      medications: [],
      symptoms: [],
    };
    const redFlags = detectRedFlags(text, emptyStory);
    return jsonContent({
      redFlags,
      count: redFlags.length,
      provenance: "deterministic-rule",
    });
  },
);

server.registerTool(
  "get_synthetic_patient",
  {
    description:
      "Load a Synthea-style synthetic patient fixture. Never use real patient data.",
    inputSchema: {
      id: z
        .string()
        .optional()
        .describe("Fixture id (default: synthea-patient-001)"),
    },
  },
  async ({ id }) => {
    const patient = id ? getSyntheticPatient(id) : getDefaultSyntheticPatient();
    if (!patient) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "Synthetic patient not found",
              available: listSyntheticPatients(),
            }),
          },
        ],
        isError: true,
      };
    }
    return jsonContent({
      patient,
      available: listSyntheticPatients(),
    });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CareBridge MCP server ready (stdio)");
}

main().catch((err: unknown) => {
  console.error("CareBridge MCP fatal:", err);
  process.exit(1);
});
