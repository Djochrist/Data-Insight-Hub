import { Link } from "wouter";
import { useDatasets, useDeleteDataset } from "@/hooks/use-datasets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Database, 
  FileSpreadsheet, 
  BarChart2, 
  ArrowRight, 
  Trash2, 
  Calendar,
  Layers,
  UploadCloud,
  TableProperties
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: datasets, isLoading } = useDatasets();
  const deleteDataset = useDeleteDataset();
  const { toast } = useToast();

  const totalDatasets = datasets?.length || 0;
  
  // Calculate total rows robustly
  const totalRows = datasets?.reduce((acc, d) => {
    const dataArray = Array.isArray(d.data) ? d.data : [];
    return acc + dataArray.length;
  }, 0) || 0;

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteDataset.mutateAsync(id);
        toast({ title: "Dataset deleted", description: `"${name}" has been removed.` });
      } catch (err) {
        toast({ title: "Error", description: "Failed to delete dataset.", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-lg">Overview of your data workspace and recent uploads.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover-elevate bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Datasets</CardTitle>
            <Database className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">
              {isLoading ? <Skeleton className="h-9 w-16" /> : totalDatasets}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available in workspace</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate bg-gradient-to-br from-card to-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Data Rows</CardTitle>
            <Layers className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">
              {isLoading ? <Skeleton className="h-9 w-24" /> : totalRows.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Parsed and indexed</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2 opacity-90">
            <CardTitle className="text-sm font-medium">Quick Action</CardTitle>
            <UploadCloudIcon className="w-4 h-4" />
          </CardHeader>
          <CardContent className="flex flex-col justify-end h-full pt-4">
            <Button asChild variant="secondary" className="w-full font-semibold shadow-lg">
              <Link href="/upload">Upload New Dataset</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Datasets */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display border-b pb-2">Recent Datasets</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : datasets?.length === 0 ? (
          <div className="text-center py-16 px-4 border-2 border-dashed rounded-2xl bg-muted/20">
            <Database className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No datasets yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Upload your first CSV file to start exploring and visualizing your data.</p>
            <Button asChild>
              <Link href="/upload">Upload Dataset</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {datasets?.slice(0, 6).map((dataset) => (
              <Card key={dataset.id} className="hover-elevate flex flex-col group border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-primary" />
                        {dataset.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3" />
                        {dataset.createdAt ? format(new Date(dataset.createdAt), 'MMM d, yyyy') : 'Recently'}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
                      onClick={() => handleDelete(dataset.id, dataset.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="bg-muted px-2.5 py-1 rounded-md">
                      <span className="font-semibold text-foreground">{Array.isArray(dataset.columns) ? dataset.columns.length : 0}</span> Columns
                    </div>
                    <div className="bg-muted px-2.5 py-1 rounded-md">
                      <span className="font-semibold text-foreground">{Array.isArray(dataset.data) ? dataset.data.length.toLocaleString() : 0}</span> Rows
                    </div>
                  </div>
                </CardContent>
                <div className="px-6 pb-6 pt-0 flex gap-3 mt-auto">
                  <Button asChild variant="outline" className="flex-1 shadow-sm">
                    <Link href={`/explore?id=${dataset.id}`}>
                      <TableProperties className="w-4 h-4 mr-2" />
                      Explore
                    </Link>
                  </Button>
                  <Button asChild className="flex-1 shadow-sm shadow-primary/20">
                    <Link href={`/visualize?id=${dataset.id}`}>
                      <BarChart2 className="w-4 h-4 mr-2" />
                      Visualize
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Temporary icon to avoid importing UploadCloud if missed above
function UploadCloudIcon(props: any) {
  return <UploadCloud {...props} />;
}
