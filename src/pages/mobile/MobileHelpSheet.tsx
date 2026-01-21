/**
 * MobileHelpSheet - Help and support bottom sheet for mobile
 *
 * Provides quick access to:
 * - FAQ / Common questions
 * - Contact support (email)
 * - Documentation link
 * - App version info
 */

import { memo } from 'react';
import {
  BookOpen,
  Mail,
  MessageCircle,
  FileQuestion,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface HelpItemProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick?: () => void;
  href?: string;
}

const HelpItem = memo(function HelpItem({
  icon: Icon,
  label,
  description,
  onClick,
  href,
}: HelpItemProps) {
  const content = (
    <>
      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {href && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
    </>
  );

  const className = cn(
    "flex items-center gap-4 w-full p-4 rounded-lg",
    "hover:bg-muted/50 active:bg-muted transition-colors"
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
});

interface MobileHelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileHelpSheet = memo(function MobileHelpSheet({
  open,
  onOpenChange,
}: MobileHelpSheetProps) {
  const handleContactSupport = () => {
    window.location.href = 'mailto:support@jobsight.com?subject=JobSight Mobile Support Request';
  };

  const faqItems = [
    {
      q: 'How do I sync my data?',
      a: 'Data syncs automatically when you have internet. Check the sync status in Settings > Offline & Sync.',
    },
    {
      q: 'How do I add photos to a report?',
      a: 'Open any daily report and tap the camera icon, or use Photo Progress from the main menu.',
    },
    {
      q: 'Can I work offline?',
      a: 'Yes! JobSight stores your data locally and syncs when you reconnect to the internet.',
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Help & Support</SheetTitle>
          <SheetDescription>
            Get help with JobSight or contact our support team
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="space-y-2">
            <HelpItem
              icon={Mail}
              label="Contact Support"
              description="Send us an email for help"
              onClick={handleContactSupport}
            />
            <HelpItem
              icon={BookOpen}
              label="Documentation"
              description="Read guides and tutorials"
              href="https://docs.jobsight.com"
            />
            <HelpItem
              icon={MessageCircle}
              label="Community Forum"
              description="Connect with other users"
              href="https://community.jobsight.com"
            />
          </div>

          {/* FAQ Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileQuestion className="h-4 w-4 text-muted-foreground" />
              <h3 className="heading-subsection text-muted-foreground uppercase">
                Frequently Asked Questions
              </h3>
            </div>
            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <div key={index} className="bg-muted/50 rounded-lg p-4">
                  <p className="font-medium text-sm mb-1">{item.q}</p>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* App Info */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span className="text-xs">JobSight Mobile v1.0.0</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});

export default MobileHelpSheet;
