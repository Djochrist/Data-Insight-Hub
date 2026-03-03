## Packages
papaparse | Client-side parsing of CSV files for optimal performance and handling large datasets
@types/papaparse | TypeScript definitions for papaparse
html2canvas | Exporting generated charts as PNG images
recharts | (Already installed but ensuring it's available) for rendering interactive data visualizations

## Notes
- CSV Parsing happens purely on the client-side to avoid sending raw files to the server.
- The parsed data and inferred column schemas are sent to the `POST /api/datasets` endpoint as JSON.
- For huge datasets, Recharts might experience performance hits. A client-side data sampling/limiting approach is applied (e.g., first 1000 rows) for visualization if datasets are exceptionally large.
