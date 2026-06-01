import { ReactNode } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar, ActiveNav, SidebarVariant } from "./DashboardSidebar";

type Props = {
  variant: SidebarVariant;
  active: ActiveNav;
  headerVariant?: SidebarVariant;
  migrationId?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  mainClassName?: string;
  children: ReactNode;
};

export function DashboardShell({
  variant,
  active,
  headerVariant,
  migrationId,
  pageTitle,
  pageSubtitle,
  mainClassName,
  children,
}: Props) {
  const header = headerVariant ?? variant;

  return (
    <>
      <DashboardSidebar variant={variant} active={active} />
      <DashboardHeader
        variant={header}
        migrationId={migrationId}
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
      />
      <main className={mainClassName}>{children}</main>
    </>
  );
}
