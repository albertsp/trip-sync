import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

/** Brand + theme toggle row shared by the single-panel pages. */
export function ShellHeader({ wide = false }: { wide?: boolean }) {
  return (
    <div className={wide ? "shell-header shell-header--wide" : "shell-header"}>
      <Link to="/" className="brand">
        <BrandMark />
        TripSync
      </Link>
      <ThemeToggle />
    </div>
  );
}
