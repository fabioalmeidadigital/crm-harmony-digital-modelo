import { LayoutDashboard, Kanban, Users, BarChart3, Settings, CalendarDays, LogOut, MessageCircle, UserCircle, Sheet } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoImg from "@/assets/logo-branco.svg";
import logoIcon from "@/assets/logo-icon-white.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { isComercial, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({ display_name: null, avatar_url: null });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("unread_count")
        .eq("channel", "whatsapp")
        .eq("is_archived", false);
      const total = (data || []).reduce((s: number, c: any) => s + (c.unread_count || 0), 0);
      setUnread(total);
    };
    load();
    let t: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => { clearTimeout(t); t = setTimeout(load, 1500); };
    const ch = supabase
      .channel(`sidebar-unread-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, debounced)
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile({ display_name: data.display_name, avatar_url: data.avatar_url });
    };
    loadProfile();
    const ch = supabase
      .channel("sidebar-profile")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, loadProfile)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const items = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, show: true, badge: 0 },
    { title: "Inbox", url: "/inbox", icon: MessageCircle, show: true, badge: unread },
    { title: "Pipeline", url: "/pipeline", icon: Kanban, show: !isComercial, badge: 0 },
    { title: "Leads", url: "/leads", icon: Users, show: true, badge: 0 },
    { title: "Atendimento", url: "/atendimento", icon: Sheet, show: true, badge: 0 },
    { title: "Agenda", url: "/agenda", icon: CalendarDays, show: true, badge: 0 },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3, show: !isComercial, badge: 0 },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex items-center justify-center py-6 px-2 overflow-hidden">
        <img
          src={collapsed ? logoIcon : logoImg}
          alt="CRM Harmony Digital"
          className={collapsed ? "h-8 w-8 object-contain" : "h-12 w-auto object-contain"}
        />
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="relative flex items-center gap-3 px-4 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors rounded-lg"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {item.badge > 0 && (
                        <span className={collapsed
                          ? "absolute top-1 right-1 h-2 w-2 rounded-full bg-accent"
                          : "ml-auto bg-accent text-accent-foreground text-[10px] font-semibold rounded-full px-1.5 min-w-[20px] text-center"}>
                          {!collapsed && (item.badge > 99 ? "99+" : item.badge)}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto border-t border-sidebar-border">
        <SidebarMenu className="p-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-12">
              <NavLink
                to="/profile"
                className="flex items-center gap-3 px-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors rounded-lg"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-[11px]">
                    {(profile.display_name || user?.email || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <span className="flex-1 truncate text-sm">{profile.display_name || user?.email}</span>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {!isComercial && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-11">
                <NavLink
                  to="/admin"
                  className="flex items-center gap-3 px-4 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors rounded-lg"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>Admin</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton className="h-11 cursor-pointer" onClick={handleLogout}>
              <div className="flex items-center gap-3 px-4 text-sidebar-foreground/70 hover:text-destructive transition-colors">
                <LogOut className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
