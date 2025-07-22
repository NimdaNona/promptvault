"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  User, 
  CreditCard, 
  Settings, 
  Users, 
  Key,
  Bell,
  Shield,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const settingsNav = [
  { name: "Profile", href: "/settings/profile", icon: User },
  { name: "Billing", href: "/settings/billing", icon: CreditCard },
  { name: "Preferences", href: "/settings/preferences", icon: Settings },
  { name: "Notifications", href: "/settings/notifications", icon: Bell },
  { name: "Team", href: "/settings/team", icon: Users },
  { name: "API Keys", href: "/settings/api-keys", icon: Key },
  { name: "Security", href: "/settings/security", icon: Shield },
  { name: "Import/Export", href: "/settings/data", icon: Download },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {settingsNav.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
              isActive
                ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            )}
          >
            <Icon
              className={cn(
                "mr-3 h-5 w-5",
                isActive
                  ? "text-gray-500 dark:text-gray-400"
                  : "text-gray-400 group-hover:text-gray-500"
              )}
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}