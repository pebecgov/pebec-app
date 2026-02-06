'use client';

import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

interface MDASelectorProps {
    selectedMda: string;
    setSelectedMda: (mda: string) => void;
    mdasList: any[];
    mdasWithScores: any[] | undefined;
    allMdaScoringStatuses: Record<string, any> | undefined;
    sanitizeMdaName: (name: string) => string;
}

export default function MDASelector({
    selectedMda,
    setSelectedMda,
    mdasList,
    mdasWithScores,
    allMdaScoringStatuses,
    sanitizeMdaName
}: MDASelectorProps) {
    return (
        <FormControl sx={{ width: 250 }} variant="outlined">
            <InputLabel id="mda-label">Select MDA</InputLabel>
            <Select
                labelId="mda-label"
                id="mda-select"
                value={selectedMda}
                onChange={(e) => setSelectedMda(e.target.value)}
                label="Select MDA"
            >
                <MenuItem value="">
                    <em>None</em>
                </MenuItem>
                {mdasList.map((mda) => {
                    // Check if this MDA exists in the database (with or without abbreviation prefix)
                    const isActive = mdasWithScores?.find(m =>
                        m.name === mda.name ||
                        m.name === `${mda.abbreviation} - ${mda.name}` ||
                        m.name.includes(mda.name) ||
                        mda.name.includes(m.name.replace(/^[^-]+ - /, ''))
                    );

                    // Check if this MDA already has a score for the current period
                    const sanitizedKey = sanitizeMdaName(mda.name);
                    const hasScoreForPeriod = allMdaScoringStatuses?.[sanitizedKey] ? true : false;
                    const existingScore = allMdaScoringStatuses?.[sanitizedKey];

                    return (
                        <MenuItem
                            key={mda.name}
                            value={mda.name}
                            disabled={hasScoreForPeriod}
                        >
                            {mda.name} {isActive ? '✅' : '⚠️'} {hasScoreForPeriod ? `📊 Already Scored (${existingScore?.grade || 'N/A'})` : ''}
                        </MenuItem>
                    );
                })}
            </Select>
        </FormControl>
    );
}
