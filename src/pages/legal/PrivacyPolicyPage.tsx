import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              JobSight ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our construction field management application ("App"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium mt-6 mb-3">Personal Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may collect personally identifiable information that you voluntarily provide when registering for the App, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Name and email address</li>
              <li>Company name and job title</li>
              <li>Phone number</li>
              <li>Profile photos</li>
            </ul>

            <h3 className="text-lg font-medium mt-6 mb-3">Project Data</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you use the App for construction management, we collect:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Project details and documentation</li>
              <li>Daily reports and field notes</li>
              <li>Photos and videos captured through the App</li>
              <li>Task and workflow information</li>
              <li>Safety inspection records</li>
              <li>RFIs, submittals, and change orders</li>
            </ul>

            <h3 className="text-lg font-medium mt-6 mb-3">Location Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              With your permission, we collect precise location data to geotag photos and verify field presence. You can disable location services at any time through your device settings.
            </p>

            <h3 className="text-lg font-medium mt-6 mb-3">Device Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              We automatically collect device information including device type, operating system, unique device identifiers, and mobile network information.
            </p>

            <h3 className="text-lg font-medium mt-6 mb-3">Usage Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              We collect information about how you interact with the App, including features used, pages visited, and time spent in the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and maintain the App's functionality</li>
              <li>Process and manage your account</li>
              <li>Enable project collaboration and team communication</li>
              <li>Geotag photos for accurate field documentation</li>
              <li>Generate reports and analytics for your projects</li>
              <li>Send notifications about project updates and deadlines</li>
              <li>Improve our services and develop new features</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>With Your Team:</strong> Project data is shared with authorized team members and collaborators you designate</li>
              <li><strong>Service Providers:</strong> We use third-party services for hosting, analytics, and support that may access your data to perform services on our behalf</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your data, including encryption in transit and at rest, secure authentication, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide you services. Project data is retained according to your organization's retention policies. You may request deletion of your data at any time, subject to legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at the email address provided below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The App is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected data from a child under 13, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-medium">JobSight</p>
              <p className="text-muted-foreground">Email: privacy@jobsightapp.com</p>
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

export default PrivacyPolicyPage;
