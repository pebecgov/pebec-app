'use client';

import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface MetricStatusBadgeProps {
    isLoading: boolean;
    isSaved: boolean;
}

export default function MetricStatusBadge({ isLoading, isSaved }: MetricStatusBadgeProps) {
    if (isLoading) {
        return (
            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
            </span>
        );
    }
    if (isSaved) {
        return (
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Saved
            </span>
        );
    }
    return null;
}
