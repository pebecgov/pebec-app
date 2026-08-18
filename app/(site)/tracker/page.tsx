"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MapPin, TrendingUp, Users } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function TrackerPage() {
  const currentYear = 2025; // Use 2025 where state data exists
  
  // Get some live data to show in the cards
  const stateData = useQuery(api.public_scores.getPublicStateRankings, { limit: 3, year: currentYear });
  const mdaData = useQuery(api.public_scores.getPublicMdaScores, { year: currentYear, limit: 3 });

  const topStates = stateData?.states?.slice(0, 3) || [];
  const topMdas = mdaData?.mdas?.slice(0, 3) || [];

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Performance Tracker
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Track real-time performance data for Nigerian states and federal MDAs. 
          Monitor business climate improvements and regulatory compliance scores.
        </p>
      </div>

      {/* Tracker Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        
        {/* State Rankings Card */}
        <Link href="/scores?tab=states" className="group">
          <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-500 cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                    <MapPin className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-gray-900 group-hover:text-blue-600 transition-colors">
                      State Rankings
                    </CardTitle>
                    <CardDescription className="text-base">
                      Business Climate Performance by State
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                  Live Data
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Track how Nigerian states perform on business climate indicators including 
                business registration, infrastructure, regulatory compliance, and ease of doing business.
              </p>
              
              {/* Preview of top states */}
              {topStates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Top Performers:</h4>
                  {topStates.map((state, index) => (
                    <div key={state.state} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="text-sm font-medium">{state.state}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-blue-600">
                          {state.percentageScore?.toFixed(1)}%
                        </span>
                        <div className="w-12 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${Math.min(state.percentageScore || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total States:</span>
                  <span className="font-semibold">36 + FCT</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="font-semibold">Real-time</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                <span>View Full Rankings</span>
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* BFA/MDA Scoring Card */}
        <Link href="/scores?tab=mdas" className="group">
          <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-green-500 cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
                    <BarChart3 className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-gray-900 group-hover:text-green-600 transition-colors">
                      BFA Scoring
                    </CardTitle>
                    <CardDescription className="text-base">
                      Federal MDA Performance Tracking
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100">
                  Live Data
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Monitor federal Ministries, Departments, and Agencies (MDAs) performance on 
                efficiency, transparency, stakeholder engagement, and mystery shopping assessments.
              </p>
              
              {/* Preview of top MDAs */}
              {topMdas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Top Performers:</h4>
                  {topMdas.map((mda, index) => (
                    <div key={mda.mdaName} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="text-sm font-medium truncate">{mda.mdaName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-green-600">
                          {mda.finalScore?.toFixed(1) || '0'}
                        </span>
                        <div className="w-12 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-green-500 rounded-full" 
                            style={{ width: `${Math.min((mda.finalScore || 0) / 90 * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total MDAs:</span>
                  <span className="font-semibold">100+</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Max Score:</span>
                  <span className="font-semibold">90 points</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-green-600 font-medium group-hover:text-green-700 transition-colors">
                <span>View Full Scores</span>
                <Users className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
        
      </div>

      {/* Additional Info Section */}
      <div className="mt-16 text-center">
        <div className="bg-gray-50 rounded-lg p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            About the Performance Tracker
          </h3>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">State Rankings</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Comprehensive assessment of Nigerian states based on business climate indicators 
                including regulatory efficiency, infrastructure quality, and ease of doing business metrics.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">BFA Scoring</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Business Facilitation Assessment of federal MDAs measuring efficiency, transparency, 
                mystery shopping performance, and stakeholder engagement across government agencies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}