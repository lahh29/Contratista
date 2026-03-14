'use server';
/**
 * @fileOverview An AI agent for automated document data extraction and verification.
 *
 * - extractDocumentData - A function that handles the document data extraction process.
 * - AutomatedDocumentDataExtractionInput - The input type for the extractDocumentData function.
 * - AutomatedDocumentDataExtractionOutput - The return type for the extractDocumentData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const AutomatedDocumentDataExtractionInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A document image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  documentDescription: z
    .string()
    .optional()
    .describe('A brief description of the document, e.g., "a contractor\u0027s SUA certificate" or "an insurance policy".'),
});
export type AutomatedDocumentDataExtractionInput = z.infer<
  typeof AutomatedDocumentDataExtractionInputSchema
>;

// Output Schema
const AutomatedDocumentDataExtractionOutputSchema = z.object({
  suaStatus: z
    .string()
    .nullable()
    .describe(
      'The SUA (Seguro de Vida) status found in the document, if applicable. Can be "Active", "Inactive", "Pending", or null if not found.'
    ),
  suaExpirationDate: z
    .string()
    .nullable()
    .describe('The expiration date of the SUA or primary insurance in ISO 8601 format (YYYY-MM-DD), or null if not found.'),
  policyNumber: z
    .string()
    .nullable()
    .describe('The policy number of the insurance or SUA, or null if not found.'),
  contractorName: z
    .string()
    .nullable()
    .describe('The full name of the individual contractor or insured party, or null if not found.'),
  companyName: z
    .string()
    .nullable()
    .describe('The name of the company or employer associated with the document, or null if not found.'),
  verificationNotes: z
    .string()
    .describe(
      'Notes on the verification status, including any discrepancies, missing information, or if dates are expired. If no issues, state "Document data extracted and appears valid."' 
    ),
});
export type AutomatedDocumentDataExtractionOutput = z.infer<
  typeof AutomatedDocumentDataExtractionOutputSchema
>;

// Wrapper function
export async function extractDocumentData(
  input: AutomatedDocumentDataExtractionInput
): Promise<AutomatedDocumentDataExtractionOutput> {
  return automatedDocumentDataExtractionFlow(input);
}

// Prompt definition
const documentExtractionPrompt = ai.definePrompt({
  name: 'documentExtractionPrompt',
  input: { schema: AutomatedDocumentDataExtractionInputSchema },
  output: { schema: AutomatedDocumentDataExtractionOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: `You are an expert document data extractor for contractor compliance. Your task is to accurately read and extract specific information from an uploaded document image.

Based on the provided document and its description:

Description: {{{documentDescription}}}
Document: {{media url=documentDataUri}}

Extract the following information:
1.  **SUA Status**: Determine the status of the "Seguro de Vida" (Life Insurance) if present. Common statuses include "Active", "Inactive", "Pending". If not found, output null.
2.  **SUA Expiration Date**: Find the expiration date of the "Seguro de Vida" or any primary insurance policy. Format this date as YYYY-MM-DD. If not found, output null.
3.  **Policy Number**: Identify the primary policy number from the document. If not found, output null.
4.  **Contractor Name**: Extract the full name of the individual contractor or insured party. If not found, output null.
5.  **Company Name**: Extract the name of the company associated with the document (e.g., the employer or the insured company). If not found, output null.

After extraction, provide 'verificationNotes' that summarize the status.
- State if all requested information was found.
- Note any missing pieces.
- Importantly, check if the SUA Expiration Date (if found) is in the past, and mention this. Assume the current date is today.
- If all looks good, provide a positive confirmation.
`,
});

// Flow definition
const automatedDocumentDataExtractionFlow = ai.defineFlow(
  {
    name: 'automatedDocumentDataExtractionFlow',
    inputSchema: AutomatedDocumentDataExtractionInputSchema,
    outputSchema: AutomatedDocumentDataExtractionOutputSchema,
  },
  async (input) => {
    const { output } = await documentExtractionPrompt(input);
    if (!output) {
      throw new Error('Failed to extract document data.');
    }
    return output;
  }
);
