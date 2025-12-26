// JobSight Company Registration
// Luxury Editorial Aesthetic - Warm, sophisticated, magazine-inspired

import { useState, useEffect } from 'react';
import { Check, Building2, Users, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../lib/utils/logger';

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
      const companyName = mode === 'new' ? newCompanyName : selectedCompany?.name;
      if (!companyName) {
        throw new Error('Company name is required');
      }

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

      await new Promise(resolve => setTimeout(resolve, 1000));

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('approval_status')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          logger.error('Error fetching profile:', profileError);
          navigate('/pending-approval');
          return;
        }

        if (profile.approval_status === 'approved') {
          navigate('/dashboard');
        } else {
          navigate('/pending-approval');
        }
      }
    } catch (error) {
      logger.error('Registration error:', error);
      alert(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen bg-[#FAF5F0] relative overflow-hidden">
        {/* Warm gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4622A]/5 via-transparent to-[#8B4513]/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-[#D4622A]/10 to-transparent blur-3xl pointer-events-none" />

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-[#D4622A]/10 blur-2xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-[#8B4513]/10 blur-2xl" />

        <div className="relative z-10 min-h-screen flex items-center justify-center p-6 py-16">
          <div className="w-full max-w-4xl">
            {/* Header */}
            <div className="text-center mb-16 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 mb-6 px-5 py-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-[#D4622A]/10">
                <Sparkles size={16} className="text-[#D4622A]" />
                <span className="text-[#8B4513] text-sm font-medium tracking-wide">
                  Registration Portal
                </span>
              </div>
              <h1 className="text-6xl md:text-7xl font-bold text-[#2C2C2C] mb-6 tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}>
                Welcome to <span className="text-[#D4622A]">JobSight</span>
              </h1>
              <p className="text-[#6B5D52] text-xl max-w-2xl mx-auto leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Construction field management designed for teams that build extraordinary projects.
              </p>
            </div>

            {/* Main Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#D4622A]/10 overflow-hidden border border-[#D4622A]/10">
              {/* Progress Steps */}
              <div className="border-b border-[#F0E8DB] bg-gradient-to-r from-[#FAF5F0] to-white px-8 py-8">
                <div className="flex items-center justify-center max-w-md mx-auto">
                  <div className="flex items-center gap-4">
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700 ${
                      step === 'company'
                        ? 'bg-gradient-to-br from-[#D4622A] to-[#B8541F] text-white shadow-lg shadow-[#D4622A]/30 scale-110'
                        : 'bg-white text-[#D4622A] border-2 border-[#D4622A]'
                    }`} style={{ fontFamily: "'Playfair Display', serif" }}>
                      {step === 'details' ? <Check size={24} strokeWidth={3} /> : <span className="text-lg font-bold">1</span>}
                    </div>
                    <span className={`font-semibold text-sm transition-colors ${
                      step === 'company' ? 'text-[#2C2C2C]' : 'text-[#9B8B7E]'
                    }`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Company
                    </span>
                  </div>

                  <div className="flex-1 h-1 mx-6 bg-[#F0E8DB] relative overflow-hidden rounded-full max-w-[100px]">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#D4622A] to-[#B8541F] transition-all duration-1000 ease-out rounded-full"
                      style={{ width: step === 'details' ? '100%' : '0%' }}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700 ${
                      step === 'details'
                        ? 'bg-gradient-to-br from-[#D4622A] to-[#B8541F] text-white shadow-lg shadow-[#D4622A]/30 scale-110'
                        : 'bg-[#F0E8DB] text-[#9B8B7E]'
                    }`} style={{ fontFamily: "'Playfair Display', serif" }}>
                      <span className="text-lg font-bold">2</span>
                    </div>
                    <span className={`font-semibold text-sm transition-colors ${
                      step === 'details' ? 'text-[#2C2C2C]' : 'text-[#9B8B7E]'
                    }`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Your Details
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 1: Company Selection */}
              {step === 'company' && (
                <div className="p-10 md:p-14 animate-slide-in">
                  <h2 className="text-4xl font-bold text-[#2C2C2C] mb-3"
                    style={{ fontFamily: "'Playfair Display', serif" }}>
                    Choose your company
                  </h2>
                  <p className="text-[#6B5D52] mb-10 text-lg"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Create a new company or join an existing team.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Create New Company */}
                    <button
                      onClick={() => setMode('new')}
                      className={`group relative p-8 rounded-2xl border-2 transition-all duration-500 text-left ${
                        mode === 'new'
                          ? 'border-[#D4622A] bg-gradient-to-br from-[#D4622A]/10 to-[#D4622A]/5 shadow-lg shadow-[#D4622A]/20'
                          : 'border-[#F0E8DB] bg-white hover:border-[#D4622A]/40 hover:shadow-md'
                      }`}
                    >
                      <div className="absolute top-6 right-6">
                        <div className={`w-7 h-7 rounded-full border-2 transition-all duration-500 flex items-center justify-center ${
                          mode === 'new'
                            ? 'border-[#D4622A] bg-[#D4622A]'
                            : 'border-[#E0D5C7]'
                        }`}>
                          {mode === 'new' && <Check size={16} className="text-white" strokeWidth={3} />}
                        </div>
                      </div>

                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500 ${
                        mode === 'new'
                          ? 'bg-gradient-to-br from-[#D4622A] to-[#B8541F] shadow-lg shadow-[#D4622A]/30'
                          : 'bg-[#FAF5F0] group-hover:bg-[#D4622A]/10'
                      }`}>
                        <Building2 size={32} className={mode === 'new' ? 'text-white' : 'text-[#D4622A]'} strokeWidth={1.5} />
                      </div>
                      <h3 className="text-2xl font-bold text-[#2C2C2C] mb-3"
                        style={{ fontFamily: "'Playfair Display', serif" }}>
                        Create New Company
                      </h3>
                      <p className="text-[#6B5D52] leading-relaxed"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Start fresh as an admin with full access to set up your team and projects.
                      </p>
                    </button>

                    {/* Join Existing */}
                    <button
                      onClick={() => setMode('join')}
                      className={`group relative p-8 rounded-2xl border-2 transition-all duration-500 text-left ${
                        mode === 'join'
                          ? 'border-[#D4622A] bg-gradient-to-br from-[#D4622A]/10 to-[#D4622A]/5 shadow-lg shadow-[#D4622A]/20'
                          : 'border-[#F0E8DB] bg-white hover:border-[#D4622A]/40 hover:shadow-md'
                      }`}
                    >
                      <div className="absolute top-6 right-6">
                        <div className={`w-7 h-7 rounded-full border-2 transition-all duration-500 flex items-center justify-center ${
                          mode === 'join'
                            ? 'border-[#D4622A] bg-[#D4622A]'
                            : 'border-[#E0D5C7]'
                        }`}>
                          {mode === 'join' && <Check size={16} className="text-white" strokeWidth={3} />}
                        </div>
                      </div>

                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500 ${
                        mode === 'join'
                          ? 'bg-gradient-to-br from-[#8B4513] to-[#6B3410] shadow-lg shadow-[#8B4513]/30'
                          : 'bg-[#FAF5F0] group-hover:bg-[#8B4513]/10'
                      }`}>
                        <Users size={32} className={mode === 'join' ? 'text-white' : 'text-[#8B4513]'} strokeWidth={1.5} />
                      </div>
                      <h3 className="text-2xl font-bold text-[#2C2C2C] mb-3"
                        style={{ fontFamily: "'Playfair Display', serif" }}>
                        Join Existing Company
                      </h3>
                      <p className="text-[#6B5D52] leading-relaxed"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Request to join your team. Admin approval required for access.
                      </p>
                    </button>
                  </div>

                  {/* Company Input */}
                  {mode === 'new' && (
                    <div className="mt-10 animate-fade-in">
                      <label className="block text-sm font-semibold text-[#8B4513] uppercase tracking-wider mb-3"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        placeholder="Enter your company name..."
                        className="w-full px-6 py-5 bg-[#FAF5F0] border-2 border-[#E0D5C7] rounded-2xl text-[#2C2C2C] placeholder-[#9B8B7E] focus:border-[#D4622A] focus:outline-none focus:bg-white transition-all shadow-sm"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />
                    </div>
                  )}

                  {mode === 'join' && (
                    <div className="mt-10 animate-fade-in space-y-5">
                      <label className="block text-sm font-semibold text-[#8B4513] uppercase tracking-wider mb-3"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Search Companies
                      </label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type to search..."
                        className="w-full px-6 py-5 bg-[#FAF5F0] border-2 border-[#E0D5C7] rounded-2xl text-[#2C2C2C] placeholder-[#9B8B7E] focus:border-[#D4622A] focus:outline-none focus:bg-white transition-all shadow-sm"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />

                      {companies.length > 0 && (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                          {companies.map((company) => (
                            <button
                              key={company.id}
                              onClick={() => setSelectedCompany(company)}
                              className={`w-full p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                                selectedCompany?.id === company.id
                                  ? 'border-[#D4622A] bg-[#D4622A]/5 shadow-md'
                                  : 'border-[#E0D5C7] bg-white hover:border-[#D4622A]/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-[#2C2C2C] text-lg"
                                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {company.name}
                                  </p>
                                  {company.user_count && (
                                    <p className="text-sm text-[#9B8B7E] mt-1">
                                      {company.user_count} members
                                    </p>
                                  )}
                                </div>
                                {selectedCompany?.id === company.id && (
                                  <Check size={24} className="text-[#D4622A]" strokeWidth={3} />
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
                      className="mt-10 w-full px-10 py-5 bg-gradient-to-r from-[#D4622A] to-[#B8541F] hover:from-[#B8541F] hover:to-[#D4622A] text-white font-bold rounded-2xl transition-all duration-500 flex items-center justify-center gap-3 group animate-fade-in shadow-xl shadow-[#D4622A]/30 hover:shadow-2xl hover:shadow-[#D4622A]/40 text-lg"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Continue to Next Step
                      <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform duration-300" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}

              {/* Step 2: User Details */}
              {step === 'details' && (
                <form onSubmit={handleRegistration} className="p-10 md:p-14 animate-slide-in">
                  <button
                    type="button"
                    onClick={() => setStep('company')}
                    className="text-[#9B8B7E] hover:text-[#D4622A] transition-colors mb-8 flex items-center gap-2 font-medium"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    ← Back to company selection
                  </button>

                  <h2 className="text-4xl font-bold text-[#2C2C2C] mb-3"
                    style={{ fontFamily: "'Playfair Display', serif" }}>
                    Your details
                  </h2>
                  <p className="text-[#6B5D52] mb-10 text-lg"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {mode === 'new'
                      ? `You'll be the admin of ${newCompanyName}`
                      : `Requesting to join ${selectedCompany?.name}`
                    }
                  </p>

                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-[#8B4513] uppercase tracking-wider mb-3"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          First Name
                        </label>
                        <input
                          type="text"
                          required
                          value={userData.firstName}
                          onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                          className="w-full px-6 py-4 bg-[#FAF5F0] border-2 border-[#E0D5C7] rounded-2xl text-[#2C2C2C] placeholder-[#9B8B7E] focus:border-[#D4622A] focus:outline-none focus:bg-white transition-all"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#8B4513] uppercase tracking-wider mb-3"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Last Name
                        </label>
                        <input
                          type="text"
                          required
                          value={userData.lastName}
                          onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                          className="w-full px-6 py-4 bg-[#FAF5F0] border-2 border-[#E0D5C7] rounded-2xl text-[#2C2C2C] placeholder-[#9B8B7E] focus:border-[#D4622A] focus:outline-none focus:bg-white transition-all"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#8B4513] uppercase tracking-wider mb-3"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={userData.email}
                        onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                        className="w-full px-6 py-4 bg-[#FAF5F0] border-2 border-[#E0D5C7] rounded-2xl text-[#2C2C2C] placeholder-[#9B8B7E] focus:border-[#D4622A] focus:outline-none focus:bg-white transition-all"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#8B4513] uppercase tracking-wider mb-3"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={userData.password}
                        onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                        className="w-full px-6 py-4 bg-[#FAF5F0] border-2 border-[#E0D5C7] rounded-2xl text-[#2C2C2C] placeholder-[#9B8B7E] focus:border-[#D4622A] focus:outline-none focus:bg-white transition-all"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#8B4513] uppercase tracking-wider mb-3"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Role / Title
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Project Manager, Superintendent..."
                        value={userData.role}
                        onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                        className="w-full px-6 py-4 bg-[#FAF5F0] border-2 border-[#E0D5C7] rounded-2xl text-[#2C2C2C] placeholder-[#9B8B7E] focus:border-[#D4622A] focus:outline-none focus:bg-white transition-all"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-10 w-full px-10 py-5 bg-gradient-to-r from-[#D4622A] to-[#B8541F] hover:from-[#B8541F] hover:to-[#D4622A] disabled:from-[#E0D5C7] disabled:to-[#E0D5C7] disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all duration-500 flex items-center justify-center gap-3 shadow-xl shadow-[#D4622A]/30 hover:shadow-2xl hover:shadow-[#D4622A]/40 text-lg"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={22} className="animate-spin" strokeWidth={2.5} />
                        Creating Your Account...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <ArrowRight size={22} strokeWidth={2.5} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-[#6B5D52] mt-10 text-lg"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Already have an account?{' '}
              <a href="/login" className="text-[#D4622A] hover:text-[#B8541F] font-semibold transition-colors underline decoration-2 underline-offset-4">
                Sign in here
              </a>
            </p>
          </div>
        </div>

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

          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .animate-fade-in-up {
            animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .animate-slide-in {
            animation: slide-in 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }
        `}</style>
      </div>
    </>
  );
}
