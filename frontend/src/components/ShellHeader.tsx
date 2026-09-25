import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

/** Brand + theme toggle row shared by the single-panel pages. */
export function ShellHeader() {
  return (
    <div className="shell-header">
      <Link to="/" className="brand">
        <BrandMark />
        TripSync
      </Link>
      <ThemeToggle />
    </div>
  );
}
