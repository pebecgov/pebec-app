import { StateRankingsTable } from "@/components/StateRankingsTable";
import { StateRankingsWidget } from "@/components/StateRankingsWidget";

export default function StateRankingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">State Rankings Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            View how Nigerian states are performing based on their total scores across all indicators.
          </p>
        </div>
        
        {/* Widgets Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StateRankingsWidget limit={5} showTop={true} />
          <StateRankingsWidget limit={5} showTop={false} />
        </div>
        
        {/* Full Rankings Table */}
        <StateRankingsTable />
      </div>
    </div>
  );
}
