'use client';

import { useState } from 'react';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { generateMdaScoringPDF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';

interface BulkPdfDownloaderProps {
    mdaData: any[];
    year: number;
}

export function BulkPdfDownloader({ mdaData, year }: BulkPdfDownloaderProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const convex = useConvex();

    const handleBulkDownload = async () => {
        if (!mdaData || mdaData.length === 0) {
            toast.error('No MDAs available to download');
            return;
        }

        setIsDownloading(true);
        setProgress({ current: 0, total: mdaData.length });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < mdaData.length; i++) {
            const mda = mdaData[i];
            setProgress({ current: i + 1, total: mdaData.length });

            try {
                // Fetch detailed data for this MDA
                const detailedData = await (convex as any).query(
                    api.mda_scoring.getMdaDetailedScoringData,
                    { mdaName: mda.mdaName, year }
                ) as any;

                if (detailedData) {
                    // Add rank/position
                    detailedData.position = i + 1;

                    // Generate PDF
                    await generateMdaScoringPDF(detailedData);
                    successCount++;

                    // Add a small delay between downloads to prevent browser overwhelming
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    console.warn(`No data available for ${mda.mdaName}`);
                    failCount++;
                }
            } catch (error) {
                console.error(`Error downloading PDF for ${mda.mdaName}:`, error);
                failCount++;
            }
        }

        setIsDownloading(false);
        setProgress({ current: 0, total: 0 });

        // Show final summary
        if (successCount > 0 && failCount === 0) {
            toast.success(`Successfully downloaded ${successCount} PDF${successCount > 1 ? 's' : ''}!`);
        } else if (successCount > 0 && failCount > 0) {
            toast.warning(`Downloaded ${successCount} PDF${successCount > 1 ? 's' : ''}, ${failCount} failed`);
        } else {
            toast.error('Failed to download PDFs');
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleBulkDownload}
                disabled={isDownloading || !mdaData || mdaData.length === 0}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {isDownloading ? (
                    <>
                        <span className="animate-spin">⏳</span>
                        Downloading... ({progress.current}/{progress.total})
                    </>
                ) : (
                    <>
                        📦 Download All PDFs
                    </>
                )}
            </button>

            {isDownloading && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white p-3 rounded shadow-lg border border-purple-200 z-10 min-w-max">
                    <div className="text-sm font-semibold mb-2">
                        Downloading: {progress.current} of {progress.total}
                    </div>
                    <div className="w-64 bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-purple-500 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                        Please wait, generating PDFs one by one...
                    </div>
                </div>
            )}
        </div>
    );
}
