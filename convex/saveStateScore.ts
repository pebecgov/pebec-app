import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Global score mappings - using context-specific keys to avoid duplicates
const scoreMappings: Record<string, number> = {
  // Yes/No responses
  "yes": 1,
  "no": 0,
  
  // Time ranges
  "1-10": 1,
  "11-20": 2,
  "21-30": 3,
  "exceed-20": 0,
  "unavailable": 0,
  
  // Supply hours
  "15-24": 3,
  "10-14": 2,
  "4-9": 1,
  "0-3": 0,
  
  // Fault resolution
  "1-7": 2,
  "8-14": 1,
  "15-30": 0,
  
  // Quality ratings
  "very-good": 3,
  "good": 2,
  "moderate": 1,
  "poor": 0,
  "very-bad": 0,
  
  // Budget percentages
  "40-100": 3,
  "20-39": 2,
  "10-19": 1,
  "0-9": 0,
  
  // Registration time
  "1-30-days": 1,
  "exceeds-30-days": 0,
  
  // Representation
  "35-100": 1,
  "25-34": 0.75,
  "1-24": 0.5,
  "0": 0,
  
  // Number ranges for courts
  "1-5": 1,
  "6-10": 1.5,
  "11-14": 2,
  "15-and-above": 3,
  
  // Right of way
  "free": 2,
  "reduced-price": 1,
  "full-price": 0,
  
  // ISP presence
  "major-isps-present": 1,
  "limited-isps": 0.5,
  "no-major-isps": 0,
  
  // Coverage
  "full-coverage": 1,
  "partial-coverage": 0.5,
  "no-coverage": 0,
  
  // Clarity
  "very-clear": 1,
  "somewhat-clear": 0.5,
  "not-clear": 0,
  
  // Affordability
  "very-affordable": 3,
  "very-expensive": 0,
  
  // More options
  "registered": 2,
  "chamber-of-commerce": 1,
  "not-registered": 0,
  "excellent-condition": 3,
  "good-condition": 2,
  "fair-condition": 1,
  "poor-condition": 0,
  "comprehensive-strategy": 1,
  "basic-strategy": 0.5,
  "no-strategy": 0,
  "fully-operational": 1,
  "partially-operational": 0.5,
  "not-operational": 0,
  "comprehensive-incentives": 1,
  "basic-incentives": 0.5,
  "no-incentives": 0,
  "strong-collaboration": 2,
  "moderate-collaboration": 1,
  "no-collaboration": 0,
  "private-only": 0.5,
  "none": 0,
  "high-registration": 2,
  "moderate-registration": 1,
  "low-registration": 0,
  "completely-eliminated": 2,
  "partially-eliminated": 1,
  "not-eliminated": 0,
  "under-5-percent": 1,
  "over-5-percent": 0,
  "publicly-available": 1,
  "not-publicly-available": 0,
  "accessible-online": 1,
  "not-accessible-online": 0,
  "up-to-date": 2,
  "6-months-old": 1.5,
  "3-months-old": 1,
  "not-published": 0,
  "excellent": 2,
  "fully-implemented": 1,
  "partially-implemented": 0.5,
  "not-implemented": 0,
  "fully-funded": 1,
  "partially-funded": 0.5,
  "not-funded": 0,
  "comprehensive": 1,
  "basic": 0.5,
  "available": 1,
  "not-available": 0,
  "high-number": 2,
  "moderate-number": 1,
  "low-number": 0,
  "within-30-days": 1,
  "not-automated": 0,
  "not-affordable": 0,
  "moderately-affordable": 2,
  "less-affordable": 1,
  "more-than-6-months": 1.5,
  "more-than-3-months": 1,
  "15-100": 2,
  "5-14": 1,
  "0-4": 0,
  "10-15": 2,
  "5-9": 1,
  "1-5-courts": 1,
  "6-10-courts": 1.5,
  "11-14-courts": 2,
  "15-plus-courts": 3,
  "10-15-percent": 2,
  "5-9-percent": 1,
  "0-4-percent": 0,
  "35-100-percent": 1,
  "25-34-percent": 0.75,
  "1-24-percent": 0.5,
  "0-percent": 0,
  
  // Context-specific infrastructure keys
  "infrastructure-state-owned": 0.5,
  "infrastructure-private-owned": 0.25,
  "infrastructure-not-available": 0,
  "rail-state-owned": 0.5,
  "rail-private-owned": 0.25,
  "rail-not-available": 0,
  "airport-state-owned": 0.5,
  "airport-private-owned": 0.25,
  "airport-not-available": 0,
  "carrier-state-owned": 0.5,
  "carrier-private-owned": 0.25,
  "carrier-not-available": 0,
  "microfinance-state-owned": 1,
  
  // Context-specific functional keys
  "emergency-fully-functional": 1,
  "emergency-partially-functional": 0.5,
  "emergency-not-functional": 0,
  "website-fully-functional": 1,
  "website-partially-functional": 0.5,
  "website-not-functional": 0,
  "grm-fully-functional": 1.5,
  "grm-partially-functional": 0.75,
  "grm-not-functional": 0,
  "agency-fully-functional": 1,
  "agency-partially-functional": 0.5,
  "agency-not-functional": 0,
  
  // Context-specific automation keys
  "licensing-fully-automated": 2,
  "licensing-partially-automated": 1,
  "licensing-manual": 0,
  "services-fully-automated": 2,
  "services-partially-automated": 1,
  "services-manual": 0,
  
  // Context-specific online keys
  "digital-fully-online": 2,
  "digital-partially-online": 1,
  "digital-not-online": 0,
  "applications-fully-online": 2,
  "applications-partially-online": 1,
  "applications-not-online": 0,
  "services-fully-online": 2,
  "services-partially-online": 1,
  "services-not-online": 0,
  
  // Customer treatment
  "treatment-excellent": 1,
  "treatment-good": 0.5,
  "treatment-poor": 0
};

export const saveStateScore = mutation({
  args: {
    state: v.string(),
    indicator: v.string(),
    subIndicator: v.string(),
    value: v.string()
  },
  handler: async (ctx, { state, indicator, subIndicator, value }) => {
    // Get the numeric score from the mapping
    const score = scoreMappings[value] || 0;
    
    // Check if a record already exists for this combination
    const existingRecord = await ctx.db
      .query("state_scores")
      .withIndex("byStateIndicatorSubIndicator", (q) => 
        q.eq("state", state).eq("indicator", indicator).eq("subIndicator", subIndicator)
      )
      .first();
    
    if (existingRecord) {
      // Update existing record
      await ctx.db.patch(existingRecord._id, {
        value,
        score,
        createdAt: Date.now()
      });
      return existingRecord._id;
    } else {
      // Create new record
      const scoreId = await ctx.db.insert("state_scores", {
        state,
        indicator,
        subIndicator,
        value,
        score,
        createdAt: Date.now()
      });
      return scoreId;
    }
  }
});

export const getStateScores = query({
  args: {
    state: v.optional(v.string()),
    indicator: v.optional(v.string())
  },
  handler: async (ctx, { state, indicator }) => {
    let query = ctx.db.query("state_scores");
    
    if (state && indicator) {
      return await query
        .withIndex("byStateAndIndicator", (q) => q.eq("state", state).eq("indicator", indicator))
        .collect();
    } else if (state) {
      return await query
        .withIndex("byState", (q) => q.eq("state", state))
        .collect();
    } else if (indicator) {
      return await query
        .withIndex("byIndicator", (q) => q.eq("indicator", indicator))
        .collect();
    } else {
      return await query.collect();
    }
  }
});

export const getStateRankings = query({
  args: {
    indicator: v.optional(v.string())
  },
  handler: async (ctx, { indicator }) => {
    const scores = await ctx.db.query("state_scores").collect();
    
    // Group by state and calculate totals
    const stateTotals: Record<string, number> = {};
    
    scores.forEach(score => {
      if (!indicator || score.indicator === indicator) {
        if (!stateTotals[score.state]) {
          stateTotals[score.state] = 0;
        }
        stateTotals[score.state] += score.score;
      }
    });
    
    // Sort by total score
    return Object.entries(stateTotals)
      .map(([state, totalScore]) => ({ state, totalScore }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }
});
