import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import Papa from "papaparse";
import { useCreateDataset } from "@/hooks/use-datasets";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, FileType, CheckCircle2 } from "lucide-react";
import type { DatasetColumn, DatasetRow } from "@/lib/datasets";
import { estimateStoredDatasetsSize, getSafeStorageLimit } from "@/lib/datasets";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_ROW_COUNT = 25000;
const MAX_COLUMN_COUNT = 60;
const MAX_ESTIMATED_IMPORT_BYTES = 3 * 1024 * 1024;

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} o`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} Ko`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

function inferColumns(rows: DatasetRow[]): DatasetColumn[] {
  const firstRow = rows[0] ?? {};

  return Object.keys(firstRow).map((key) => {
    const values = rows
      .map((row) => row[key])
      .filter((value) => value !== null && value !== undefined && value !== "");

    const numericValues = values.filter((value) => typeof value === "number" && Number.isFinite(value));
    const isNumeric = values.length > 0 && numericValues.length === values.length;

    return {
      key,
      name: key,
      type: isNumeric ? "number" : "string",
    };
  });
}

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createDataset = useCreateDataset();
  
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("En attente");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "Fichier refusé",
        description: `Le fichier dépasse la limite autorisée de ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
        variant: "destructive"
      });
      return;
    }

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Type de fichier invalide",
        description: "Veuillez importer un fichier CSV valide.",
        variant: "destructive"
      });
      return;
    }
    setFile(selectedFile);
    setProgressLabel("Fichier prêt à être analysé");
    parseAndUpload(selectedFile);
  };

  const parseAndUpload = (selectedFile: File) => {
    setParsing(true);
    setProgress(10);
    setProgressLabel("Lecture du fichier");

    Papa.parse(selectedFile, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true,
      complete: async (results) => {
        setProgress(50);
        setProgressLabel("Vérification du contenu");
        
        if (results.errors.length > 0) {
          console.warn("Parse errors:", results.errors);
        }

        const data = results.data as DatasetRow[];
        if (data.length === 0) {
          toast({ title: "Erreur", description: "Le fichier CSV est vide", variant: "destructive" });
          setParsing(false);
          setFile(null);
          setProgress(0);
          return;
        }

        setProgress(70);
        setProgressLabel("Préparation de l’import");

        try {
          if (data.length > MAX_ROW_COUNT) {
            throw new Error(`Le fichier contient ${data.length.toLocaleString("fr-FR")} lignes. La limite autorisée est ${MAX_ROW_COUNT.toLocaleString("fr-FR")} lignes.`);
          }

          const columns = inferColumns(data);
          if (columns.length > MAX_COLUMN_COUNT) {
            throw new Error(`Le fichier contient ${columns.length} colonnes. La limite autorisée est ${MAX_COLUMN_COUNT} colonnes.`);
          }

          const numericColumns = columns.filter((column) => column.type === "number");

          if (numericColumns.length === 0) {
            throw new Error("Aucune colonne quantitative n’a été détectée. Importez un fichier contenant au moins une variable numérique.");
          }

          const estimatedImportSize = JSON.stringify({ columns, data }).length;
          const estimatedTotalSize = estimateStoredDatasetsSize() + estimatedImportSize;
          if (estimatedImportSize > MAX_ESTIMATED_IMPORT_BYTES || estimatedTotalSize > getSafeStorageLimit()) {
            throw new Error("Le volume de données est trop important pour un enregistrement local dans le navigateur.");
          }

          const datasetName = selectedFile.name.replace(/\.[^/.]+$/, "");

          setProgress(90);
          setProgressLabel("Enregistrement local");

          await createDataset.mutateAsync({
            name: datasetName,
            columns,
            data
          });

          setProgress(100);
          setProgressLabel("Import terminé");
          toast({
            title: "Succès",
            description: `« ${datasetName} » a été importé. ${numericColumns.length} colonne(s) numérique(s) détectée(s) sur ${columns.length}.`,
          });
          
          setTimeout(() => {
            setLocation("/");
          }, 1000);

        } catch (error: any) {
          toast({
            title: "Échec de l’import",
            description: error.message || "Une erreur est survenue lors de l’enregistrement du jeu de données.",
            variant: "destructive"
          });
          setParsing(false);
          setFile(null);
          setProgress(0);
          setProgressLabel("En attente");
        }
      },
      error: (error) => {
        toast({
          title: "Échec de l’analyse",
          description: error.message,
          variant: "destructive"
        });
        setParsing(false);
        setFile(null);
        setProgress(0);
        setProgressLabel("En attente");
      }
    });
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-display font-bold text-foreground">Importer des données</h1>
        <p className="text-lg text-muted-foreground">Importez un fichier CSV pour lancer l’analyse descriptive.</p>
      </div>

      <Card className="overflow-hidden border-2 shadow-xl shadow-primary/5">
        <CardContent className="p-0">
          <div
            className={`
              relative p-8 md:p-16 flex flex-col items-center justify-center transition-all duration-300
              ${isDragging ? 'bg-primary/5 border-primary border-dashed border-2' : 'bg-card border-dashed border-2 border-border'}
              ${parsing ? 'pointer-events-none opacity-90' : 'cursor-pointer hover:bg-accent/50'}
              min-h-[400px]
            `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !parsing && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => e.target.files && processFile(e.target.files[0])}
            />

            {!parsing ? (
              <>
                <div className={`p-6 rounded-full bg-primary/10 mb-6 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
                  <UploadCloud className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold font-display text-foreground mb-2">
                  Glissez-déposez votre CSV
                </h3>
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  Les données restent dans votre navigateur. Seules les colonnes numériques sont retenues pour l’analyse statistique.
                </p>
                {file && (
                  <div className="mb-2 rounded-2xl border bg-background/80 px-4 py-3 text-center text-sm text-muted-foreground">
                    <div className="font-medium text-foreground truncate">{file.name}</div>
                    <div>Poids du fichier : {formatBytes(file.size)}</div>
                  </div>
                )}
                <div className="flex flex-col items-center gap-4">
                  <Button
                    size="lg"
                    className="min-w-56 rounded-full px-8 shadow-lg shadow-primary/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <UploadCloud className="w-4 h-4" />
                    Importer les données
                  </Button>
                  <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
                    Fichier CSV uniquement
                    <br />
                    Taille maximale : {formatBytes(MAX_FILE_SIZE_BYTES)}
                    <br />
                    Limite recommandée : {MAX_ROW_COUNT.toLocaleString("fr-FR")} lignes et {MAX_COLUMN_COUNT} colonnes
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full max-w-md space-y-8 text-center">
                <div className="relative">
                  {progress === 100 ? (
                    <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto animate-in zoom-in duration-300" />
                  ) : (
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <FileType className="w-8 h-8 text-primary absolute inset-0 m-auto" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-bold">
                    {progress === 100 ? "Import terminé" : "Traitement en cours…"}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate px-4">
                    {file?.name}
                  </p>
                  <p className="text-sm text-foreground">
                    {progressLabel}
                  </p>
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      Poids du fichier : {formatBytes(file.size)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Progress value={progress} className="h-3 bg-muted" />
                  <p className="text-xs text-muted-foreground text-right font-mono">{progress}%</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border bg-card px-6 py-5 text-sm leading-6 text-muted-foreground shadow-sm">
        Pour des analyses qualitatives, des traitements avancés ou un accompagnement sur mesure, vous pouvez me contacter directement à{" "}
        <a className="font-medium text-primary underline-offset-4 hover:underline" href="mailto:djochristkfreelance@gmail.com">
          djochristkfreelance@gmail.com
        </a>
        .
      </div>
    </div>
  );
}
