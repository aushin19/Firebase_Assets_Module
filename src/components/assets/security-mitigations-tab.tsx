"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { suggestSecurityMitigations, SuggestSecurityMitigationsInput, SuggestSecurityMitigationsOutput } from "@/ai/flows/suggest-security-mitigations";
import type { Asset } from "@/types";
import { Loader2, ShieldAlert, ListChecks } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SecurityMitigationsTabProps {
  asset: Asset;
}

export function SecurityMitigationsTab({ asset }: SecurityMitigationsTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mitigations, setMitigations] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prepare initial form values from asset prop
  const initialSoftwareList = asset.softwareList?.map(sw => sw.name).join(", ") || "";
  const initialKnownVulnerabilities = asset.knownVulnerabilities?.join(", ") || "";

  const [softwareList, setSoftwareList] = useState(initialSoftwareList);
  const [knownVulnerabilities, setKnownVulnerabilities] = useState(initialKnownVulnerabilities);


  const handleSubmit = async () => {
    setError(null);
    setMitigations(null);

    const aiInput: SuggestSecurityMitigationsInput = {
      assetType: asset.assetType,
      assetName: asset.name,
      softwareList: softwareList,
      knownVulnerabilities: knownVulnerabilities || undefined, // Optional field
    };

    startTransition(async () => {
      try {
        const result: SuggestSecurityMitigationsOutput = await suggestSecurityMitigations(aiInput);
        if (result.mitigationSuggestions && result.mitigationSuggestions.length > 0) {
          setMitigations(result.mitigationSuggestions);
          toast({
            title: "Success",
            description: "Security mitigations suggested.",
          });
        } else {
          setMitigations([]); // No suggestions found
           toast({
            title: "No Suggestions",
            description: "AI could not find specific mitigations based on the input.",
            variant: "default"
          });
        }
      } catch (e) {
        console.error("Error fetching security mitigations:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        setError(errorMessage);
        toast({
          title: "Error",
          description: `Failed to suggest security mitigations: ${errorMessage}`,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><ShieldAlert className="mr-2 h-6 w-6 text-primary" />AI-Powered Security Mitigations</CardTitle>
        <CardDescription>
          Get AI-driven security mitigation suggestions based on the asset's profile and known threat intelligence.
          You can edit the software list and known vulnerabilities below to refine suggestions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Asset Profile for AI Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-secondary/30">
            <div><Label>Asset Type</Label><Input readOnly value={asset.assetType} className="mt-1 bg-muted" /></div>
            <div><Label>Asset Name</Label><Input readOnly value={asset.name} className="mt-1 bg-muted" /></div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="softwareList">Software List (comma-separated)</Label>
          <Textarea
            id="softwareList"
            value={softwareList}
            onChange={(e) => setSoftwareList(e.target.value)}
            placeholder="e.g., Apache 2.4, OpenSSL 1.1.1, PHP 7.4"
            rows={3}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="knownVulnerabilities">Known Vulnerabilities (comma-separated, optional)</Label>
          <Textarea
            id="knownVulnerabilities"
            value={knownVulnerabilities}
            onChange={(e) => setKnownVulnerabilities(e.target.value)}
            placeholder="e.g., CVE-2023-1234, Log4Shell, Outdated Apache library"
            rows={3}
            className="bg-background"
          />
        </div>

        <Button onClick={handleSubmit} disabled={isPending} className="w-full sm:w-auto">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Suggesting Mitigations...
            </>
          ) : (
            "Suggest Security Mitigations"
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mitigations !== null && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-3 flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary" />Suggested Mitigations:</h3>
            {mitigations.length > 0 ? (
              <ScrollArea className="h-[250px] p-1">
                <ul className="space-y-3">
                  {mitigations.map((mitigation, index) => (
                    <li key={index} className="p-3 border rounded-md bg-card shadow-sm">
                      <p className="text-sm text-foreground">{mitigation}</p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
               <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>No Specific Mitigations Found</AlertTitle>
                <AlertDescription>The AI could not find specific mitigation suggestions based on the provided information. Try refining the software list or known vulnerabilities.</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
         <p className="text-xs text-muted-foreground">
            Note: AI suggestions are for informational purposes and should be reviewed by a security professional.
          </p>
      </CardFooter>
    </Card>
  );
}
