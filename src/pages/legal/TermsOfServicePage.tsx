import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function TermsOfServicePage() {
  const navigate = useNavigate();
  const lastUpdated = 'December 28, 2024';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="heading-page mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the JobSight construction field management application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              JobSight provides a construction field management platform designed for superintendents and field teams. The App includes features for daily reporting, task management, document control, photo documentation, safety management, RFI tracking, and team collaboration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use the App, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your password and account</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the App for any unlawful purpose</li>
              <li>Share your account credentials with others</li>
              <li>Attempt to gain unauthorized access to any part of the App</li>
              <li>Interfere with or disrupt the App or servers</li>
              <li>Upload malicious code or content</li>
              <li>Reproduce, duplicate, or resell any part of the App</li>
              <li>Use the App in a manner that could damage or overburden our systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. User Content</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You retain ownership of all content you upload to the App ("User Content"). By uploading User Content, you grant us a non-exclusive, worldwide, royalty-free license to use, store, and display your content solely for the purpose of providing the App's services.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for ensuring you have the right to upload any content and that your content does not violate any third-party rights or applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The App, including its design, features, and content (excluding User Content), is owned by JobSight and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the App without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              The App may integrate with third-party services. Your use of such services is subject to their respective terms and privacy policies. We are not responsible for the content, functionality, or practices of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE. YOU USE THE APP AT YOUR OWN RISK.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, JOBSIGHT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE APP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless JobSight, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising out of your use of the App, your User Content, or your violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your access to the App at any time for any reason, including violation of these Terms. Upon termination, your right to use the App will immediately cease. Provisions that by their nature should survive termination will survive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these Terms at any time. We will notify you of material changes by posting the updated Terms in the App or by email. Your continued use of the App after changes become effective constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law principles. Any disputes arising from these Terms shall be resolved in the courts of New York.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">14. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-medium">JobSight</p>
              <p className="text-muted-foreground">Email: legal@jobsightapp.com</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} JobSight. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TermsOfServicePage;
