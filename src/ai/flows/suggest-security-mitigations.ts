// src/ai/flows/suggest-security-mitigations.ts
'use server';

/**
 * @fileOverview An AI agent that suggests security mitigations for specific assets based on threat feeds.
 *
 * - suggestSecurityMitigations - A function that suggests security mitigations for a given asset.
 * - SuggestSecurityMitigationsInput - The input type for the suggestSecurityMitigations function.
 * - SuggestSecurityMitigationsOutput - The return type for the suggestSecurityMitigations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSecurityMitigationsInputSchema = z.object({
  assetType: z.string().describe('The type of asset (e.g., server, workstation, router).'),
  assetName: z.string().describe('The name or identifier of the asset.'),
  softwareList: z.string().describe('A comma-separated list of software installed on the asset.'),
  knownVulnerabilities: z.string().optional().describe('A comma-separated list of known vulnerabilities affecting the asset, if any.'),
});
export type SuggestSecurityMitigationsInput = z.infer<typeof SuggestSecurityMitigationsInputSchema>;

const SuggestSecurityMitigationsOutputSchema = z.object({
  mitigationSuggestions: z.array(
    z.string().describe('A list of suggested security mitigations for the asset.')
  ).describe('A list of security mitigations')
});
export type SuggestSecurityMitigationsOutput = z.infer<typeof SuggestSecurityMitigationsOutputSchema>;

export async function suggestSecurityMitigations(
  input: SuggestSecurityMitigationsInput
): Promise<SuggestSecurityMitigationsOutput> {
  return suggestSecurityMitigationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSecurityMitigationsPrompt',
  input: {schema: SuggestSecurityMitigationsInputSchema},
  output: {schema: SuggestSecurityMitigationsOutputSchema},
  prompt: `You are a security expert who reviews threat feeds and suggests security mitigations for IT assets.

  Analyze the provided information about the asset and suggest specific, actionable mitigations to address potential vulnerabilities.
  Consider the asset type, software installed, and any known vulnerabilities to tailor your recommendations.
  Provide a list of mitigations that can be implemented to improve the security posture of the asset.

  Asset Type: {{{assetType}}}
  Asset Name: {{{assetName}}}
  Software List: {{{softwareList}}}
  Known Vulnerabilities: {{{knownVulnerabilities}}}

  Mitigation Suggestions:`, // The LLM will complete this prompt with mitigation suggestions.
});

const suggestSecurityMitigationsFlow = ai.defineFlow(
  {
    name: 'suggestSecurityMitigationsFlow',
    inputSchema: SuggestSecurityMitigationsInputSchema,
    outputSchema: SuggestSecurityMitigationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
