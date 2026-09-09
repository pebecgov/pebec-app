import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OthersItem {
    itemId: string;
    itemName: string;
    weight: number;
    answerType?: 'yes_no' | 'scale_1_10';
    order: number;
}

interface DynamicOthersCardProps {
    othersConfig: OthersItem[];
    othersValues: Record<string, boolean | number>;
    onValueChange: (itemId: string, value: boolean | number) => void;
    onSave: () => Promise<void>;
    isLoading: boolean;
    isSaved: boolean;
    selectedMda: string;
}

const DynamicOthersCard: React.FC<DynamicOthersCardProps> = ({
    othersConfig,
    othersValues,
    onValueChange,
    onSave,
    isLoading,
    isSaved,
    selectedMda
}) => {
    // Calculate current total score
    const calculateTotalScore = () => {
        let total = 0;
        othersConfig.forEach(item => {
            const value = othersValues[item.itemId];
            if (item.answerType === 'yes_no') {
                if (value === true) {
                    total += item.weight;
                }
            } else {
                // scale_1_10
                const numericValue = typeof value === 'number' ? value : 0;
                total += (numericValue / 10) * item.weight;
            }
        });
        return total;
    };

    const totalPoints = othersConfig.reduce((sum, item) => sum + item.weight, 0);
    const currentScore = calculateTotalScore();

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Other Metrics
                </CardTitle>
                <Badge variant={isSaved ? "default" : "secondary"}>
                    {currentScore.toFixed(1)} / {totalPoints} Points
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="space-y-6 mt-4">
                    {othersConfig.map((item) => (
                        <div key={item.itemId} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor={`item-${item.itemId}`} className="flex flex-col">
                                    <span className="font-medium">{item.itemName}</span>
                                    <span className="text-xs text-muted-foreground">{item.weight} points</span>
                                </Label>

                                {item.answerType === 'yes_no' ? (
                                    <Switch
                                        id={`item-${item.itemId}`}
                                        checked={othersValues[item.itemId] === true}
                                        onCheckedChange={(checked) => onValueChange(item.itemId, checked)}
                                        disabled={!selectedMda || isLoading}
                                    />
                                ) : (
                                    <span className="text-sm font-bold w-10 text-right">
                                        {typeof othersValues[item.itemId] === 'number'
                                            ? Number(othersValues[item.itemId]).toFixed(1)
                                            : "0.0"}
                                    </span>
                                )}
                            </div>

                            {item.answerType === 'scale_1_10' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Slider
                                            value={[typeof othersValues[item.itemId] === 'number' ? othersValues[item.itemId] as number : 0]}
                                            min={0}
                                            max={10}
                                            step={0.1}
                                            onValueChange={(vals) => onValueChange(item.itemId, Number(vals[0].toFixed(1)))}
                                            disabled={!selectedMda || isLoading}
                                            className="pt-2 flex-1"
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            max={10}
                                            step={0.1}
                                            value={
                                                typeof othersValues[item.itemId] === "number"
                                                    ? Number(othersValues[item.itemId])
                                                    : 0
                                            }
                                            onChange={(e) => {
                                                const raw = parseFloat(e.target.value);
                                                if (!Number.isFinite(raw)) {
                                                    onValueChange(item.itemId, 0);
                                                    return;
                                                }
                                                const clamped = Math.max(0, Math.min(10, Number(raw.toFixed(1))));
                                                onValueChange(item.itemId, clamped);
                                            }}
                                            disabled={!selectedMda || isLoading}
                                            className="w-16 h-9 rounded-md border border-gray-200 px-2 text-sm text-right"
                                            aria-label={`${item.itemName} scale value`}
                                        />
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        {(
                                            ((typeof othersValues[item.itemId] === 'number'
                                                ? (othersValues[item.itemId] as number)
                                                : 0) /
                                                10) *
                                            item.weight
                                        ).toFixed(1)}{" "}
                                        / {item.weight} pts
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    <Button
                        onClick={onSave}
                        disabled={!selectedMda || isLoading}
                        className="w-full mt-4"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Others Metrics
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default DynamicOthersCard;
