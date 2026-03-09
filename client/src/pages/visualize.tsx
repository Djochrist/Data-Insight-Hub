import { useEffect, useMemo, useRef, useState } from "react";
import { useDataset, useDatasets } from "@/hooks/use-datasets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3, Download, Sigma } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { buildBoxPlotData, buildFrequencyPolygon, buildHistogram, getMissingCount, getNumericValues, summarizeNumeric } from "@/lib/statistics";

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 4,
  }).format(value);
}

export default function Visualize() {
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const urlId = searchParams.get("id") ? parseInt(searchParams.get("id")!, 10) : null;

  const [selectedId, setSelectedId] = useState<number | null>(urlId);
  const [columnKey, setColumnKey] = useState<string>("");
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: datasets, isLoading: loadingList } = useDatasets();
  const { data: dataset, isLoading: loadingDataset } = useDataset(selectedId);

  const numericColumns = useMemo(() => {
    return dataset?.columns.filter((column) => column.type === "number") ?? [];
  }, [dataset]);

  useEffect(() => {
    if (!numericColumns.length) {
      setColumnKey("");
      return;
    }

    const stillExists = numericColumns.some((column) => column.key === columnKey);
    if (!stillExists) {
      setColumnKey(numericColumns[0].key);
    }
  }, [columnKey, numericColumns]);

  const rows = useMemo(() => {
    return Array.isArray(dataset?.data) ? dataset.data : [];
  }, [dataset]);

  const values = useMemo(() => {
    return columnKey ? getNumericValues(rows, columnKey) : [];
  }, [columnKey, rows]);

  const missingCount = useMemo(() => {
    return columnKey ? getMissingCount(rows, columnKey) : 0;
  }, [columnKey, rows]);

  const summary = useMemo(() => {
    return summarizeNumeric(values, missingCount);
  }, [missingCount, values]);

  const histogramData = useMemo(() => buildHistogram(values), [values]);
  const polygonData = useMemo(() => buildFrequencyPolygon(values), [values]);
  const boxPlotData = useMemo(() => (summary ? buildBoxPlotData(summary) : []), [summary]);

  const handleDatasetChange = (value: string) => {
    setSelectedId(parseInt(value, 10));
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("id", value);
    window.history.pushState({}, "", newUrl.toString());
  };

  const handleExportPNG = async () => {
    if (!chartRef.current) {
      return;
    }

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#f8fafc",
        scale: 2,
      });

      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${dataset?.name || "statistiques"}_${columnKey || "colonne"}.png`;
      link.href = url;
      link.click();

      toast({
        title: "Export réussi",
        description: "Le visuel a été exporté au format PNG.",
      });
    } catch {
      toast({
        title: "Échec de l’export",
        description: "Impossible de générer l’image PNG.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Analyse descriptive</h1>
          <p className="text-muted-foreground mt-1">
            Mesures de tendance centrale, dispersion et distribution des variables quantitatives.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {loadingList ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <Select value={selectedId?.toString() || ""} onValueChange={handleDatasetChange}>
              <SelectTrigger className="w-full sm:w-72 bg-card shadow-sm">
                <SelectValue placeholder="Choisir un jeu de données" />
              </SelectTrigger>
              <SelectContent>
                {datasets?.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {summary && (
            <Button variant="secondary" onClick={handleExportPNG} className="shadow-md">
              <Download className="w-4 h-4 mr-2" />
              Exporter en PNG
            </Button>
          )}
        </div>
      </div>

      {!selectedId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl bg-muted/20">
          <BarChart3 className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium text-foreground">Sélectionnez un jeu de données</h3>
          <p className="text-muted-foreground mt-2">L’analyse porte uniquement sur les colonnes numériques détectées.</p>
        </div>
      ) : loadingDataset ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
          <div className="md:col-span-1 space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="md:col-span-3 space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      ) : dataset ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 items-start">
          <Card className="lg:col-span-1 border-border/50 shadow-lg bg-card">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg">Variables quantitatives</CardTitle>
              <CardDescription>
                {numericColumns.length} colonne(s) numérique(s) disponible(s) dans {dataset.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Colonne à analyser</label>
                <Select value={columnKey} onValueChange={setColumnKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une colonne numérique" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        Aucune colonne numérique
                      </SelectItem>
                    ) : (
                      numericColumns.map((column) => (
                        <SelectItem key={column.key} value={column.key}>
                          {column.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                Les fichiers importés sont conservés dans ce navigateur afin de rester disponibles entre deux sessions.
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-6" ref={chartRef}>
            {!summary ? (
              <Card className="min-h-[360px] flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-25" />
                  <p>Aucune donnée quantitative valide à afficher pour cette colonne.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MetricCard title="Moyenne" value={formatNumber(summary.mean)} help="Valeur moyenne" />
                  <MetricCard title="Médiane" value={formatNumber(summary.median)} help="50e percentile" />
                  <MetricCard title="Écart-type" value={formatNumber(summary.standardDeviation)} help="Dispersion" />
                  <MetricCard title="IQR" value={formatNumber(summary.iqr)} help="Q3 - Q1" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card className="border-border/50 shadow-lg">
                    <CardHeader>
                      <CardTitle>Résumé statistique</CardTitle>
                      <CardDescription>Indicateurs descriptifs pour la variable `{columnKey}`</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <StatLine label="Observations" value={formatNumber(summary.count)} />
                        <StatLine label="Valeurs manquantes" value={formatNumber(summary.missing)} />
                        <StatLine label="Minimum" value={formatNumber(summary.min)} />
                        <StatLine label="Maximum" value={formatNumber(summary.max)} />
                        <StatLine label="Étendue" value={formatNumber(summary.range)} />
                        <StatLine label="Variance" value={formatNumber(summary.variance)} />
                        <StatLine label="Q1" value={formatNumber(summary.q1)} />
                        <StatLine label="Q3" value={formatNumber(summary.q3)} />
                        <StatLine label="Somme" value={formatNumber(summary.sum)} />
                        <StatLine label="Mode" value={formatNumber(summary.mode)} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 shadow-lg">
                    <CardHeader>
                      <CardTitle>Boîte à moustaches</CardTitle>
                      <CardDescription>Lecture synthétique des quartiles et de la dispersion</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={boxPlotData}
                          margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis type="number" domain={[summary.min, summary.max]} />
                          <YAxis type="category" dataKey="name" hide />
                          <Tooltip
                            formatter={(value: number) => formatNumber(value)}
                            labelFormatter={() => "Distribution"}
                          />
                          <ReferenceArea x1={summary.q1} x2={summary.q3} fill="hsl(var(--chart-1) / 0.18)" />
                          <ReferenceLine x={summary.median} stroke="hsl(var(--chart-4))" strokeWidth={3} />
                          <ReferenceLine x={summary.min} stroke="hsl(var(--foreground) / 0.4)" />
                          <ReferenceLine x={summary.max} stroke="hsl(var(--foreground) / 0.4)" />
                          <Line dataKey="min" stroke="transparent" dot={false} activeDot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card className="border-border/50 shadow-lg">
                    <CardHeader>
                      <CardTitle>Histogramme</CardTitle>
                      <CardDescription>Répartition des fréquences de la variable étudiée</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[360px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={histogramData} margin={{ top: 12, right: 18, left: 0, bottom: 28 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="label" angle={-20} textAnchor="end" height={52} interval={0} fontSize={11} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="frequency" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 shadow-lg">
                    <CardHeader>
                      <CardTitle>Polygone de fréquences</CardTitle>
                      <CardDescription>Lecture de la forme générale de la distribution</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[360px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={polygonData} margin={{ top: 12, right: 18, left: 0, bottom: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="x" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <ReferenceLine x={summary.mean} stroke="hsl(var(--chart-3))" strokeDasharray="6 4" />
                          <ReferenceLine x={summary.median} stroke="hsl(var(--chart-4))" strokeDasharray="3 3" />
                          <Line type="monotone" dataKey="frequency" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ title, value, help }: { title: string; value: string; help: string }) {
  return (
    <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Sigma className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-display font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{help}</p>
      </CardContent>
    </Card>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}
