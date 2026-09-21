'use client';

import React, { useMemo } from 'react';
import { Autocomplete, TextField } from '@mui/material';

interface MDASelectorProps {
    selectedMda: string;
    setSelectedMda: (mda: string) => void;
    mdasList: any[];
    mdasWithScores: any[] | undefined;
    allMdaScoringStatuses: Record<string, any> | undefined;
    sanitizeMdaName: (name: string) => string;
}

type MdaOption = {
    name: string;
    abbreviation?: string;
    isActive: boolean;
    hasScoreForPeriod: boolean;
    grade?: string;
};

export default function MDASelector({
    selectedMda,
    setSelectedMda,
    mdasList,
    mdasWithScores,
    allMdaScoringStatuses,
    sanitizeMdaName
}: MDASelectorProps) {
    const options = useMemo<MdaOption[]>(() => {
        return (mdasList || []).map((mda) => {
            const isActive = !!mdasWithScores?.find((m) =>
                m.name === mda.name ||
                m.name === `${mda.abbreviation} - ${mda.name}` ||
                m.name.includes(mda.name) ||
                mda.name.includes(m.name.replace(/^[^-]+ - /, ''))
            );
            const sanitizedKey = sanitizeMdaName(mda.name);
            const existingScore = allMdaScoringStatuses?.[sanitizedKey];
            return {
                name: mda.name,
                abbreviation: mda.abbreviation,
                isActive,
                hasScoreForPeriod: !!existingScore,
                grade: existingScore?.grade,
            };
        });
    }, [mdasList, mdasWithScores, allMdaScoringStatuses, sanitizeMdaName]);

    const selectedOption = options.find((option) => option.name === selectedMda) ?? null;

    return (
        <Autocomplete
            options={options}
            value={selectedOption}
            onChange={(_event, option) => setSelectedMda(option?.name ?? '')}
            getOptionLabel={(option) =>
                option.abbreviation ? `${option.abbreviation} - ${option.name}` : option.name
            }
            isOptionEqualToValue={(option, value) => option.name === value.name}
            getOptionDisabled={(option) => option.hasScoreForPeriod}
            filterOptions={(opts, state) => {
                const query = state.inputValue.trim().toLowerCase();
                if (!query) return opts;
                return opts.filter((option) =>
                    option.name.toLowerCase().includes(query) ||
                    (option.abbreviation || '').toLowerCase().includes(query)
                );
            }}
            renderOption={(props, option) => (
                <li {...props} key={option.name}>
                    <span className="flex w-full items-center justify-between gap-3">
                        <span>
                            {option.abbreviation ? `${option.abbreviation} — ${option.name}` : option.name}
                        </span>
                        <span className="shrink-0 text-xs text-gray-500">
                            {option.isActive ? '✅' : '⚠️'}
                            {option.hasScoreForPeriod ? ` 📊 ${option.grade || 'Scored'}` : ''}
                        </span>
                    </span>
                </li>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Select MDA"
                    placeholder="Search by name or abbreviation"
                />
            )}
            sx={{ width: { xs: '100%', sm: 420 } }}
        />
    );
}
