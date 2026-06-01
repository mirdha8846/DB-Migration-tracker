import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { AVATARS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type SidebarVariant = "overview" | "detail" | "graph" | "advisor";
export type ActiveNav =
  | "overview"
  | "schema-security"
  | "migration-risk"
  | "vault"
  | "settings"
  | "advisor";

type NavItem = {
  id: ActiveNav;
  href: string;
  icon: string;
  label: string;
};

export const navItems: NavItem[] = [
  { id: "overview", href: "/dashboard", icon: "dashboard", label: "Overview" },
  {
    id: "schema-security",
    href: "/projects",
    icon: "security",
    label: "Schema Security",
  },
  {
    id: "migration-risk",
    href: "/migrations",
    icon: "swap_horiz",
    label: "Migration Risk",
  },
  { id: "vault", href: "/vault", icon: "lock", label: "Vault Access" },
  { id: "settings", href: "/settings", icon: "settings", label: "Settings" },
];

type Props = {
  variant?: SidebarVariant;
  active: ActiveNav;
};

function SidebarFooter({
  variant,
}: {
  variant: "overview" | "detail" | "graph" | "advisor";
}) {
  const logoutClass =
    variant === "overview"
      ? "flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error"
      : variant === "graph"
        ? "flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary"
        : "mt-4 flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error";

  const labelClass =
    variant === "overview"
      ? "font-label-md text-label-md"
      : variant === "graph"
        ? "font-label-sm text-label-sm"
        : "font-body-md";

  return (
    <>
      <button
        type="button"
        className={cn(
          "w-full rounded-lg bg-primary text-on-primary transition-all hover:opacity-90",
          variant === "overview" &&
            "rounded-lg px-4 py-3 font-label-md text-label-md shadow-md hover:brightness-110",
          variant === "advisor" &&
            "flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-label-sm text-[12px] font-bold shadow-lg shadow-primary/10",
          variant === "graph" &&
            "flex items-center justify-center gap-2 py-3 font-label-sm text-label-sm",
          variant === "detail" &&
            "rounded-xl px-4 py-3 font-body-md font-bold shadow-sm hover:bg-on-primary-container",
        )}
      >
        {variant !== "overview" && variant !== "detail" && (
          <MaterialIcon name={variant === "advisor" ? "bolt" : "shield"} size={18} />
        )}
        {variant === "advisor" ? "UPGRADE PROTECTION" : "Upgrade Protection"}
      </button>
      <LogoutButton className={logoutClass} labelClassName={labelClass} />
    </>
  );
}

export function DashboardSidebar({ variant = "overview", active }: Props) {
  if (variant === "overview") {
    return (
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-primary/5 bg-surface-container-low/40 p-4 shadow-xl backdrop-blur-2xl">
        <div className="mb-stack-lg flex items-center gap-3 px-2">
          <MaterialIcon name="shield" className="text-primary" size={32} />
          <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
            SchemaGuard
          </span>
        </div>

        <div className="mb-stack-lg flex items-center gap-3 rounded-xl border border-primary/5 bg-primary/5 p-4">
          <Image
            alt="User profile photo"
            className="h-10 w-10 rounded-full border border-primary/10 object-cover"
            height={40}
            src={AVATARS.sidebar}
            width={40}
          />
          <div className="overflow-hidden">
            <p className="truncate font-label-md text-label-md text-on-surface">Admin User</p>
            <p className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant/70">
              Security Architect
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "nav-item flex items-center gap-3 rounded-lg px-4 py-3",
                active === item.id
                  ? "bg-primary-container text-on-primary shadow-md"
                  : "text-on-surface-variant hover:text-primary",
              )}
            >
              <MaterialIcon name={item.icon} />
              <span className="font-label-md text-label-md">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-primary/10 pt-4">
          <SidebarFooter variant="overview" />
        </div>
      </aside>
    );
  }

  if (variant === "advisor") {
    return (
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-primary/5 bg-white/20 p-4 backdrop-blur-2xl">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container">
            <MaterialIcon
              name="security"
              className="text-primary-fixed-dim material-symbols-filled"
              size={20}
            />
          </div>
          <div>
            <h1 className="font-headline-lg text-[20px] font-bold text-primary">SchemaGuard</h1>
            <p className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant opacity-70">
              Security Architect
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200",
                active === item.id
                  ? "bg-primary-container text-on-primary-container shadow-sm"
                  : "text-on-surface-variant hover:bg-primary-fixed/20 hover:text-primary",
              )}
            >
              <MaterialIcon name={item.icon} size={20} />
              <span className="font-body-md text-[14px]">{item.label}</span>
            </Link>
          ))}
          <div className="mt-4 border-t border-primary/5 pt-4">
            <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
              AI Assistant
            </p>
            <Link
              href="/advisor"
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3",
                active === "advisor"
                  ? "bg-primary-container text-on-primary-container shadow-sm"
                  : "text-on-surface-variant hover:bg-primary-fixed/20 hover:text-primary",
              )}
            >
              <MaterialIcon name="smart_toy" className="material-symbols-filled" size={20} />
              <span className="font-body-md text-[14px] font-semibold">Advisor</span>
            </Link>
          </div>
        </nav>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <SidebarFooter variant="advisor" />
        </div>
      </aside>
    );
  }

  const isGraph = variant === "graph";
  const avatar = variant === "detail" ? AVATARS.detail : AVATARS.graph;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r shadow-2xl backdrop-blur-xl",
        isGraph
          ? "border-outline-variant/30 bg-surface-container-low/80 p-4"
          : "border-outline-variant/30 bg-surface-container-low/80 p-6",
      )}
    >
      <div className={cn(isGraph ? "mb-8 px-2" : "mb-12")}>
        <span
          className={cn(
            "font-bold tracking-tight text-primary",
            isGraph ? "font-headline-lg text-headline-lg" : "font-headline-lg text-2xl",
          )}
        >
          SchemaGuard
        </span>
        <p className="mt-1 font-label-sm text-on-surface-variant/70">Data Security Architect</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200",
                isActive && isGraph
                  ? "scale-[0.98] border-l-4 border-secondary bg-secondary-container text-on-secondary-container"
                  : isActive
                    ? "scale-[0.98] rounded-xl bg-primary-container text-on-primary-container shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high/50 hover:text-primary",
              )}
            >
              <MaterialIcon name={item.icon} />
              <span
                className={cn(
                  isGraph ? "font-label-sm text-label-sm" : "font-body-md",
                  isActive && !isGraph && "font-semibold",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-auto space-y-2",
          isGraph ? "space-y-4" : "border-t border-outline-variant/20 pt-6",
        )}
      >
        {!isGraph && (
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-primary/10 bg-primary/5">
              <Image alt="User profile photo" className="h-full w-full object-cover" height={40} src={avatar} width={40} />
            </div>
            <div>
              <p className="font-body-md font-bold text-on-surface">Adrian Thorne</p>
              <p className="font-label-sm text-primary/60">Arch-Sec 1</p>
            </div>
          </div>
        )}
        <SidebarFooter variant={isGraph ? "graph" : "detail"} />
      </div>
    </aside>
  );
}
