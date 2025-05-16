# **App Name**: AssetLens

## Core Features:

- Asset List View: Display a sortable, filterable, paginated list of all assets with key information.
- Asset Detail View: Display a comprehensive, tabbed view of all details pertaining to a given asset.
- Bulk Import: Provide the ability to upload a spreadsheet of data, map its columns to fields in the database, validate, preview, and import.
- Bulk Export: Provide a mechanism for exporting the currently filtered and selected data (or the entire asset list) in the most common spreadsheet formats.
- AI-Powered Security Mitigation Suggestions: In the asset details view, use an LLM tool to monitor threat feeds on the internet and use that knowledge to propose security mitigations appropriate to the identified hardware and software.

## Style Guidelines:

- Primary color: Use a dark shade of gray for the background to support a dark theme.
- Secondary color: Use a lighter shade of gray for cards and panels to provide contrast.
- Accent color: Use #E10E37 to highlight important actions and alerts.
- Clear, sans-serif fonts (default) to ensure readability and a modern feel.
- Consistent, simple icons for asset types, statuses, and actions, using a single consistent style.
- Clean, card-based design for asset and process listings, and a tabbed interface for detailed views to organize information effectively.
- Use ShadCN UI library for a modern and accessible design system.