import { useState, useMemo, useRef } from "react";
import { useDatasets, useDataset } from "@/hooks/use-datasets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { BarChart3, Download, PieChart as PieIcon, LineChart as LineIcon, Activity } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

type ChartType = 'bar' | 'line' | 'scatter' | 'pie';

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#d946ef', '#f43f5e'];

export default function Visualize() {
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const urlId = searchParams.get('id') ? parseInt(searchParams.get('id')!) : null;
  
  const [selectedId, setSelectedId] = useState<number | null>(urlId);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisKey, setXAxisKey] = useState<string>('');
  const [yAxisKey, setYAxisKey] = useState<string>('');
  
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: datasets, isLoading: loadingList } = useDatasets();
  const { data: dataset, isLoading: loadingDataset } = useDataset(selectedId);

  const handleDatasetChange = (val: string) => {
    setSelectedId(parseInt(val));
    setXAxisKey('');
    setYAxisKey('');
    
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('id', val);
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, { 
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        scale: 2
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${dataset?.name || 'chart'}_${chartType}.png`;
      link.href = url;
      link.click();
      toast({ title: "Export réussi", description: "Le graphique a été enregistré en PNG." });
    } catch (err) {
      toast({ title: "Échec de l’export", description: "Impossible de générer l’image PNG.", variant: "destructive" });
    }
  };

  const columns = useMemo(() => {
    if (!dataset || !Array.isArray(dataset.columns)) return [];
    return dataset.columns as { key: string, name: string, type: string }[];
  }, [dataset]);

  const numericColumns = columns.filter(c => c.type === 'number');

  // If columns load and selections are empty, auto-select defaults
  if (columns.length > 0 && !xAxisKey && !yAxisKey) {
    setXAxisKey(columns[0].key);
    if (numericColumns.length > 0) {
      setYAxisKey(numericColumns[0].key);
    }
  }

  // Optimize: take up to 1000 rows for rendering to avoid breaking the browser
  const chartData = useMemo(() => {
    if (!dataset || !Array.isArray(dataset.data)) return [];
    const data = dataset.data as Record<string, any>[];
    return data.slice(0, 1000); 
  }, [dataset]);

  const renderChart = (): JSX.Element => {
    if (!xAxisKey || !yAxisKey || chartData.length === 0) return <></>;

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey={xAxisKey} angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey={yAxisKey} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey={xAxisKey} angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--card)' }} />
            <Legend />
            <Line type="monotone" dataKey={yAxisKey} stroke="var(--chart-2)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
          </LineChart>
        );
      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey={xAxisKey} type="category" name={xAxisKey} angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
            <YAxis dataKey={yAxisKey} type="number" name={yAxisKey} tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px' }} />
            <Legend />
            <Scatter name={dataset?.name} data={chartData} fill="var(--chart-4)" />
          </ScatterChart>
        );
      case 'pie': {
        // Prepare pie data (aggregate by xAxisKey)
        const pieDataMap = chartData.reduce((acc, row) => {
          const key = String(row[xAxisKey] || 'Unknown');
          const val = Number(row[yAxisKey] || 0);
          acc[key] = (acc[key] || 0) + val;
          return acc;
        }, {} as Record<string, number>);
        
        const pieData = Object.entries(pieDataMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a,b) => b.value - a.value)
          .slice(0, 10); // top 10 for readability

        return (
          <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <Tooltip contentStyle={{ borderRadius: '8px' }} />
            <Legend />
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={130}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      }
      default:
        return <></>;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Visualisations</h1>
          <p className="text-muted-foreground mt-1">Générez des graphiques à partir de vos données.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {loadingList ? (
             <Skeleton className="h-10 w-64" />
          ) : (
            <Select value={selectedId?.toString() || ""} onValueChange={handleDatasetChange}>
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
          <h3 className="text-xl font-medium text-foreground">Prêt à visualiser</h3>
          <p className="text-muted-foreground mt-2">Sélectionnez un jeu de données pour commencer.</p>
        </div>
      ) : loadingDataset ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
          <div className="md:col-span-1 space-y-4">
             <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="md:col-span-3">
             <Skeleton className="h-full min-h-[400px] w-full rounded-xl" />
          </div>
        </div>
      ) : dataset ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 items-start">
          
          {/* Controls Panel */}
          <Card className="lg:col-span-1 border-border/50 shadow-lg bg-card">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg">Paramètres du graphique</CardTitle>
              <CardDescription>Configurez votre visualisation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Type de graphique</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={chartType === 'bar' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setChartType('bar')}
                    className="w-full justify-start shadow-sm"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" /> Barres
                  </Button>
                  <Button 
                    variant={chartType === 'line' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setChartType('line')}
                    className="w-full justify-start shadow-sm"
                  >
                    <LineIcon className="w-4 h-4 mr-2" /> Ligne
                  </Button>
                  <Button 
                    variant={chartType === 'scatter' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setChartType('scatter')}
                    className="w-full justify-start shadow-sm"
                  >
                    <Activity className="w-4 h-4 mr-2" /> Nuage
                  </Button>
                  <Button 
                    variant={chartType === 'pie' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setChartType('pie')}
                    className="w-full justify-start shadow-sm"
                  >
                    <PieIcon className="w-4 h-4 mr-2" /> Camembert
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Axe X (catégorie/libellé)</label>
                <Select value={xAxisKey} onValueChange={setXAxisKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(c => (
                      <SelectItem key={`x-${c.key}`} value={c.key}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Axe Y (mesure)</label>
                <Select value={yAxisKey} onValueChange={setYAxisKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une colonne numérique" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.length === 0 ? (
                      <SelectItem value="none" disabled>Aucune colonne numérique</SelectItem>
                    ) : (
                      numericColumns.map(c => (
                        <SelectItem key={`y-${c.key}`} value={c.key}>{c.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {numericColumns.length === 0 && (
                  <p className="text-xs text-destructive mt-1">Ce jeu de données ne contient pas de colonnes numériques pour l’axe Y.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chart Display */}
          <Card className="lg:col-span-3 h-full min-h-[500px] border-border/50 shadow-xl overflow-hidden bg-card flex flex-col">
            <CardHeader className="border-b bg-muted/10 pb-4">
              <CardTitle className="text-xl font-display">
                {dataset.name} —{" "}
                {chartType === "bar"
                  ? "Graphique en barres"
                  : chartType === "line"
                    ? "Graphique en ligne"
                    : chartType === "scatter"
                      ? "Nuage de points"
                      : "Diagramme circulaire"}
              </CardTitle>
              <CardDescription>
                {chartData.length >= 1000 ? (
                  <span className="text-amber-500 font-medium">Affichage des 1000 premières lignes pour les performances.</span>
                ) : (
                  `Affichage de ${chartData.length} lignes.`
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-6" ref={chartRef}>
              {xAxisKey && yAxisKey && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                  {renderChart()}
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground min-h-[400px]">
                  <Activity className="w-12 h-12 mb-3 opacity-20" />
                  <p>
                    {!xAxisKey || !yAxisKey
                      ? "Veuillez choisir les axes X et Y pour afficher le graphique."
                      : "Aucune donnée disponible pour afficher un graphique."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
