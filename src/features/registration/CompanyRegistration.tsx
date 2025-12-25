// JobSight Company Registration
// Distinctive industrial-inspired design with blueprint aesthetics

import { useState, useEffect } from 'react';
import { Check, Building2, Users, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Company {
  id: string;
  name: string;
  user_count?: number;
}

export function CompanyRegistration() {
  const [step, setStep] = useState<'company' | 'details'>('company');
  const [mode, setMode] = useState<'new' | 'join' | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: ''
  });
  const navigate = useNavigate();

  // Fetch companies for search
  useEffect(() => {
    if (mode === 'join' && searchQuery.length > 1) {
      const searchCompanies = async () => {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .ilike('name', `%${searchQuery}%`)
          .limit(5);
        setCompanies(data || []);
      };
      searchCompanies();
    }
  }, [searchQuery, mode]);

  const handleCompanySelection = () => {
    if (mode === 'new' && newCompanyName.trim()) {
      setStep('details');
    } else if (mode === 'join' && selectedCompany) {
      setStep('details');
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Determine company name for metadata
      const companyName = mode === 'new' ? newCompanyName : selectedCompany?.name;
      if (!companyName) {
        throw new Error('Company name is required');
      }

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            company_name: companyName,
            role_title: userData.role
          }
        }
      });

      if (error) throw error;

      // Wait a moment for the trigger to create the user profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch the user's profile to check approval status
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('approval_status')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // Default to pending if we can't fetch the profile
          navigate('/pending-approval');
          return;
        }

        // Navigate based on approval status
        if (profile.approval_status === 'approved') {
          navigate('/dashboard');
        } else {
          navigate('/pending-approval');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1419] relative overflow-hidden">
      {/* Blueprint grid background */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(#2C3E50 1px, transparent 1px),
            linear-gradient(90deg, #2C3E50 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Diagonal accent element */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-bl from-[#FF6B35]/5 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#FF6B35]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 rounded-full bg-[#2C3E50]/30 border border-[#2C3E50]/50">
              <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
              <span className="text-[#95A5A6] text-sm font-medium tracking-wide uppercase">Registration Portal</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              Join <span className="text-[#FF6B35]">JobSight</span>
            </h1>
            <p className="text-[#95A5A6] text-lg max-w-2xl mx-auto">
              Construction field management platform designed for teams that build the future.
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-[#1A1A2E]/80 backdrop-blur-xl rounded-2xl border border-[#2C3E50]/50 overflow-hidden shadow-2xl">
            {/* Progress Steps */}
            <div className="border-b border-[#2C3E50]/30 bg-[#0F1419]/50 px-8 py-6">
              <div className="flex items-center justify-between max-w-md mx-auto">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    step === 'company'
                      ? 'bg-[#FF6B35] text-white scale-110'
                      : 'bg-[#2C3E50] text-[#95A5A6]'
                  }`}>
                    {step === 'details' ? <Check size={20} /> : '1'}
                  </div>
                  <span className={`font-semibold transition-colors ${
                    step === 'company' ? 'text-white' : 'text-[#95A5A6]'
                  }`}>
                    Company
                  </span>
                </div>

                <div className="flex-1 h-0.5 mx-4 bg-[#2C3E50] relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#FF6B35] transition-all duration-700"
                    style={{ width: step === 'details' ? '100%' : '0%' }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    step === 'details'
                      ? 'bg-[#FF6B35] text-white scale-110'
                      : 'bg-[#2C3E50] text-[#95A5A6]'
                  }`}>
                    2
                  </div>
                  <span className={`font-semibold transition-colors ${
                    step === 'details' ? 'text-white' : 'text-[#95A5A6]'
                  }`}>
                    Your Details
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1: Company Selection */}
            {step === 'company' && (
              <div className="p-8 md:p-12 animate-slide-in">
                <h2 className="text-3xl font-bold text-white mb-3">Choose your company</h2>
                <p className="text-[#95A5A6] mb-8">Create a new company or join an existing one.</p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Create New Company */}
                  <button
                    onClick={() => setMode('new')}
                    className={`group relative p-8 rounded-xl border-2 transition-all duration-300 text-left ${
                      mode === 'new'
                        ? 'border-[#FF6B35] bg-[#FF6B35]/5'
                        : 'border-[#2C3E50] bg-[#1A1A2E]/50 hover:border-[#FF6B35]/50'
                    }`}
                  >
                    <div className="absolute top-4 right-4">
                      <div className={`w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                        mode === 'new'
                          ? 'border-[#FF6B35] bg-[#FF6B35]'
                          : 'border-[#2C3E50] bg-transparent'
                      }`}>
                        {mode === 'new' && <Check size={14} className="text-white" />}
                      </div>
                    </div>

                    <div className="w-14 h-14 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Building2 size={28} className="text-[#FF6B35]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Create New Company</h3>
                    <p className="text-[#95A5A6]">Start fresh as an admin with full access to set up your team.</p>
                  </button>

                  {/* Join Existing */}
                  <button
                    onClick={() => setMode('join')}
                    className={`group relative p-8 rounded-xl border-2 transition-all duration-300 text-left ${
                      mode === 'join'
                        ? 'border-[#FF6B35] bg-[#FF6B35]/5'
                        : 'border-[#2C3E50] bg-[#1A1A2E]/50 hover:border-[#FF6B35]/50'
                    }`}
                  >
                    <div className="absolute top-4 right-4">
                      <div className={`w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                        mode === 'join'
                          ? 'border-[#FF6B35] bg-[#FF6B35]'
                          : 'border-[#2C3E50] bg-transparent'
                      }`}>
                        {mode === 'join' && <Check size={14} className="text-white" />}
                      </div>
                    </div>

                    <div className="w-14 h-14 rounded-xl bg-[#2C3E50]/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Users size={28} className="text-[#95A5A6]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Join Existing Company</h3>
                    <p className="text-[#95A5A6]">Request to join your team. Admin approval required.</p>
                  </button>
                </div>

                {/* Company Input */}
                {mode === 'new' && (
                  <div className="mt-8 animate-fade-in">
                    <label className="block text-sm font-semibold text-[#95A5A6] uppercase tracking-wide mb-3">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Enter your company name..."
                      className="w-full px-6 py-4 bg-[#0F1419] border-2 border-[#2C3E50] rounded-xl text-white placeholder-[#95A5A6]/50 focus:border-[#FF6B35] focus:outline-none transition-colors"
                    />
                  </div>
                )}

                {mode === 'join' && (
                  <div className="mt-8 animate-fade-in space-y-4">
                    <label className="block text-sm font-semibold text-[#95A5A6] uppercase tracking-wide mb-3">
                      Search Companies
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type to search..."
                      className="w-full px-6 py-4 bg-[#0F1419] border-2 border-[#2C3E50] rounded-xl text-white placeholder-[#95A5A6]/50 focus:border-[#FF6B35] focus:outline-none transition-colors"
                    />

                    {companies.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {companies.map((company) => (
                          <button
                            key={company.id}
                            onClick={() => setSelectedCompany(company)}
                            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                              selectedCompany?.id === company.id
                                ? 'border-[#FF6B35] bg-[#FF6B35]/5'
                                : 'border-[#2C3E50] bg-[#1A1A2E]/30 hover:border-[#FF6B35]/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-white">{company.name}</p>
                                {company.user_count && (
                                  <p className="text-sm text-[#95A5A6]">{company.user_count} members</p>
                                )}
                              </div>
                              {selectedCompany?.id === company.id && (
                                <Check size={20} className="text-[#FF6B35]" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Continue Button */}
                {((mode === 'new' && newCompanyName.trim()) || (mode === 'join' && selectedCompany)) && (
                  <button
                    onClick={handleCompanySelection}
                    className="mt-8 w-full px-8 py-4 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group animate-fade-in"
                  >
                    Continue
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            )}

            {/* Step 2: User Details */}
            {step === 'details' && (
              <form onSubmit={handleRegistration} className="p-8 md:p-12 animate-slide-in">
                <button
                  type="button"
                  onClick={() => setStep('company')}
                  className="text-[#95A5A6] hover:text-white transition-colors mb-6 flex items-center gap-2"
                >
                  ← Back
                </button>

                <h2 className="text-3xl font-bold text-white mb-3">Your details</h2>
                <p className="text-[#95A5A6] mb-8">
                  {mode === 'new'
                    ? `You'll be the admin of ${newCompanyName}`
                    : `Requesting to join ${selectedCompany?.name}`
                  }
                </p>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-[#95A5A6] uppercase tracking-wide mb-3">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={userData.firstName}
                        onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                        className="w-full px-6 py-4 bg-[#0F1419] border-2 border-[#2C3E50] rounded-xl text-white placeholder-[#95A5A6]/50 focus:border-[#FF6B35] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#95A5A6] uppercase tracking-wide mb-3">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={userData.lastName}
                        onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                        className="w-full px-6 py-4 bg-[#0F1419] border-2 border-[#2C3E50] rounded-xl text-white placeholder-[#95A5A6]/50 focus:border-[#FF6B35] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#95A5A6] uppercase tracking-wide mb-3">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      className="w-full px-6 py-4 bg-[#0F1419] border-2 border-[#2C3E50] rounded-xl text-white placeholder-[#95A5A6]/50 focus:border-[#FF6B35] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#95A5A6] uppercase tracking-wide mb-3">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={userData.password}
                      onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                      className="w-full px-6 py-4 bg-[#0F1419] border-2 border-[#2C3E50] rounded-xl text-white placeholder-[#95A5A6]/50 focus:border-[#FF6B35] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#95A5A6] uppercase tracking-wide mb-3">
                      Role / Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Project Manager, Superintendent..."
                      value={userData.role}
                      onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                      className="w-full px-6 py-4 bg-[#0F1419] border-2 border-[#2C3E50] rounded-xl text-white placeholder-[#95A5A6]/50 focus:border-[#FF6B35] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-8 w-full px-8 py-4 bg-[#FF6B35] hover:bg-[#FF6B35]/90 disabled:bg-[#2C3E50] disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-[#95A5A6] mt-8">
            Already have an account?{' '}
            <a href="/login" className="text-[#FF6B35] hover:underline font-semibold">
              Sign in
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-in {
          animation: slide-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
