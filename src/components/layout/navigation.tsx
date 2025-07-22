"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { 
  Home, 
  FileText, 
  Settings, 
  Plus, 
  Upload,
  Menu,
  X,
  Sparkles,
  Users,
  BarChart3,
  CreditCard
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Prompts", href: "/prompts", icon: FileText },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Team", href: "/team", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex">
            <Link
              href="/dashboard"
              className="flex items-center px-2 text-xl font-bold text-blue-600 dark:text-blue-400"
            >
              <Sparkles className="w-6 h-6 mr-2" />
              PromptVault
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                      isActive
                        ? "border-blue-500 text-gray-900 dark:text-white"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            <Link
              href="/prompts/new"
              className="hidden sm:inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Prompt
            </Link>

            {/* User Menu */}
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Dashboard"
                  labelIcon={<Home className="w-4 h-4" />}
                  href="/dashboard"
                />
                <UserButton.Link
                  label="Settings"
                  labelIcon={<Settings className="w-4 h-4" />}
                  href="/settings"
                />
                <UserButton.Link
                  label="Billing"
                  labelIcon={<CreditCard className="w-4 h-4" />}
                  href="/settings/billing"
                />
                <UserButton.Action label="manageAccount" />
              </UserButton.MenuItems>
            </UserButton>

            {/* Mobile menu button */}
            <button
              type="button"
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                    isActive
                      ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
            
            <Link
              href="/prompts/new"
              className="flex items-center pl-3 pr-4 py-2 text-base font-medium text-blue-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Plus className="w-5 h-5 mr-3" />
              New Prompt
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}