/**
 * Ministry Analysis Utilities
 * Functions to identify ministries and analyze their impact on MDA rankings
 */

// Helper function to identify if an MDA is a ministry
export const isMinistry = (mdaName: string): boolean => {
  if (!mdaName) return false;
  
  const normalizedName = mdaName.toLowerCase().trim();
  
  // Check if the name starts with "ministry" or "federal ministry"
  if (normalizedName.startsWith('ministry') || 
      normalizedName.startsWith('federal ministry') ||
      normalizedName.includes('ministry of')) {
    return true;
  }
  
  // Check for specific ministry patterns
  const ministryPatterns = [
    'min. of',
    'min of',
    'ministry',
    'federal min',
    'fed. min',
    'fmoe', // Federal Ministry of Education
    'fmoh', // Federal Ministry of Health
    'fmard', // Federal Ministry of Agriculture and Rural Development
    'fmiti', // Federal Ministry of Industry, Trade and Investment
    'fmpwh', // Federal Ministry of Power, Works and Housing
  ];
  
  return ministryPatterns.some(pattern => normalizedName.includes(pattern));
};

// Analyze the impact of removing ministries from rankings
export interface MinistryImpactAnalysis {
  totalMdas: number;
  totalMinistries: number;
  totalNonMinistries: number;
  averageScoreAll: number;
  averageScoreWithoutMinistries: number;
  averageScoreMinistries: number;
  rankingChanges: Array<{
    mdaName: string;
    originalRank: number;
    newRank: number;
    rankChange: number;
    isMinistry: boolean;
  }>;
}

export const analyzeMinistryImpact = (mdaData: any[]): MinistryImpactAnalysis => {
  if (!mdaData || mdaData.length === 0) {
    return {
      totalMdas: 0,
      totalMinistries: 0,
      totalNonMinistries: 0,
      averageScoreAll: 0,
      averageScoreWithoutMinistries: 0,
      averageScoreMinistries: 0,
      rankingChanges: []
    };
  }

  // Sort all MDAs by total score (descending)
  const sortedAll = [...mdaData].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  
  // Filter out ministries and sort
  const nonMinistries = mdaData.filter(mda => !isMinistry(mda.mdaName));
  const sortedNonMinistries = [...nonMinistries].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  
  // Get ministries only
  const ministries = mdaData.filter(mda => isMinistry(mda.mdaName));
  
  // Calculate averages
  const averageScoreAll = mdaData.reduce((sum, mda) => sum + (mda.totalScore || 0), 0) / mdaData.length;
  const averageScoreWithoutMinistries = nonMinistries.length > 0 
    ? nonMinistries.reduce((sum, mda) => sum + (mda.totalScore || 0), 0) / nonMinistries.length 
    : 0;
  const averageScoreMinistries = ministries.length > 0
    ? ministries.reduce((sum, mda) => sum + (mda.totalScore || 0), 0) / ministries.length
    : 0;

  // Calculate ranking changes for non-ministries
  const rankingChanges: MinistryImpactAnalysis['rankingChanges'] = [];
  
  nonMinistries.forEach(mda => {
    const originalRank = sortedAll.findIndex(item => item.mdaName === mda.mdaName) + 1;
    const newRank = sortedNonMinistries.findIndex(item => item.mdaName === mda.mdaName) + 1;
    const rankChange = originalRank - newRank; // Positive means improved rank
    
    rankingChanges.push({
      mdaName: mda.mdaName,
      originalRank,
      newRank,
      rankChange,
      isMinistry: false
    });
  });

  return {
    totalMdas: mdaData.length,
    totalMinistries: ministries.length,
    totalNonMinistries: nonMinistries.length,
    averageScoreAll,
    averageScoreWithoutMinistries,
    averageScoreMinistries,
    rankingChanges
  };
};
