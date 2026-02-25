"use client";

import { Building2, Clock, Info } from "lucide-react";
import { getMDAsBySector } from "@/components/data/mdaData";

interface MDAServicesRoadmapProps {
    sector: string;
    subsector?: string;
}

export default function MDAServicesRoadmap({ sector, subsector }: MDAServicesRoadmapProps) {
    // Get MDAs for the selected sector
    const mdas = getMDAsBySector(sector);

    // Flatten all services from all MDAs for this sector
    const allServices = mdas.flatMap(mda =>
        mda.services.map((service, index) => ({
            serviceName: service.name,
            issuingMda: mda.acronym,
            mdaFullName: mda.name,
            description: mda.description,
            timeline: service.timeline,
            cost: service.cost,
            requirements: service.requirements,
            isRequired: true, // All services are required by default
            order: index + 1,
            id: `${mda.acronym}-${index}`
        }))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            MDA Services Roadmap
                        </h2>
                        <p className="text-slate-600">
                            Essential services for <span className="font-semibold text-green-600">{sector}</span> businesses
                            {subsector && <span className="text-slate-500"> • {subsector}</span>}
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            {mdas.length} MDAs • {allServices.length} Services
                        </p>
                    </div>
                </div>
            </div>

            {/* Services List */}
            <div className="space-y-4">
                {allServices.map((service, index) => {
                    return (
                        <div
                            key={service.id}
                            className="bg-white rounded-2xl p-6 border-2 border-slate-100 hover:border-slate-200 transition-all"
                        >
                            <div className="flex items-start gap-4">
                                {/* Step Number */}
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                        <span className="text-slate-600 font-bold text-sm">{index + 1}</span>
                                    </div>
                                </div>

                                {/* Service Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-slate-900 mb-1">
                                                {service.serviceName}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Building2 className="w-4 h-4" />
                                                <span className="font-medium">{service.issuingMda}</span>
                                                <span className="text-slate-300">•</span>
                                                <span>{service.mdaFullName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-slate-600 mb-4">{service.description}</p>

                                    {/* Service Metadata */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-4 h-4 text-blue-500" />
                                            <div>
                                                <div className="text-slate-500 text-xs">Timeline</div>
                                                <div className="font-semibold text-slate-900">{service.timeline}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm">
                                            <Info className="w-4 h-4 text-purple-500" />
                                            <div>
                                                <div className="text-slate-500 text-xs">Cost</div>
                                                <div className="font-semibold text-slate-900">{service.cost}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm">
                                            <Info className="w-4 h-4 text-orange-500" />
                                            <div>
                                                <div className="text-slate-500 text-xs">Requirements</div>
                                                <div className="font-semibold text-slate-900 truncate" title={service.requirements}>
                                                    {service.requirements.length > 30
                                                        ? service.requirements.substring(0, 30) + "..."
                                                        : service.requirements}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* No Services Message */}
            {allServices.length === 0 && (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                    <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        No Services Found
                    </h3>
                    <p className="text-slate-500">
                        There are no MDA services configured for this sector yet.
                    </p>
                </div>
            )}
        </div>
    );
}
