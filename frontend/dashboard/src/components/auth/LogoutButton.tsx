"use client";

import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

type Props = {
  className?: string;
  labelClassName?: string;
  iconSize?: number;
};

export function LogoutButton({ className, labelClassName, iconSize }: Props) {
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.push("/login");
    router.refresh();
  };

  return (
    <button type="button" onClick={handleLogout} className={cn("nav-item", className)}>
      <MaterialIcon name="logout" size={iconSize} />
      <span className={labelClassName}>Logout</span>
    </button>
  );
}
