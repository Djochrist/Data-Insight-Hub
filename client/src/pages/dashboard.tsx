import { Link } from "wouter";
import { useDatasets, useDeleteDataset } from "@/hooks/use-datasets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Database, 
  FileSpreadsheet, 
  BarChart2, 
  Trash2, 
  Calendar,
  Layers,
  UploadCloud,
  TableProperties,
  ChevronRight
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: datasets, isLoading } = useDatasets();
  const deleteDataset = useDeleteDataset();
  const { toast } = useToast();

  const totalDatasets = datasets?.length || 0;
  const quantitativeDatasets = datasets?.filter((dataset) =>
    dataset.columns.some((column) => column.type === "number"),
  ).length || 0;
  const totalNumericColumns = datasets?.reduce((acc, dataset) => {
    return acc + dataset.columns.filter((column) => column.type === "number").length;
  }, 0) || 0;
  
  const totalRows = datasets?.reduce((acc, d) => {
    const dataArray = Array.isArray(d.data) ? d.data : [];
    return acc + dataArray.length;
  }, 0) || 0;

  const overviewCards = [
    {
      title: "Total des jeux de données",
      value: totalDatasets,
      description: "Disponibles dans cette session de travail",
      icon: Database,
      iconClassName: "text-primary bg-primary/10",
      skeletonClassName: "h-9 w-16",
    },
    {
      title: "Jeux quantitatifs",
      value: quantitativeDatasets,
      description: "Exploitables pour l’analyse descriptive",
      icon: Layers,
      iconClassName: "text-emerald-600 bg-emerald-500/10",
      skeletonClassName: "h-9 w-24",
    },
    {
      title: "Colonnes numériques",
      value: totalNumericColumns,
      description: `${totalRows.toLocaleString()} lignes enregistrées dans le navigateur`,
      icon: BarChart2,
      iconClassName: "text-amber-600 bg-amber-500/10",
      skeletonClassName: "h-9 w-24",
    },
  ];

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Voulez-vous vraiment supprimer « ${name} » ?`)) {
      try {
        await deleteDataset.mutateAsync(id);
        toast({ title: "Jeu de données supprimé", description: `« ${name} » a été supprimé.` });
      } catch (err) {
        toast({ title: "Erreur", description: "Impossible de supprimer le jeu de données.", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-2 text-lg">Vue d’ensemble des fichiers importés et des variables disponibles pour l’analyse.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {overviewCards.map((item) => (
          <OverviewCard
            key={item.title}
            title={item.title}
            value={item.value}
            description={item.description}
            icon={item.icon}
            iconClassName={item.iconClassName}
            isLoading={isLoading}
            skeletonClassName={item.skeletonClassName}
          />
        ))}

        <Card className="hover-elevate flex h-full flex-col border-border/60 bg-card shadow-sm">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloudIcon className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl">Ajouter un nouveau fichier CSV</CardTitle>
              <CardDescription className="text-sm leading-6">
                Importez vos données pour générer immédiatement les indicateurs descriptifs et les visuels statistiques.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button
              asChild
              size="lg"
              className="h-auto w-full justify-between gap-3 rounded-xl px-5 py-4 text-left whitespace-normal"
            >
              <Link href="/upload">
                <span className="min-w-0 flex-1 leading-5">Importer un jeu de données</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display border-b pb-2">Jeux de données récents</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : datasets?.length === 0 ? (
          <div className="text-center py-16 px-4 border-2 border-dashed rounded-2xl bg-muted/20">
            <Database className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Aucun jeu de données</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Importez un fichier CSV pour consulter vos données et produire les premiers indicateurs.</p>
            <Button asChild>
              <Link href="/upload">Importer un CSV</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {datasets?.slice(0, 6).map((dataset) => (
              <Card key={dataset.id} className="hover-elevate flex flex-col group border-border/60 bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <FileSpreadsheet className="w-4 h-4" />
                        </span>
                        {dataset.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3" />
                        {dataset.createdAt ? format(new Date(dataset.createdAt), "d MMM yyyy", { locale: fr }) : "Récemment"}
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
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="rounded-lg bg-muted px-3 py-1.5">
                      <span className="font-semibold text-foreground">{Array.isArray(dataset.columns) ? dataset.columns.length : 0}</span> Colonnes
                    </div>
                    <div className="rounded-lg bg-muted px-3 py-1.5">
                      <span className="font-semibold text-foreground">{Array.isArray(dataset.data) ? dataset.data.length.toLocaleString() : 0}</span> Lignes
                    </div>
                    <div className="rounded-lg bg-muted px-3 py-1.5">
                      <span className="font-semibold text-foreground">
                        {dataset.columns.filter((column) => column.type === "number").length}
                      </span>{" "}
                      Num.
                    </div>
                  </div>
                </CardContent>
                <div className="px-6 pb-6 pt-0 flex gap-3 mt-auto">
                  <Button asChild variant="outline" className="flex-1 shadow-sm">
                    <Link href={`/explore?id=${dataset.id}`}>
                      <TableProperties className="w-4 h-4 mr-2" />
                      Explorer
                    </Link>
                  </Button>
                  <Button asChild className="flex-1 shadow-sm shadow-primary/20">
                    <Link href={`/visualize?id=${dataset.id}`}>
                      <BarChart2 className="w-4 h-4 mr-2" />
                      Visualiser
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

function UploadCloudIcon(props: any) {
  return <UploadCloud {...props} />;
}

function OverviewCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  isLoading,
  skeletonClassName,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  isLoading: boolean;
  skeletonClassName: string;
}) {
  return (
    <Card className="hover-elevate border-border/60 bg-card shadow-sm">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardDescription className="text-sm font-medium text-muted-foreground">{title}</CardDescription>
            <CardTitle className="text-3xl font-display">
              {isLoading ? <Skeleton className={skeletonClassName} /> : value}
            </CardTitle>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
