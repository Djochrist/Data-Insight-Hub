import { Switch, Route } from "wouter";
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
import { AppSidebar } from "@/components/app-sidebar";
import { DevBanner } from "@/components/dev-banner";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/upload" component={Upload}/>
      <Route path="/explore" component={Explorer}/>
      <Route path="/visualize" component={Visualize}/>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
              <DevBanner />
              <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card/80 backdrop-blur-md px-4 sticky top-0 z-40">
                 <SidebarTrigger className="hover-elevate" />
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
