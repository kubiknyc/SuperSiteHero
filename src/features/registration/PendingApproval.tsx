// Pending Approval Screen
// Displays while user awaits admin approval to access the app

import { Clock, Mail, Building2, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function PendingApproval() {
  const [pulseScale, setPulseScale] = useState(1);
  const [companyName, setCompanyName] = useState<string>('');
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  // Pulse animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale(s => s === 1 ? 1.1 : 1);
    }, 2000);
    return () => clearInterval(interval);
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
    if (!userProfile) return;

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
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1419] relative overflow-hidden flex items-center justify-center p-6">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(#2C3E50 1px, transparent 1px),
            linear-gradient(90deg, #2C3E50 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Radial gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#FF6B35]/5 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#2C3E50]/10 blur-3xl animate-float-delayed" />

      <div className="relative z-10 max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-[#1A1A2E]/80 backdrop-blur-xl rounded-2xl border border-[#2C3E50]/50 overflow-hidden shadow-2xl">
          {/* Accent bar */}
          <div className="h-2 bg-gradient-to-r from-[#FF6B35] via-[#FFA500] to-[#FF6B35] animate-shimmer" />

          <div className="p-12 text-center">
            {/* Animated clock icon */}
            <div className="relative inline-flex items-center justify-center mb-8">
              {/* Pulsing rings */}
              <div
                className="absolute w-32 h-32 rounded-full border-2 border-[#FF6B35]/20"
                style={{
                  transform: `scale(${pulseScale})`,
                  transition: 'transform 2s ease-in-out'
                }}
              />
              <div
                className="absolute w-24 h-24 rounded-full border-2 border-[#FF6B35]/30"
                style={{
                  transform: `scale(${pulseScale === 1 ? 1.1 : 1})`,
                  transition: 'transform 2s ease-in-out'
                }}
              />

              {/* Icon container */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FFA500] flex items-center justify-center shadow-lg shadow-[#FF6B35]/20">
                <Clock size={36} className="text-white" strokeWidth={2.5} />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Approval Pending
            </h1>

            <p className="text-xl text-[#95A5A6] mb-8 max-w-md mx-auto leading-relaxed">
              Your request to join is being reviewed by your company administrator.
            </p>

            {/* Info cards */}
            <div className="space-y-4 mb-10">
              <div className="flex items-start gap-4 p-5 rounded-xl bg-[#0F1419]/50 border border-[#2C3E50]/30 text-left">
                <div className="w-12 h-12 rounded-lg bg-[#2C3E50]/30 flex items-center justify-center flex-shrink-0">
                  <Building2 size={24} className="text-[#95A5A6]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    {companyName || 'Company Verification'}
                  </h3>
                  <p className="text-[#95A5A6] text-sm leading-relaxed">
                    {companyName
                      ? `Your request to join ${companyName} is being reviewed by a company admin.`
                      : 'Your company admin has been notified and will review your access request shortly.'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-xl bg-[#0F1419]/50 border border-[#2C3E50]/30 text-left">
                <div className="w-12 h-12 rounded-lg bg-[#2C3E50]/30 flex items-center justify-center flex-shrink-0">
                  <Mail size={24} className="text-[#95A5A6]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Email Notification</h3>
                  <p className="text-[#95A5A6] text-sm leading-relaxed">
                    You'll receive an email once your account has been approved and activated.
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline estimate */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
              <span className="text-[#FF6B35] font-semibold text-sm tracking-wide">
                Usually approved within 24 hours
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="group px-8 py-3 bg-[#2C3E50]/30 hover:bg-[#2C3E50]/50 border border-[#2C3E50] hover:border-[#95A5A6]/30 text-[#95A5A6] hover:text-white rounded-xl transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              <LogOut size={18} />
              <span className="font-semibold">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Support link */}
        <p className="text-center text-[#95A5A6] mt-6 text-sm">
          Need help?{' '}
          <a href="mailto:support@jobsight.com" className="text-[#FF6B35] hover:underline font-semibold">
            Contact Support
          </a>
        </p>
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(30px, -30px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-30px, 30px);
          }
        }

        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
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
  );
}
