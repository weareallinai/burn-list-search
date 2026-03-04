import { Flame, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-burn" />
          <div>
            <h1 className="text-lg font-bold leading-tight burn-text">Burnlist</h1>
            <p className="text-xs text-muted-foreground">Songs you can't play again.</p>
          </div>
        </Link>
        <nav className="flex gap-1">
          <Link
            to="/"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              location.pathname === "/"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Search
          </Link>
          <Link
            to="/add"
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              location.pathname === "/add"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
