import { z } from "zod";

export const OpenFdaLabelResultSchema = z.object({
  drug_interactions: z.array(z.string()).optional(),
  openfda: z
    .object({
      generic_name: z.array(z.string()).optional(),
      brand_name: z.array(z.string()).optional(),
    })
    .optional(),
});

export const OpenFdaResponseSchema = z.object({
  results: z.array(OpenFdaLabelResultSchema).optional(),
});

export type OpenFdaLabelResult = z.infer<typeof OpenFdaLabelResultSchema>;

export const DrugLabelsRequestSchema = z.object({
  drugs: z.array(z.string().min(1)).min(1).max(20),
  /** Other meds in the list — used to pick relevant interaction excerpts */
  coDrugs: z.array(z.string()).optional(),
});

export type CachedDrugLabel = {
  drugName: string;
  genericNames: string[];
  brandNames: string[];
  interactionTexts: string[];
  excerpt: string | null;
  fetchedAt: number;
};
