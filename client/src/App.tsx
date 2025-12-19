import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Home, Sparkles, TrendingUp, History, Menu } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import Generate from "@/pages/Generate";
import Statistics from "@/pages/Statistics";
import HistoryPage from "@/pages/History";
import NotFound from "@/pages/not-found";
import { useState } from "react";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();
  const [location] = useLocation();

  const links = [
    { href: "/", label: t("dashboard"), icon: Home },
    { href: "/generate", label: t("generate"), icon: Sparkles },
    { href: "/statistics", label: t("statistics"), icon: TrendingUp },
    { href: "/history", label: t("history"), icon: History },
  ];

  return (
    <>
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = location === link.href;
        return (
          <Link key={link.href} href={link.href} onClick={onNavigate}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start md:w-auto"
              data-testid={`nav-${link.href.replace("/", "") || "home"}`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {link.label}
            </Button>
          </Link>
        );
      })}
    </>
  );
}

function Header() {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <div className="flex flex-col gap-2 pt-6">
                <NavLinks onNavigate={() => setMobileMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/">
            <span className="text-xl font-bold text-primary" data-testid="logo">
              {t("appTitle")}
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/generate" component={Generate} />
      <Route path="/statistics" component={Statistics} />
      <Route path="/history" component={HistoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 md:px-8 py-6 md:py-8">
        <Router />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Lotto 6/45 - Korean Lottery Number Generator & Statistics</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
