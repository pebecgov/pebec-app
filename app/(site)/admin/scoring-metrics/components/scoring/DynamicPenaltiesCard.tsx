import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PenaltyItem {
    penaltyId: string;
    penaltyName: string;
    penaltyValue: number;
    order: number;
}

interface DynamicPenaltiesCardProps {
    penaltyConfig: PenaltyItem[];
    penaltyValues: Record<string, boolean>;
    onValueChange: (penaltyId: string, isApplied: boolean) => void;
    onSave: () => Promise<void>;
    isLoading: boolean;
    isSaved: boolean;
    selectedMda: string;
}

const DynamicPenaltiesCard: React.FC<DynamicPenaltiesCardProps> = ({
    penaltyConfig,
    penaltyValues,
    onValueChange,
    onSave,
    isLoading,
    isSaved,
    selectedMda
}) => {
    // Calculate total penalty
    const calculateTotalPenalty = () => {
        let total = 0;
        penaltyConfig.forEach(item => {
            if (penaltyValues[item.penaltyId]) {
                total += item.penaltyValue;
            }
        });
        return total;
    };

    const currentPenalty = calculateTotalPenalty();

    return (
        <Card className="w-full border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-red-50/50">
                <CardTitle className="text-sm font-medium text-red-900">
                    Penalties
                </CardTitle>
                <Badge variant="destructive">
                    {currentPenalty} Points
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="space-y-6 mt-4">
                    {penaltyConfig.map((item) => (
                        <div key={item.penaltyId} className="flex items-center justify-between">
                            <Label htmlFor={`penalty-${item.penaltyId}`} className="flex flex-col">
                                <span className="font-medium text-red-700">{item.penaltyName}</span>
                                <span className="text-xs text-red-500 font-bold">{item.penaltyValue} points</span>
                            </Label>

                            <Switch
                                id={`penalty-${item.penaltyId}`}
                                checked={penaltyValues[item.penaltyId] === true}
                                onCheckedChange={(checked) => onValueChange(item.penaltyId, checked)}
                                disabled={!selectedMda || isLoading}
                                className="data-[state=checked]:bg-red-600"
                            />
                        </div>
                    ))}

                    <Button
                        onClick={onSave}
                        disabled={!selectedMda || isLoading}
                        className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Penalties
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default DynamicPenaltiesCard;
