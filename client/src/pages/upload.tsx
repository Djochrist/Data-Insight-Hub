import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import Papa from "papaparse";
import { useCreateDataset } from "@/hooks/use-datasets";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, FileType, CheckCircle2, AlertCircle } from "lucide-react";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createDataset = useCreateDataset();
  
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid CSV file.",
        variant: "destructive"
      });
      return;
    }
    setFile(selectedFile);
    parseAndUpload(selectedFile);
  };

  const parseAndUpload = (selectedFile: File) => {
    setParsing(true);
    setProgress(10); // Start progress visually

    Papa.parse(selectedFile, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true, // Use web worker for better UI performance
      step: (results, parser) => {
        // We could track progress here for massive files if needed
      },
      complete: async (results) => {
        setProgress(50);
        
        if (results.errors.length > 0) {
          console.warn("Parse errors:", results.errors);
        }

        const data = results.data;
        if (data.length === 0) {
          toast({ title: "Error", description: "CSV file is empty", variant: "destructive" });
          setParsing(false);
          return;
        }

        setProgress(70);

        try {
          // Infer schema from the first valid row
          const firstRow = data[0] as Record<string, unknown>;
          const columns = Object.keys(firstRow).map((key) => ({
            key,
            name: key,
            type: typeof firstRow[key] === 'number' ? 'number' : 'string'
          }));

          const datasetName = selectedFile.name.replace(/\.[^/.]+$/, ""); // remove extension

          setProgress(90);

          await createDataset.mutateAsync({
            name: datasetName,
            columns,
            data
          });

          setProgress(100);
          toast({
            title: "Success!",
            description: `Dataset "${datasetName}" uploaded successfully (${data.length} rows).`,
          });
          
          setTimeout(() => {
            setLocation("/");
          }, 1000);

        } catch (error: any) {
          toast({
            title: "Upload failed",
            description: error.message || "An error occurred while saving the dataset.",
            variant: "destructive"
          });
          setParsing(false);
          setFile(null);
          setProgress(0);
        }
      },
      error: (error) => {
        toast({
          title: "Parsing failed",
          description: error.message,
          variant: "destructive"
        });
        setParsing(false);
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
        <h1 className="text-4xl font-display font-bold text-foreground">Upload Data</h1>
        <p className="text-lg text-muted-foreground">Upload a CSV file to begin your analysis.</p>
      </div>

      <Card className="overflow-hidden border-2 shadow-xl shadow-primary/5">
        <CardContent className="p-0">
          <div
            className={`
              relative p-16 flex flex-col items-center justify-center transition-all duration-300
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
                  Drag & Drop your CSV
                </h3>
                <p className="text-muted-foreground mb-6 text-center max-w-sm">
                  Support for large files. Data is parsed securely in your browser before upload.
                </p>
                <Button size="lg" className="shadow-lg shadow-primary/20">
                  Browse Files
                </Button>
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
                    {progress === 100 ? "Upload Complete" : "Processing Dataset..."}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate px-4">
                    {file?.name}
                  </p>
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
    </div>
  );
}
