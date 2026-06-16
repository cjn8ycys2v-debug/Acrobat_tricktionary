import Link from "next/link";
import { Activity, GitBranch, ListChecks, Settings } from "lucide-react";

const navItems = [
  { href: "/tricks", label: "技図鑑", icon: Activity },
  { href: "/levels", label: "レベル表", icon: ListChecks },
  { href: "/map", label: "相関マップ", icon: GitBranch },
  { href: "/admin", label: "管理", icon: Settings }
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/tricks" className="site-brand">
          <span className="site-brand__mark">DD</span>
          <span className="site-brand__text">
            <span className="site-brand__title">Double Dutch Acro Atlas</span>
            <span className="site-brand__subtitle">技・分類・学習ルート</span>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="site-nav__link"
            >
              <item.icon aria-hidden className="site-nav__icon" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
