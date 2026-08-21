import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BonusItem {
    bonusId: string;
    bonusName: string;
    bonusValue: number;
    order: number;
}

interface DynamicBonusesCardProps {
    bonusConfig: BonusItem[];
    bonusValues: Record<string, boolean>;
    onValueChange: (bonusId: string, isApplied: boolean) => void;
    onSave: () => Promise<void>;
    isLoading: boolean;
    isSaved: boolean;
    selectedMda: string;
}

const DynamicBonusesCard: React.FC<DynamicBonusesCardProps> = ({
    bonusConfig,
    bonusValues,
    onValueChange,
    onSave,
    isLoading,
    selectedMda
}) => {
    const calculateTotalBonus = () => {
        let total = 0;
        bonusConfig.forEach(item => {
            if (bonusValues[item.bonusId]) {
                total += item.bonusValue;
            }
        });
        return total;
    };

    const currentBonus = calculateTotalBonus();

    return (
        <Card className="w-full border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-emerald-50/50">
                <CardTitle className="text-sm font-medium text-emerald-900">
                    Bonuses
                </CardTitle>
                <Badge className="bg-emerald-600 hover:bg-emerald-600">
                    +{currentBonus} Points
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="space-y-6 mt-4">
                    {bonusConfig.map((item) => (
                        <div key={item.bonusId} className="flex items-center justify-between">
                            <Label htmlFor={`bonus-${item.bonusId}`} className="flex flex-col">
                                <span className="font-medium text-emerald-700">{item.bonusName}</span>
                                <span className="text-xs text-emerald-600 font-bold">+{item.bonusValue} points</span>
                            </Label>

                            <Switch
                                id={`bonus-${item.bonusId}`}
                                checked={bonusValues[item.bonusId] === true}
                                onCheckedChange={(checked) => onValueChange(item.bonusId, checked)}
                                disabled={!selectedMda || isLoading}
                                className="data-[state=checked]:bg-emerald-600"
                            />
                        </div>
                    ))}

                    <Button
                        onClick={onSave}
                        disabled={!selectedMda || isLoading}
                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Bonuses
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default DynamicBonusesCard;
