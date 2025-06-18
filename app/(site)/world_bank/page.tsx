// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Eye } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

const nigeriaStates = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];

export default function WorldBankDLIAnalysis() {
  const dliTemplates = useQuery(api.dli.getAllDliTemplates);
  const [selectedDLI, setSelectedDLI] = useState<Id<"dli_templates"> | null>(null);
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const stepAnalysis = useQuery(api.dli.getDLIStepAnalysis, 
    selectedDLI ? { dliTemplateId: selectedDLI } : "skip"
  );

  if (!dliTemplates) return <p className="p-4">Loading...</p>;

  const handleStepClick = (step: any) => {
    setSelectedStep(step);
    setShowDetailsModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">DLI Dashboard Analysis </h1>

      {/* DLI Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select DLI for Step Analysis
        </label>
        <Select 
          value={selectedDLI || ""} 
          onValueChange={(value) => setSelectedDLI(value as Id<"dli_templates">)}
        >
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Select a DLI to analyze..." />
          </SelectTrigger>
          <SelectContent>
            {dliTemplates.map(dli => (
              <SelectItem key={dli._id} value={dli._id}>
                {dli.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step Analysis Cards */}
      {selectedDLI && stepAnalysis && (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {stepAnalysis.dliTemplate.title}
            </h2>
            <p className="text-gray-600 mb-4">
              {stepAnalysis.dliTemplate.description}
            </p>
            <p className="text-sm text-gray-500">
              Click on any step card to view detailed state-by-state breakdown
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stepAnalysis.stepAnalysis.map((step, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-l-4 border-blue-500"
                onClick={() => handleStepClick(step)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    Step {index + 1}: {step.stepTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="text-green-600" size={20} />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {step.completed.length} states
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="text-yellow-600" size={20} />
                        <span className="text-sm font-medium">In Progress</span>
                      </div>
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                        {step.inProgress.length} states
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="text-gray-500" size={20} />
                        <span className="text-sm font-medium">Not Started</span>
                      </div>
                      <Badge variant="default" className="bg-gray-100 text-gray-600">
                        {step.notStarted.length} states
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Completion Rate</span>
                      <span className="font-semibold text-gray-800">
                        {Math.round((step.completed.length / nigeriaStates.length) * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                    <Eye size={16} className="mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* No DLI Selected State */}
      {!selectedDLI && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Select a DLI to Begin Analysis
            </h3>
            <p className="text-gray-500">
              Choose a DLI from the dropdown above to see step-by-step completion 
              analysis across all Nigerian states.
            </p>
          </div>
        </div>
      )}

      {/* Step Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedStep ? `Step ${selectedStep.stepIndex + 1}: ${selectedStep.stepTitle}` : ''}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStep && (
            <div className="mt-4 space-y-6">
              {/* Completed States */}
              {selectedStep.completed.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Completed ({selectedStep.completed.length} states)
                  </h4>
                  <div className="bg-green-50 rounded-lg p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>State</TableHead>
                          <TableHead>Reform Champion</TableHead>
                          <TableHead>Completed Date</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedStep.completed.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.state}</TableCell>
                            <TableCell>{item.startedBy}</TableCell>
                            <TableCell>
                              {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.location.href = `/world_bank/dli/${item.dliProgressId}`}
                              >
                                View DLI
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* In Progress States */}
              {selectedStep.inProgress.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                    <Clock size={20} />
                    In Progress ({selectedStep.inProgress.length} states)
                  </h4>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>State</TableHead>
                          <TableHead>Reform Champion</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Current Step</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedStep.inProgress.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.state}</TableCell>
                            <TableCell>{item.startedBy}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                {item.progress}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              Step {item.currentStep} of {item.totalSteps}
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.location.href = `/world_bank/dli/${item.dliProgressId}`}
                              >
                                View DLI
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Not Started States */}
              {selectedStep.notStarted.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <XCircle size={20} />
                    Not Started ({selectedStep.notStarted.length} states)
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {selectedStep.notStarted.map((item: any, index: number) => (
                        <div key={index} className="text-sm text-gray-600 p-2 bg-white rounded border">
                          {item.state}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}