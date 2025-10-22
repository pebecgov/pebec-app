// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, CheckCircle, AlertCircle } from "lucide-react";

export default function SendUngaThankYouEmail() {
  const { toast } = useToast();
  const sendThankYouEmail = useAction(api.ungaThankYouEmail.sendThankYouEmail);
  
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [googleDriveLink, setGoogleDriveLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !firstName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both email and first name fields.",
        variant: "destructive"
      });
      return;
    }

    if (!email.includes("@")) {
      toast({
        title: "Error", 
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await sendThankYouEmail({
        to: email.trim(),
        firstName: firstName.trim(),
        googleDriveLink: googleDriveLink.trim() || undefined
      });

      if (result.success) {
        toast({
          title: "Success!",
          description: `Thank you email sent successfully to ${email}`,
        });
        setLastSentEmail(email);
        setEmail("");
        setFirstName("");
        setGoogleDriveLink("");
      } else {
        toast({
          title: "Failed",
          description: result.error || "Failed to send email. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: "An error occurred while sending the email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-green-600" />
          Send UNGA Thank You Email
        </CardTitle>
        <CardDescription>
          Send a personalized thank you email to a specific user who didn't receive it initially.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSendEmail} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="googleDriveLink">Google Drive Link (Optional)</Label>
              <Input
                id="googleDriveLink"
                type="url"
                value={googleDriveLink}
                onChange={(e) => setGoogleDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Add a Google Drive link to include in the email (e.g., for event photos or documents)
              </p>
            </div>
          </div>

          {lastSentEmail && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Last email sent to: <strong>{lastSentEmail}</strong>
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Email Preview:</p>
              <p>• Subject: "Thank You for Joining Us at the PEBEC UNGA 80 Side Event"</p>
              <p>• Personalized greeting with first name</p>
              <p>• Professional thank you message from Princess Zahrah Mustapha Audu</p>
              <p>• Event photos and social media links</p>
              {googleDriveLink && <p>• "View Full Report" button linking to: {googleDriveLink}</p>}
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !email.trim() || !firstName.trim()}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Email...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Thank You Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
