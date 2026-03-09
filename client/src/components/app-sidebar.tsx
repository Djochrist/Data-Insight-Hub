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
  useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, UploadCloud, TableProperties, BarChart3, Database, Info } from "lucide-react";

const navItems = [
  { title: "Tableau de bord", path: "/", icon: LayoutDashboard },
  { title: "Importer des données", path: "/upload", icon: UploadCloud },
  { title: "Explorateur de données", path: "/explore", icon: TableProperties },
  { title: "Analyse statistique", path: "/visualize", icon: BarChart3 },
  { title: "À propos", path: "/about", icon: Info },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar variant="sidebar" className="border-r bg-sidebar/95">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-sidebar-accent/60 px-3 py-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-bold tracking-tight text-sidebar-foreground">
              Data Insight Hub
            </div>
            <div className="text-xs text-sidebar-foreground/70">
              Analyse descriptive des données
            </div>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-3 py-4">
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
                      size="lg"
                      className="rounded-xl px-3 transition-colors duration-200"
                    >
                      <Link href={item.path} className="flex items-center gap-3 py-2.5" onClick={handleNavClick}>
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
      
      <SidebarFooter className="border-t p-4 text-xs text-muted-foreground">
        <div className="rounded-xl bg-sidebar-accent/50 px-3 py-3 text-center leading-5">
          Data Insight Hub © 2026
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
