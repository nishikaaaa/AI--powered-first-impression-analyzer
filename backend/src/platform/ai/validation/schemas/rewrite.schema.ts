import { z } from "zod";

export const rewriteLlmSchema = z.object({
  rewrittenText: z.string().min(1),
  explanation: z.string().min(1),
  warnings: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
});
