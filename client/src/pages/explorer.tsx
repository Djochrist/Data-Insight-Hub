import { useState, useMemo } from "react";
import { useDatasets, useDataset } from "@/hooks/use-datasets";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableProperties, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Papa from "papaparse";

export default function Explorer() {
  const searchParams = new URLSearchParams(window.location.search);
  const urlId = searchParams.get('id') ? parseInt(searchParams.get('id')!) : null;
  
  const [selectedId, setSelectedId] = useState<number | null>(urlId);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: datasets, isLoading: loadingList } = useDatasets();
  const { data: dataset, isLoading: loadingDataset } = useDataset(selectedId);

  const handleDatasetChange = (val: string) => {
    setSelectedId(parseInt(val));
    setPage(1);
    // Update URL without reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('id', val);
    window.history.pushState({}, '', newUrl.toString());
  };

  const exportCsv = () => {
    if (!dataset || !dataset.data) return;
    const csv = Papa.unparse(dataset.data as any[]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${dataset.name}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo(() => {
    if (!dataset || !Array.isArray(dataset.columns)) return [];
    return dataset.columns as { key: string, name: string, type: string }[];
  }, [dataset]);

  const rows = useMemo(() => {
    if (!dataset || !Array.isArray(dataset.data)) return [];
    return dataset.data as Record<string, any>[];
  }, [dataset]);

  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Explorateur de données</h1>
          <p className="text-muted-foreground mt-1">Consultez le contenu du fichier importé, ligne par ligne.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {loadingList ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <Select 
              value={selectedId?.toString() || ""} 
              onValueChange={handleDatasetChange}
            >
              <SelectTrigger className="w-full sm:w-64 bg-card shadow-sm">
                <SelectValue placeholder="Choisir un jeu de données" />
              </SelectTrigger>
              <SelectContent>
                {datasets?.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {dataset && (
            <Button variant="outline" onClick={exportCsv} className="shrink-0" title="Exporter en CSV">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          )}
        </div>
      </div>

      {!selectedId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl bg-muted/20">
          <TableProperties className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium text-foreground">Aucun jeu de données sélectionné</h3>
          <p className="text-muted-foreground mt-2">Sélectionnez un fichier dans la liste pour afficher son contenu.</p>
        </div>
      ) : loadingDataset ? (
        <Card className="flex-1 p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </Card>
      ) : dataset ? (
        <Card className="flex-1 flex flex-col overflow-hidden border border-border/50 shadow-lg bg-card">
          <div className="overflow-auto flex-1 p-0 relative">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} className="font-semibold text-foreground whitespace-nowrap">
                      {col.name}
                      <span className="text-xs text-muted-foreground ml-2 font-mono font-normal">
                        {col.type}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                      Aucune donnée disponible.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                      {columns.map((col) => (
                        <TableCell key={`${i}-${col.key}`} className="max-w-[300px] truncate">
                          {row[col.key] !== null && row[col.key] !== undefined 
                            ? String(row[col.key]) 
                            : <span className="text-muted-foreground italic">null</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="border-t p-4 flex items-center justify-between bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Affichage <span className="font-medium text-foreground">{rows.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> à <span className="font-medium text-foreground">{Math.min(page * pageSize, rows.length)}</span> sur <span className="font-medium text-foreground">{rows.length}</span> lignes
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Préc.
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                Suiv. <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
