// Pending Approval Screen
// Displays while user awaits admin approval to access the app

import { Clock, Mail, Building2, LogOut, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '../../lib/utils/logger';

export function PendingApproval() {
  const [companyName, setCompanyName] = useState<string>('');
  const [fadeIn, setFadeIn] = useState(false);
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  // Fade-in effect on mount
  useEffect(() => {
    const timer = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch company name
  useEffect(() => {
    if (userProfile?.company_id) {
      const fetchCompany = async () => {
        const { data } = await supabase
          .from('companies')
          .select('name')
          .eq('id', userProfile.company_id)
          .single();

        if (data) {
          setCompanyName(data.name);
        }
      };
      fetchCompany();
    }
  }, [userProfile]);

  // Auto-refresh to check approval status every 30 seconds
  useEffect(() => {
    if (!userProfile) {return;}

    const checkApprovalStatus = async () => {
      const { data } = await supabase
        .from('users')
        .select('approval_status')
        .eq('id', userProfile.id)
        .single();

      if (data?.approval_status === 'approved') {
        // User has been approved, redirect to dashboard
        navigate('/dashboard');
      }
    };

    // Check immediately
    checkApprovalStatus();

    // Then check every 30 seconds
    const interval = setInterval(checkApprovalStatus, 30000);

    return () => clearInterval(interval);
  }, [userProfile, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      logger.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-[#FAF5F0] relative overflow-hidden flex items-center justify-center p-6">
        {/* Warm gradient backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4622A]/5 via-transparent to-[#8B4513]/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-[#D4622A]/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-[#8B4513]/10 to-transparent blur-3xl pointer-events-none" />

        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-[#D4622A]/10 blur-2xl animate-float" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-[#8B4513]/10 blur-2xl animate-float-delayed" />

        <div
          className={`relative z-10 max-w-3xl w-full transition-all duration-1000 ${
            fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Main Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#D4622A]/10 overflow-hidden border border-[#D4622A]/10">
            {/* Elegant header accent */}
            <div className="h-1.5 bg-gradient-to-r from-[#D4622A] via-[#B8541F] to-[#8B4513]" />

            <div className="p-12 md:p-16 text-center">
              {/* Animated clock icon */}
              <div className="relative inline-flex items-center justify-center mb-10 animate-fade-in-scale">
                {/* Soft pulsing ring */}
                <div className="absolute w-40 h-40 rounded-full border-2 border-[#D4622A]/20 animate-pulse-soft" />

                {/* Icon container with warm gradient */}
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#D4622A] to-[#B8541F] flex items-center justify-center shadow-xl shadow-[#D4622A]/30">
                  <Clock size={40} className="text-white" strokeWidth={2} />

                  {/* Small sparkle accent */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#8B4513] flex items-center justify-center shadow-lg">
                    <Sparkles size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              {/* Heading */}
              <h1
                className="text-5xl md:text-6xl font-bold text-[#2C2C2C] mb-6 tracking-tight animate-fade-in-up"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  animationDelay: '0.1s'
                }}
              >
                Under Review
              </h1>

              <p
                className="text-xl md:text-2xl text-[#6B5D52] mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  animationDelay: '0.2s'
                }}
              >
                Your access request is being carefully reviewed by your company administrator.
              </p>

              {/* Info cards */}
              <div className="space-y-5 mb-12 max-w-2xl mx-auto">
                <div
                  className="flex items-start gap-5 p-6 rounded-2xl bg-gradient-to-br from-[#FAF5F0] to-[#F0E8DB] border border-[#E0D5C7] text-left shadow-sm animate-fade-in-up"
                  style={{ animationDelay: '0.3s' }}
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D4622A]/20 to-[#B8541F]/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Building2 size={26} className="text-[#D4622A]" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-[#2C2C2C] font-bold mb-2 text-lg"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {companyName || 'Company Verification'}
                    </h3>
                    <p
                      className="text-[#6B5D52] leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {companyName
                        ? `Your request to join ${companyName} is being reviewed. A company administrator will evaluate your credentials and approve access shortly.`
                        : 'Your company administrator has been notified and will review your access request shortly.'
                      }
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-5 p-6 rounded-2xl bg-gradient-to-br from-[#FAF5F0] to-[#F0E8DB] border border-[#E0D5C7] text-left shadow-sm animate-fade-in-up"
                  style={{ animationDelay: '0.4s' }}
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D4622A]/20 to-[#B8541F]/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Mail size={26} className="text-[#D4622A]" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-[#2C2C2C] font-bold mb-2 text-lg"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Email Notification
                    </h3>
                    <p
                      className="text-[#6B5D52] leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      You'll receive an email notification once your account has been approved and activated. Please check your inbox regularly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline estimate badge */}
              <div
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#D4622A]/10 to-[#B8541F]/10 border border-[#D4622A]/20 mb-10 animate-fade-in-up shadow-sm"
                style={{ animationDelay: '0.5s' }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#D4622A] animate-pulse-soft" />
                <span
                  className="text-[#D4622A] font-bold tracking-wide"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Usually approved within 24 hours
                </span>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="group px-10 py-4 bg-white hover:bg-[#FAF5F0] border-2 border-[#E0D5C7] hover:border-[#D4622A]/30 text-[#6B5D52] hover:text-[#D4622A] rounded-2xl transition-all duration-300 flex items-center gap-3 mx-auto shadow-sm hover:shadow-md animate-fade-in-up"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  animationDelay: '0.6s'
                }}
              >
                <LogOut size={20} strokeWidth={2.5} />
                <span className="font-bold">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Support link */}
          <p
            className="text-center text-[#6B5D52] mt-8 animate-fade-in-up"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              animationDelay: '0.7s'
            }}
          >
            Need help?{' '}
            <a
              href="mailto:support@jobsight.com"
              className="text-[#D4622A] hover:text-[#B8541F] underline decoration-2 underline-offset-4 font-semibold transition-colors duration-200"
            >
              Contact Support
            </a>
          </p>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fade-in-scale {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes pulse-soft {
            0%, 100% {
              opacity: 0.3;
              transform: scale(1);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.05);
            }
          }

          @keyframes float {
            0%, 100% {
              transform: translate(0, 0);
            }
            50% {
              transform: translate(20px, -20px);
            }
          }

          @keyframes float-delayed {
            0%, 100% {
              transform: translate(0, 0);
            }
            50% {
              transform: translate(-20px, 20px);
            }
          }

          .animate-fade-in-up {
            animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
          }

          .animate-fade-in-scale {
            animation: fade-in-scale 1s cubic-bezier(0.16, 1, 0.3, 1) both;
          }

          .animate-pulse-soft {
            animation: pulse-soft 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          .animate-float {
            animation: float 8s ease-in-out infinite;
          }

          .animate-float-delayed {
            animation: float-delayed 8s ease-in-out infinite;
            animation-delay: 2s;
          }
        `}</style>
      </div>
    </>
  );
}
