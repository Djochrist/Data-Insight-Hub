import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, UploadCloud, TableProperties, BarChart3, Database } from "lucide-react";

const navItems = [
  { title: "Tableau de bord", path: "/", icon: LayoutDashboard },
  { title: "Importer des données", path: "/upload", icon: UploadCloud },
  { title: "Explorateur de données", path: "/explore", icon: TableProperties },
  { title: "Visualisations", path: "/visualize", icon: BarChart3 },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar variant="sidebar" className="border-r">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <Database className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-400">
            NexusData
          </span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Espace de travail
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.title}
                      className="transition-colors duration-200"
                    >
                      <Link href={item.path} className="flex items-center gap-3 py-2.5">
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 text-xs text-muted-foreground border-t space-y-2">
        <div className="text-center">NexusData Analytics © 2026</div>
      </SidebarFooter>
    </Sidebar>
  );
}
