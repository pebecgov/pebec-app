// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, Mail } from "lucide-react";

export default function EmailPreview() {
  const [firstName, setFirstName] = useState("John");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const emailTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Joining PEBEC UNGA 80 Side Event</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #21C55E 0%, #16A34A 100%);
          padding: 20px;
          text-align: center;
          color: white;
        }
        .logo {
          max-width: 120px;
          height: auto;
          margin-bottom: 10px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          margin: 10px 0 5px 0;
        }
        .tagline {
          font-size: 14px;
          opacity: 0.9;
        }
        .banner-section {
  position: relative;
  text-align: center;
  padding: 0;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}
.banner-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}
        .banner-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(33, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.8) 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: white;
          text-align: center;
        }
.banner-title {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}
.banner-subtitle {
  font-size: 16px;
  opacity: 0.9;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}
        .content {
          padding: 30px 20px;
          line-height: 1.6;
          color: #333;
        }
        .greeting {
          font-size: 18px;
          margin: 30px 0 25px 0;
          color: #21C55E;
          font-weight: 600;
        }
        .paragraph {
          margin-bottom: 25px;
          font-size: 16px;
          line-height: 1.7;
        }
        .hero-image-section {
          position: relative;
          margin: 30px 0;
          text-align: center;
        }
        .hero-image {
          width: 100%;
          max-width: 500px;
          height: auto;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .image-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(33, 197, 94, 0.9);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          backdrop-filter: blur(10px);
        }
        .overlay-title {
          font-size: 16px;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .overlay-main {
          font-size: 24px;
          font-weight: bold;
          margin: 10px 0;
        }
        .overlay-subtitle {
          font-size: 14px;
          opacity: 0.9;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #21C55E 0%, #16A34A 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 25px;
          font-weight: bold;
          font-size: 16px;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .social-section {
          background-color: #f8f9fa;
          padding: 30px 20px;
          text-align: center;
        }
        .social-title {
          font-size: 20px;
          font-weight: bold;
          color: #21C55E;
          margin-bottom: 20px;
        }
        .social-links {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .social-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: #21C55E;
          color: white;
          padding: 8px 16px;
          text-decoration: none;
          border-radius: 20px;
          font-size: 13px;
          transition: background-color 0.2s;
        }
        .social-link:hover {
          background-color: #16A34A;
        }
        .social-icon {
          width: 16px;
          height: 16px;
          object-fit: contain;
        }
        .footer {
          background-color: #21C55E;
          color: white;
          padding: 20px;
          text-align: center;
          font-size: 14px;
        }
        .signature {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
        }
        .signature-name {
          font-weight: bold;
          color: #21C55E;
          font-size: 18px;
        }
        .signature-title {
          color: #666;
          font-size: 14px;
          margin-top: 5px;
        }
        .event-highlights {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 30px 0;
        }
        .highlight-item {
          text-align: center;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #21C55E;
        }
          @media (max-width: 600px) {
  .banner-image {
    height: 150px;
  }
  .banner-title {
    font-size: 24px;
  }
}
        .highlight-number {
          font-size: 24px;
          font-weight: bold;
          color: #21C55E;
        }
        .highlight-text {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        @media (max-width: 600px) {
          .email-container {
            margin: 0;
            border-radius: 0;
          }
          .banner-title {
            font-size: 24px;
          }
          .hero-image {
            height: 200px;
          }
          .social-links {
            flex-direction: column;
            align-items: center;
          }
          .event-highlights {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
      

      <div class="banner-section">
  <img src="/images/hero/unga.png" alt="UNGA Event Banner" class="banner-image">
</div>

        <!-- Main Content -->
        <div class="content">
          <div class="greeting">Dear ${firstName},</div>
          
          <div class="paragraph">
            On behalf of the Presidential Enabling Business Environment Council (PEBEC), in collaboration with the American Business Council and the U.S. Chamber of Commerce, I extend our heartfelt appreciation for your participation in our side event at the 80th United Nations General Assembly in New York.
          </div>

          <div class="paragraph">
            With the theme "A New Era of Economic Opportunities: Ease of Doing Business in Nigeria," the event created a unique platform for dialogue, networking, and exploration of new opportunities. Together, we showcased Nigeria's reform journey, highlighted the emerging investment landscape, and underscored the critical role of partnerships in unlocking the nation's vast business potential.
          </div>

    

          <div class="paragraph">
            Your engagement and contributions made the discussions richer and more impactful. We are confident that the connections built and insights shared will continue to fuel stronger collaborations for Nigeria's economic growth and global competitiveness.
          </div>

          <div class="paragraph">
            Thank you once again for joining us. We look forward to building on this momentum together.
          </div>

          <div class="signature">
            <div class="signature-name">Princess Zahrah Mustapha Audu</div>
            <div class="signature-title">Director-General</div>
            <div class="signature-title">Presidential Enabling Business Environment Council (PEBEC)</div>
          </div>

          <!-- Hero Image Section -->
          <div class="hero-image-section">
            <img src="/images/hero/IMG_2364.jpg" alt="UNGA Event Highlights" class="hero-image">
          
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://bit.ly/PEBEC-UNGA80-Photos" class="cta-button" target="_blank">
              📸 View Event Photos & Highlights
            </a>
          </div>

          <!-- Social Media Section -->
          <div class="social-section">
            <div class="social-title">Stay Connected with PEBEC</div>
            <p style="margin-bottom: 20px; color: #666;">Follow us for updates on ongoing reforms and upcoming engagements:</p>
            <div class="social-links">
              <a href="https://instagram.com/businessmadeeasy" class="social-link" target="_blank">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" class="social-icon">
                Instagram
              </a>
              <a href="https://twitter.com/pebecgovng" class="social-link" target="_blank">
                <img src="https://cdn-icons-png.flaticon.com/512/3256/3256013.png" alt="X (Twitter)" class="social-icon">
                X (Twitter)
              </a>
              <a href="https://linkedin.com/company/pebecgovng" class="social-link" target="_blank">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" class="social-icon">
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PEBEC. All rights reserved.</p>
          <p>Presidential Enabling Business Environment Council | Making Business Easy in Nigeria</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Eye className="w-5 h-5" />
        Email Template Preview
      </h3>
      
      <div className="space-y-4">
        {/* Preview Controls */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name (for personalization)
            </label>
            <Input
              id="firstName"
              type="text"
              placeholder="Enter first name..."
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setPreviewMode("desktop")}
              variant={previewMode === "desktop" ? "default" : "outline"}
              size="sm"
            >
              Desktop
            </Button>
            <Button
              onClick={() => setPreviewMode("mobile")}
              variant={previewMode === "mobile" ? "default" : "outline"}
              size="sm"
            >
              Mobile
            </Button>
          </div>
        </div>

        {/* Email Preview */}
        <div className={`border rounded-lg overflow-hidden ${
          previewMode === "mobile" ? "max-w-sm mx-auto" : "max-w-4xl mx-auto"
        }`}>
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span className="text-sm font-medium">Email Preview</span>
            <span className="text-xs text-gray-500 ml-auto">
              {previewMode === "mobile" ? "Mobile View" : "Desktop View"}
            </span>
          </div>
          
          <div 
            className="bg-white"
            style={{
              maxHeight: previewMode === "mobile" ? "600px" : "800px",
              overflow: "auto"
            }}
          >
            <iframe
              srcDoc={emailTemplate}
              className="w-full border-0"
              style={{
                height: previewMode === "mobile" ? "600px" : "800px",
                minHeight: "600px"
              }}
              title="Email Template Preview"
            />
          </div>
        </div>

        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
          <p className="font-medium mb-1">Preview Features:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>See exactly how the email will look to recipients</li>
            <li>Test different first names for personalization</li>
            <li>Switch between desktop and mobile views</li>
            <li>All images and styling are included</li>
            <li>No emails are actually sent during preview</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
