import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Lock, BarChart3, UploadCloud, ShieldCheck } from "lucide-react";

export default function About() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">À propos</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Data Insight Hub est une application d’analyse descriptive conçue pour explorer rapidement des fichiers CSV et produire des indicateurs statistiques fiables sur les variables quantitatives.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <InfoCard
          icon={UploadCloud}
          title="Import des fichiers"
          description="Les fichiers CSV sont importés directement depuis le navigateur. L’application vérifie leur format, leur taille et leur volume avant traitement."
        />
        <InfoCard
          icon={BarChart3}
          title="Analyse statistique"
          description="Les colonnes numériques sont détectées automatiquement afin de calculer les mesures de tendance centrale, de dispersion et de distribution."
        />
        <InfoCard
          icon={Database}
          title="Conservation locale"
          description="Les jeux de données sont conservés localement dans le navigateur pour rester disponibles entre deux sessions sur le même appareil."
        />
        <InfoCard
          icon={Lock}
          title="Confidentialité"
          description="Les données ne sont pas partagées et ne sont pas envoyées vers une base distante dans la version actuelle de l’application."
        />
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Comment fonctionne l’application</CardTitle>
          <CardDescription>Vue d’ensemble du parcours utilisateur</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            1. Vous importez un fichier CSV depuis la page d’import.
          </p>
          <p>
            2. L’application vérifie la taille du fichier, le nombre de lignes, le nombre de colonnes et la capacité de stockage disponible dans le navigateur.
          </p>
          <p>
            3. Les variables numériques sont identifiées automatiquement afin de préparer l’analyse descriptive.
          </p>
          <p>
            4. Les jeux de données peuvent ensuite être consultés dans l’explorateur et analysés dans la section statistique.
          </p>
          <p>
            5. Les visuels peuvent être exportés au format PNG pour une réutilisation rapide dans un rapport ou une présentation.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-gradient-to-br from-card to-primary/5 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Ce que cette version fait
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            Cette version est adaptée à l’exploration locale, à la visualisation descriptive et à l’analyse rapide de fichiers quantitatifs.
          </p>
          <p>
            Pour des traitements avancés, des analyses qualitatives ou un accompagnement personnalisé, un contact direct peut être proposé depuis la page d’import.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UploadCloud;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
