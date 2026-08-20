"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, ArrowRight, Trophy, Target } from "lucide-react";

export default function ScoresLandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gray-100 pt-20 pb-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">PEBEC Performance Tracker</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Track the performance of Nigerian states and federal MDAs in business climate reforms and service delivery
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* State Rankings Card */}
          <Card className="group hover:shadow-lg transition-shadow duration-300 cursor-pointer">
            <Link href="/scores/states">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <MapPin className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl text-gray-900 group-hover:text-blue-600 transition-colors">
                      State Rankings
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Nigerian state performance in business climate indicators
                    </CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-gray-600">View complete state business climate rankings</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600">Detailed indicator breakdowns available</span>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" className="w-full group-hover:bg-blue-50 group-hover:border-blue-300">
                      View State Rankings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>

          {/* MDA Performance Card */}
          <Card className="group hover:shadow-lg transition-shadow duration-300 cursor-pointer">
            <Link href="/scores/mdas">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <Building2 className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl text-gray-900 group-hover:text-purple-600 transition-colors">
                      MDA Performance
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Federal agency performance in service delivery and efficiency
                    </CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-gray-600">Track MDA service delivery metrics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600">Individual performance breakdowns</span>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" className="w-full group-hover:bg-purple-50 group-hover:border-purple-300">
                      View MDA Performance
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>

        </div>
      </div>
    </div>
  );
}