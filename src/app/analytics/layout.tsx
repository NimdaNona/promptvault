import Navigation from "@/components/layout/navigation";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}