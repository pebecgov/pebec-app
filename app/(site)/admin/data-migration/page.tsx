"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Database, Trash2 } from "lucide-react";

export default function DataMigrationPage() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  
  const checkIssues = useQuery(api.data_migration.checkDataTypeIssues);
  const migrateData = useMutation(api.data_migration.migrateInterstateTradeData);
  const cleanupRecords = useMutation(api.data_migration.cleanupProblematicRecords);
  
  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateData({});
      toast.success(result.message);
    } catch (error) {
      console.error('Migration error:', error);
      toast.error("Migration failed");
    } finally {
      setIsMigrating(false);
    }
  };
  
  const handleCleanup = async () => {
    if (!checkIssues?.issues) return;
    
    setIsCleaning(true);
    try {
      const recordIds = checkIssues.issues.map(issue => issue.id);
      const result = await cleanupRecords({ recordIds });
      toast.success(result.message);
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error("Cleanup failed");
    } finally {
      setIsCleaning(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center space-x-2">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Data Migration & Cleanup</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Data Type Issues</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkIssues ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{checkIssues.totalRecords}</div>
                  <div className="text-sm text-gray-600">Total Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{checkIssues.recordsWithIssues}</div>
                  <div className="text-sm text-gray-600">Records with Issues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {checkIssues.totalRecords - checkIssues.recordsWithIssues}
                  </div>
                  <div className="text-sm text-gray-600">Clean Records</div>
                </div>
              </div>
              
              {checkIssues.issues.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Problematic Records:</h3>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {checkIssues.issues.map((issue, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium">{issue.state}</div>
                          <div className="text-sm text-gray-600">
                            Boolean fields: {issue.booleanFields.join(', ')}
                          </div>
                        </div>
                        <Badge variant="destructive">Issue</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <div className="mt-2">Loading data...</div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Data Migration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Convert boolean values to numbers for interstate trade data. This will fix the schema validation errors.
            </p>
            <Button 
              onClick={handleMigration}
              disabled={isMigrating || !checkIssues?.recordsWithIssues}
              className="w-full"
            >
              {isMigrating ? "Migrating..." : "Migrate Data"}
            </Button>
            {checkIssues?.recordsWithIssues === 0 && (
              <div className="text-sm text-green-600 flex items-center space-x-1">
                <CheckCircle className="h-4 w-4" />
                <span>No migration needed</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <span>Cleanup (Dangerous)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Delete all problematic records. This action cannot be undone. Use with caution.
            </p>
            <Button 
              onClick={handleCleanup}
              disabled={isCleaning || !checkIssues?.recordsWithIssues}
              variant="destructive"
              className="w-full"
            >
              {isCleaning ? "Cleaning..." : "Delete Problematic Records"}
            </Button>
            {checkIssues?.recordsWithIssues === 0 && (
              <div className="text-sm text-green-600 flex items-center space-x-1">
                <CheckCircle className="h-4 w-4" />
                <span>No cleanup needed</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Migration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Schema Updated:</span>
              <Badge variant="default">✓ Completed</Badge>
            </div>
            <div className="flex justify-between">
              <span>Legacy Functions Updated:</span>
              <Badge variant="default">✓ Completed</Badge>
            </div>
            <div className="flex justify-between">
              <span>Data Migration:</span>
              <Badge variant={checkIssues?.recordsWithIssues === 0 ? "default" : "secondary"}>
                {checkIssues?.recordsWithIssues === 0 ? "✓ Completed" : "Pending"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
