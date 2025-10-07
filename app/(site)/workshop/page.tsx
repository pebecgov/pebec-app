import WorkshopRegistrationForm from '@/components/WorkshopRegistrationForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Building } from 'lucide-react';

export default function WorkshopPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-green-100 text-green-800">Virtual Workshop</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Strategic Engagement on Business Facilitation & Investment Access
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Presenting Strategic Investment opportunities in the UAE and Highlighting Nigeria's Business and Investment Climate
          </p>
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Tuesday, October 14th</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium">11:00 AM</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Virtual Workshop</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Organizers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-700">PEBEC</h4>
                <p className="text-sm text-gray-600">Presidential Enabling Business Environment Council</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-700">Embassy of the United Arab Emirates, Abuja</h4>
                <p className="text-sm text-gray-600">UAE Embassy in Nigeria</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workshop Description */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>About This Workshop</CardTitle>
            <CardDescription>
              Join us for an exclusive virtual workshop focused on strategic business facilitation and investment opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              This workshop brings together key stakeholders from Nigeria and the UAE to explore strategic investment opportunities and discuss Nigeria's evolving business and investment climate. Participants will gain insights into:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Strategic investment opportunities in the UAE</li>
              <li>Nigeria's business facilitation reforms and investment climate</li>
              <li>Cross-border business partnerships and collaborations</li>
              <li>Best practices in business environment improvement</li>
              <li>Networking opportunities with key stakeholders</li>
            </ul>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Register for the Workshop</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Fill out the form below to register for the Strategic Engagement Workshop. 
              All fields are required to complete your registration.
            </p>
          </div>
          <WorkshopRegistrationForm />
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Powered by PEBEC Works</p>
        </div>
      </div>
    </div>
  );
}
