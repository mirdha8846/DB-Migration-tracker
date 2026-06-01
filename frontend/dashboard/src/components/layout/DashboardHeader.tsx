import Image from "next/image";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { AVATARS } from "@/lib/constants";

type HeaderVariant = "overview" | "detail" | "graph" | "advisor";

type Props = {
  variant: HeaderVariant;
  migrationId?: string;
  pageTitle?: string;
  pageSubtitle?: string;
};

export function DashboardHeader({
  variant,
  migrationId = "8842-x",
  pageTitle,
  pageSubtitle,
}: Props) {
  if (variant === "overview") {
    return (
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-primary/5 bg-surface/40 px-gutter backdrop-blur-xl">
        <div className="flex max-w-xl flex-1 items-center">
          <div className="relative w-full">
            <MaterialIcon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              className="w-full rounded-full border border-primary/10 bg-primary/5 py-2 pl-10 pr-4 font-body-md text-body-md transition-all placeholder:text-on-surface-variant/40 focus:border-primary/30 focus:outline-none"
              placeholder="Search migrations, services, or risk reports..."
              type="text"
            />
          </div>
        </div>
        <div className="ml-gutter flex items-center gap-4">
          <button className="relative p-2 text-on-surface-variant transition-colors hover:text-primary">
            <MaterialIcon name="notifications" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-surface bg-error" />
          </button>
          <button className="p-2 text-on-surface-variant transition-colors hover:text-primary">
            <MaterialIcon name="help_outline" />
          </button>
          <div className="mx-2 h-8 w-px bg-primary/10" />
          <Image
            alt="Administrator profile image"
            className="h-8 w-8 rounded-full border border-primary/10 object-cover"
            height={32}
            src={AVATARS.header}
            width={32}
          />
        </div>
      </header>
    );
  }

  if (variant === "detail") {
    return (
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-outline-variant/10 bg-surface/80 px-margin-desktop backdrop-blur-md">
        <div className="flex items-center gap-4">
          <span className="font-headline-lg text-lg font-bold text-primary">
            {pageTitle ?? "Migration Detail"}
          </span>
          {(pageSubtitle ?? !pageTitle) && (
            <>
              <span className="text-outline/40">/</span>
              <span className="font-label-sm text-on-surface-variant">
                {pageSubtitle ?? `#${migrationId}`}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="group relative">
            <MaterialIcon
              name="notifications"
              className="cursor-pointer text-on-surface-variant transition-opacity hover:text-primary"
            />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-on-tertiary-container" />
          </div>
          <MaterialIcon
            name="help_outline"
            className="cursor-pointer text-on-surface-variant transition-opacity hover:text-primary"
          />
          <div className="h-8 w-8 overflow-hidden rounded-lg border border-outline-variant/30 ring-2 ring-primary/5">
            <Image alt="Administrator profile image" className="h-full w-full" height={32} src={AVATARS.header} width={32} />
          </div>
        </div>
      </header>
    );
  }

  if (variant === "graph") {
    return (
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-outline-variant/30 bg-surface/80 px-gutter shadow-sm backdrop-blur-md">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <MaterialIcon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant"
            />
            <input
              className="w-full rounded-full border-none bg-surface-variant/30 py-1.5 pl-10 pr-4 font-body-md text-label-sm text-on-surface focus:ring-1 focus:ring-secondary"
              placeholder="Search dependency graph..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-on-surface-variant">
            <MaterialIcon name="notifications" className="cursor-pointer transition-opacity hover:text-primary" />
            <MaterialIcon name="help_outline" className="cursor-pointer transition-opacity hover:text-primary" />
          </div>
          <div className="h-8 w-8 overflow-hidden rounded-full border border-secondary/30">
            <Image alt="Admin" className="h-full w-full object-cover" height={32} src={AVATARS.graph} width={32} />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed right-0 top-0 z-40 flex h-16 w-full items-center justify-between border-b border-primary/5 bg-white/40 px-6 backdrop-blur-xl md:w-[calc(100%-16rem)]">
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full border border-primary/5 bg-surface-container/30 px-4 py-1.5 sm:flex">
          <MaterialIcon name="search" className="text-[18px] text-primary/40" />
          <input
            className="w-48 border-none bg-transparent font-body-md text-body-md placeholder-on-surface-variant/40 focus:ring-0 lg:w-64"
            placeholder="Search architecture..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-primary/5 bg-surface-container/30 px-3 py-1">
          <MaterialIcon name="folder_managed" className="text-[18px] text-primary material-symbols-filled" />
          <select className="cursor-pointer border-none bg-transparent pr-8 font-label-sm text-label-sm text-on-surface focus:ring-0">
            <option className="bg-white">Core Banking Engine</option>
            <option className="bg-white">Auth Service v2</option>
          </select>
        </div>
        <div className="h-8 w-8 overflow-hidden rounded-full border border-primary/20">
          <Image alt="Admin" className="h-full w-full object-cover" height={32} src={AVATARS.advisor} width={32} />
        </div>
      </div>
    </header>
  );
}
