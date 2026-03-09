import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Explorer from "@/pages/explorer";
import Visualize from "@/pages/visualize";
import About from "@/pages/about";
import { AppSidebar } from "@/components/app-sidebar";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/upload" component={Upload}/>
      <Route path="/explore" component={Explorer}/>
      <Route path="/visualize" component={Visualize}/>
      <Route path="/about" component={About}/>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function getPageTitle(path: string) {
  if (path === "/") return "Tableau de bord";
  if (path.startsWith("/upload")) return "Importer";
  if (path.startsWith("/explore")) return "Explorateur";
  if (path.startsWith("/visualize")) return "Analyse statistique";
  if (path.startsWith("/about")) return "À propos";
  return "Data Insight Hub";
}

function App() {
  const [currentPath] = useLocation();
  const sidebarStyle = {
    "--sidebar-width": "16rem",
  } as React.CSSProperties;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={sidebarStyle}>
          <div className="flex min-h-screen w-full bg-background text-foreground">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-card/85 px-4 backdrop-blur-md md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <SidebarTrigger className="h-9 w-9 rounded-xl border border-border bg-background/80 hover:bg-accent" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground md:text-base">
                      {getPageTitle(currentPath)}
                    </p>
                    <p className="hidden text-xs text-muted-foreground md:block">
                      Plateforme locale d’analyse descriptive
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground md:text-sm">
                  <span className="hidden sm:inline">CSV quantitatifs</span>
                </div>
              </header>
              <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative">
                 <AppRoutes />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
