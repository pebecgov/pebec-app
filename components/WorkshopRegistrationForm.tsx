'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle, Loader2 } from 'lucide-react';

const SECTORS = [
  "Health",
  "IT/FinTech/Artificial Intelligence", 
  "Agriculture",
  "Shipping",
  "Infrastructure and Real Estate Development",
  "Renewable Energy"
] as const;

export default function WorkshopRegistrationForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    designation: '',
    sector: '' as string
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState('');

  const registerWorkshop = useMutation(api.workshop.registerWorkshop);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sector) {
      toast.error("Please select a sector");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await registerWorkshop({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        organization: formData.organization,
        designation: formData.designation,
        sector: formData.sector as any
      });
      
      setRegistrationNumber(result.registrationNumber);
      setIsSuccess(true);
      toast.success("Registration successful!");
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        organization: '',
        designation: '',
        sector: ''
      });
    } catch (error: any) {
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">Registration Successful!</CardTitle>
          <CardDescription>
            Thank you for registering for the Strategic Engagement Workshop
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 mb-2">Your Registration Number:</p>
            <p className="text-xl font-mono font-bold text-green-800">{registrationNumber}</p>
          </div>
          <p className="text-sm text-gray-600">
            Please keep this registration number for your records. You will receive a confirmation email shortly.
          </p>
          <Button 
            onClick={() => {
              setIsSuccess(false);
              setRegistrationNumber('');
            }}
            variant="outline"
          >
            Register Another Person
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Workshop Registration</CardTitle>
        <CardDescription className="text-center">
          Strategic Engagement on Business Facilitation & Investment Access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
                placeholder="Enter your phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="organization">Organization/Business *</Label>
              <Input
                id="organization"
                type="text"
                value={formData.organization}
                onChange={(e) => handleInputChange('organization', e.target.value)}
                required
                placeholder="Enter your organization"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation">Designation at Organization *</Label>
            <Input
              id="designation"
              type="text"
              value={formData.designation}
              onChange={(e) => handleInputChange('designation', e.target.value)}
              required
              placeholder="Enter your designation/position"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector">Sector Specific *</Label>
            <Select value={formData.sector} onValueChange={(value) => handleInputChange('sector', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your sector" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              'Register for Workshop'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
