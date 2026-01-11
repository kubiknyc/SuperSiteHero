/**
 * usePreQualification Hook
 * React Query hooks for subcontractor pre-qualification management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  PreQualificationSubmission,
  PreQualificationQuestionnaire,
  PreQualifiedVendor,
  PreQualificationStatus,
  PreQualificationFilters,
  CreatePreQualificationDTO,
  ReviewPreQualificationDTO,
  PreQualFormValues,
  PreQualScoringResult,
} from '../types'

// Use any for tables not in generated types
const db = supabase as any

// Query keys
export const preQualKeys = {
  all: ['preQualification'] as const,
  questionnaires: () => [...preQualKeys.all, 'questionnaires'] as const,
  questionnaire: (id: string) => [...preQualKeys.questionnaires(), id] as const,
  submissions: () => [...preQualKeys.all, 'submissions'] as const,
  submissionsList: (filters: PreQualificationFilters) => [...preQualKeys.submissions(), filters] as const,
  submission: (id: string) => [...preQualKeys.submissions(), id] as const,
  vendors: () => [...preQualKeys.all, 'vendors'] as const,
  vendorsList: (filters: PreQualificationFilters) => [...preQualKeys.vendors(), filters] as const,
  vendor: (id: string) => [...preQualKeys.vendors(), id] as const,
  stats: () => [...preQualKeys.all, 'stats'] as const,
}

// =============================================
// Questionnaire Queries
// =============================================

/**
 * Get all pre-qualification questionnaires
 */
export function usePreQualQuestionnaires() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: preQualKeys.questionnaires(),
    queryFn: async () => {
      const { data, error } = await db
        .from('prequalification_questionnaires')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as PreQualificationQuestionnaire[]
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Get single questionnaire with sections and questions
 */
export function usePreQualQuestionnaire(id: string | undefined) {
  return useQuery({
    queryKey: preQualKeys.questionnaire(id || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('prequalification_questionnaires')
        .select(`
          *,
          sections:prequalification_sections(
            *,
            questions:prequalification_questions(*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {throw error}

      // Sort sections and questions by sort_order
      if (data.sections) {
        data.sections.sort((a: any, b: any) => a.sort_order - b.sort_order)
        data.sections.forEach((section: any) => {
          if (section.questions) {
            section.questions.sort((a: any, b: any) => a.sort_order - b.sort_order)
          }
        })
      }

      return data as PreQualificationQuestionnaire
    },
    enabled: !!id,
  })
}

// =============================================
// Submission Queries
// =============================================

/**
 * Get pre-qualification submissions with filters
 */
export function usePreQualSubmissions(filters: PreQualificationFilters = {}) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: preQualKeys.submissionsList(filters),
    queryFn: async () => {
      let query = db
        .from('prequalification_submissions')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, contact_name, email, phone),
          questionnaire:prequalification_questionnaires(id, name, version),
          reviewed_by_user:users!reviewed_by(id, full_name)
        `)
        .eq('company_id', userProfile?.company_id)

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters.trades && filters.trades.length > 0) {
        query = query.overlaps('trades', filters.trades)
      }

      if (filters.minScore !== undefined) {
        query = query.gte('score', filters.minScore)
      }

      if (filters.expiringWithinDays) {
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + filters.expiringWithinDays)
        query = query.lte('expires_at', expiryDate.toISOString())
      }

      if (filters.search) {
        query = query.or(`
          subcontractor.company_name.ilike.%${filters.search}%,
          subcontractor.contact_name.ilike.%${filters.search}%
        `)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {throw error}
      return data as (PreQualificationSubmission & {
        subcontractor: any
        questionnaire: any
        reviewed_by_user: any
      })[]
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Get single submission with details
 */
export function usePreQualSubmission(id: string | undefined) {
  return useQuery({
    queryKey: preQualKeys.submission(id || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('prequalification_submissions')
        .select(`
          *,
          subcontractor:subcontractors(*),
          questionnaire:prequalification_questionnaires(
            *,
            sections:prequalification_sections(
              *,
              questions:prequalification_questions(*)
            )
          ),
          safety_record:prequalification_safety_records(*),
          financials:prequalification_financials(*),
          references:prequalification_references(*),
          reviewed_by_user:users!reviewed_by(id, full_name)
        `)
        .eq('id', id)
        .single()

      if (error) {throw error}
      return data
    },
    enabled: !!id,
  })
}

// =============================================
// Pre-Qualified Vendors
// =============================================

/**
 * Get list of pre-qualified vendors
 */
export function usePreQualifiedVendors(filters: PreQualificationFilters = {}) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: preQualKeys.vendorsList(filters),
    queryFn: async () => {
      let query = db
        .from('prequalified_vendors')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, contact_name, email, phone)
        `)
        .eq('company_id', userProfile?.company_id)

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters.trades && filters.trades.length > 0) {
        query = query.overlaps('trades', filters.trades)
      }

      if (filters.search) {
        query = query.ilike('company_name', `%${filters.search}%`)
      }

      query = query.order('approved_date', { ascending: false })

      const { data, error } = await query

      if (error) {throw error}
      return data as PreQualifiedVendor[]
    },
    enabled: !!userProfile?.company_id,
  })
}

// =============================================
// Statistics
// =============================================

/**
 * Get pre-qualification statistics
 */
export function usePreQualStats() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: preQualKeys.stats(),
    queryFn: async () => {
      const { data, error } = await db.rpc('get_prequalification_stats', {
        p_company_id: userProfile?.company_id,
      })

      if (error) {
        // Fallback: calculate manually
        const { data: submissions } = await db
          .from('prequalification_submissions')
          .select('status')
          .eq('company_id', userProfile?.company_id)

        const stats = {
          total: submissions?.length || 0,
          pending: submissions?.filter((s: any) => s.status === 'pending_review').length || 0,
          approved: submissions?.filter((s: any) => s.status === 'approved').length || 0,
          conditional: submissions?.filter((s: any) => s.status === 'conditionally_approved').length || 0,
          rejected: submissions?.filter((s: any) => s.status === 'rejected').length || 0,
          expired: submissions?.filter((s: any) => s.status === 'expired').length || 0,
        }

        return stats
      }

      return data
    },
    enabled: !!userProfile?.company_id,
  })
}

// =============================================
// Mutations
// =============================================

/**
 * Create a new pre-qualification submission
 */
export function useCreatePreQualSubmission() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (dto: CreatePreQualificationDTO) => {
      // Create main submission
      const { data: submission, error: subError } = await db
        .from('prequalification_submissions')
        .insert({
          company_id: userProfile?.company_id,
          subcontractor_id: dto.subcontractorId,
          questionnaire_id: dto.questionnaireId,
          answers: dto.answers,
          status: 'pending_review',
        })
        .select()
        .single()

      if (subError) {throw subError}

      // Create safety record if provided
      if (dto.safetyRecord) {
        const { error: safetyError } = await db
          .from('prequalification_safety_records')
          .insert({
            submission_id: submission.id,
            ...dto.safetyRecord,
          })

        if (safetyError) {throw safetyError}
      }

      // Create financials if provided
      if (dto.financials) {
        const { error: finError } = await db
          .from('prequalification_financials')
          .insert({
            submission_id: submission.id,
            ...dto.financials,
          })

        if (finError) {throw finError}
      }

      // Create references if provided
      if (dto.references && dto.references.length > 0) {
        const { error: refError } = await db
          .from('prequalification_references')
          .insert(
            dto.references.map((ref) => ({
              submission_id: submission.id,
              ...ref,
            }))
          )

        if (refError) {throw refError}
      }

      return submission
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preQualKeys.submissions() })
      queryClient.invalidateQueries({ queryKey: preQualKeys.stats() })
      toast.success('Pre-qualification submitted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Submission failed: ${error.message}`)
    },
  })
}

/**
 * Review a pre-qualification submission
 */
export function useReviewPreQualSubmission() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      submissionId,
      review,
    }: {
      submissionId: string
      review: ReviewPreQualificationDTO
    }) => {
      const { data, error } = await db
        .from('prequalification_submissions')
        .update({
          status: review.status,
          review_notes: review.reviewNotes,
          conditions: review.conditions,
          expires_at: review.expiresAt,
          reviewed_by: userProfile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select()
        .single()

      if (error) {throw error}

      // If approved, create/update pre-qualified vendor record
      if (review.status === 'approved' || review.status === 'conditionally_approved') {
        const { data: submission } = await db
          .from('prequalification_submissions')
          .select('subcontractor_id, score, max_score')
          .eq('id', submissionId)
          .single()

        if (submission) {
          await db.from('prequalified_vendors').upsert({
            company_id: userProfile?.company_id,
            subcontractor_id: submission.subcontractor_id,
            status: review.status,
            approved_date: new Date().toISOString(),
            expires_at: review.expiresAt,
            score: submission.score,
            tier: review.status === 'approved' ? 'approved' : 'conditional',
            notes: review.conditions,
          }, {
            onConflict: 'company_id,subcontractor_id',
          })
        }
      }

      return data
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: preQualKeys.submission(submissionId) })
      queryClient.invalidateQueries({ queryKey: preQualKeys.submissions() })
      queryClient.invalidateQueries({ queryKey: preQualKeys.vendors() })
      queryClient.invalidateQueries({ queryKey: preQualKeys.stats() })
      toast.success('Pre-qualification reviewed')
    },
    onError: (error: Error) => {
      toast.error(`Review failed: ${error.message}`)
    },
  })
}

/**
 * Score a pre-qualification submission
 */
export function useScorePreQualSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      submissionId,
      scoring,
    }: {
      submissionId: string
      scoring: PreQualScoringResult
    }) => {
      const { data, error } = await db
        .from('prequalification_submissions')
        .update({
          score: scoring.totalScore,
          max_score: scoring.maxScore,
          scoring_details: scoring,
        })
        .eq('id', submissionId)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: preQualKeys.submission(submissionId) })
      toast.success('Scoring updated')
    },
    onError: (error: Error) => {
      toast.error(`Scoring failed: ${error.message}`)
    },
  })
}

/**
 * Request additional information
 */
export function useRequestPreQualInfo() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      submissionId,
      questions,
      message,
    }: {
      submissionId: string
      questions: string[]
      message?: string
    }) => {
      // Update submission status
      await db
        .from('prequalification_submissions')
        .update({
          status: 'pending_info',
          info_requested_at: new Date().toISOString(),
          info_requested_by: userProfile?.id,
          info_questions: questions,
        })
        .eq('id', submissionId)

      // Send notification (via edge function or directly)
      // This would typically trigger an email

      return { success: true }
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: preQualKeys.submission(submissionId) })
      toast.success('Information request sent')
    },
    onError: (error: Error) => {
      toast.error(`Request failed: ${error.message}`)
    },
  })
}

/**
 * Delete a submission (admin only)
 */
export function useDeletePreQualSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await db
        .from('prequalification_submissions')
        .delete()
        .eq('id', submissionId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preQualKeys.submissions() })
      queryClient.invalidateQueries({ queryKey: preQualKeys.stats() })
      toast.success('Submission deleted')
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`)
    },
  })
}

// =============================================
// Utility Functions
// =============================================

/**
 * Calculate pre-qualification score
 */
export function calculatePreQualScore(
  answers: Record<string, any>,
  questionnaire: PreQualificationQuestionnaire,
  safetyRecord?: any,
  financials?: any
): PreQualScoringResult {
  let totalScore = 0
  let maxScore = 0
  const sections: PreQualScoringResult['sections'] = []
  const flags: string[] = []

  // Score each section
  questionnaire.sections.forEach((section) => {
    let sectionScore = 0
    let sectionMax = 0

    section.questions.forEach((question) => {
      const answer = answers[question.id]
      const weight = question.weight || 1
      sectionMax += weight * 10 // Max 10 points per question * weight

      if (answer !== undefined && answer !== null && answer !== '') {
        // Score based on question type and passing criteria
        let questionScore = 0

        if (question.questionType === 'boolean') {
          const expected = question.passingCriteria === 'true'
          questionScore = answer === expected ? 10 : 0
        } else if (question.questionType === 'number') {
          // Score based on threshold if defined
          if (question.passingCriteria) {
            const [operator, threshold] = question.passingCriteria.split(':')
            const value = parseFloat(answer)
            const thresholdValue = parseFloat(threshold)

            if (operator === 'gte' && value >= thresholdValue) {questionScore = 10}
            else if (operator === 'lte' && value <= thresholdValue) {questionScore = 10}
            else if (operator === 'eq' && value === thresholdValue) {questionScore = 10}
            else {questionScore = 5} // Partial credit
          } else {
            questionScore = 10 // No criteria, full credit for answering
          }
        } else {
          // Text/select: full credit for answering
          questionScore = 10
        }

        sectionScore += questionScore * weight
      }
    })

    totalScore += sectionScore
    maxScore += sectionMax

    sections.push({
      name: section.name,
      score: sectionScore,
      maxScore: sectionMax,
      passed: sectionScore >= sectionMax * 0.6, // 60% passing threshold
    })
  })

  // Safety record scoring
  if (safetyRecord) {
    const safetyMax = 100
    let safetyScore = 100

    // EMR scoring (lower is better)
    if (safetyRecord.emr) {
      if (safetyRecord.emr > 1.5) {
        safetyScore -= 30
        flags.push('High EMR (>1.5)')
      } else if (safetyRecord.emr > 1.2) {
        safetyScore -= 15
        flags.push('Elevated EMR (>1.2)')
      } else if (safetyRecord.emr > 1.0) {
        safetyScore -= 5
      }
    }

    // Fatalities
    if (safetyRecord.fatalitiesLast5Years > 0) {
      safetyScore -= 40
      flags.push(`${safetyRecord.fatalitiesLast5Years} fatalities in last 5 years`)
    }

    // Violations
    if (safetyRecord.seriousViolationsLast3Years > 0) {
      safetyScore -= safetyRecord.seriousViolationsLast3Years * 10
      flags.push(`${safetyRecord.seriousViolationsLast3Years} serious OSHA violations`)
    }

    // Safety programs
    if (!safetyRecord.safetyProgramInPlace) {safetyScore -= 10}
    if (!safetyRecord.ppePolicy) {safetyScore -= 5}
    if (!safetyRecord.substanceAbusePolicy) {safetyScore -= 5}

    totalScore += Math.max(0, safetyScore)
    maxScore += safetyMax

    sections.push({
      name: 'Safety Record',
      score: Math.max(0, safetyScore),
      maxScore: safetyMax,
      passed: safetyScore >= 60,
    })
  }

  // Financial scoring
  if (financials) {
    const finMax = 100
    let finScore = 100

    // Years in business
    if (financials.yearsInBusiness < 2) {
      finScore -= 20
      flags.push('Less than 2 years in business')
    } else if (financials.yearsInBusiness < 5) {
      finScore -= 10
    }

    // Bonding capacity
    if (!financials.bondingCapacity || financials.bondingCapacity < 100000) {
      finScore -= 20
      flags.push('Limited bonding capacity')
    }

    // Financial statements
    if (!financials.financialStatementsProvided) {
      finScore -= 15
      flags.push('No financial statements provided')
    }

    totalScore += Math.max(0, finScore)
    maxScore += finMax

    sections.push({
      name: 'Financial',
      score: Math.max(0, finScore),
      maxScore: finMax,
      passed: finScore >= 60,
    })
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const passedMinimum = percentage >= 60 && !flags.some((f) => f.includes('fatal'))

  let recommendation: PreQualScoringResult['recommendation'] = 'review'
  if (percentage >= 80 && flags.length === 0) {
    recommendation = 'approve'
  } else if (percentage >= 60 && flags.length <= 2) {
    recommendation = 'conditional'
  } else if (percentage < 50 || flags.length > 3) {
    recommendation = 'reject'
  }

  return {
    totalScore,
    maxScore,
    percentage,
    passedMinimum,
    sections,
    recommendation,
    flags,
  }
}
