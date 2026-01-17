/**
 * Subcontractor Compliance Page
 * Manages compliance documents with expiration tracking and upload functionality
 * Enhanced with P0-3: Insurance Endorsement Verification
 */

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useComplianceDocuments,
  useExpiringDocuments,
  useSubcontractorInsuranceCertificates,
  getDocumentTypeLabel,
  isExpired,
  isExpiringSoon,
} from '@/features/subcontractor-portal/hooks'
import {
  ComplianceDocumentCard,
  ComplianceUploadDialog,
  InsuranceUploadWidget,
  InsuranceEndorsementCard,
  EndorsementComplianceSummary,
} from '@/features/subcontractor-portal/components'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertTriangle,
  Shield,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react'

function ComplianceSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-48" />
      ))}
    </div>
  )
}

type TabValue = 'all' | 'endorsements' | 'expiring' | 'pending' | 'approved' | 'rejected'

export function SubcontractorCompliancePage() {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  const { data: allDocuments, isLoading, isError } = useComplianceDocuments()
  const { data: expiringDocuments } = useExpiringDocuments()
  const { data: insuranceCertificates } = useSubcontractorInsuranceCertificates()

  // Calculate counts
  const counts = useMemo(() => {
    if (!allDocuments) { return { all: 0, expiring: 0, pending: 0, approved: 0, rejected: 0 } }

    return {
      all: allDocuments.length,
      expiring: allDocuments.filter((d) =>
        isExpiringSoon(d.expiration_date) || isExpired(d.expiration_date)
      ).length,
      pending: allDocuments.filter((d) => d.status === 'pending').length,
      approved: allDocuments.filter((d) => d.status === 'approved').length,
      rejected: allDocuments.filter((d) => d.status === 'rejected').length,
    }
  }, [allDocuments])

  // Filter documents based on active tab
  const filteredDocuments = useMemo(() => {
    if (!allDocuments) { return [] }

    switch (activeTab) {
      case 'expiring':
        return allDocuments.filter(
          (d) => isExpiringSoon(d.expiration_date) || isExpired(d.expiration_date)
        )
      case 'pending':
        return allDocuments.filter((d) => d.status === 'pending')
      case 'approved':
        return allDocuments.filter((d) => d.status === 'approved')
      case 'rejected':
        return allDocuments.filter((d) => d.status === 'rejected')
      default:
        return allDocuments
    }
  }, [allDocuments, activeTab])

  // Group documents by type
  const documentsByType = useMemo(() => {
    const grouped: Record<string, typeof filteredDocuments> = {}
    filteredDocuments.forEach((doc) => {
      if (!grouped[doc.document_type]) {
        grouped[doc.document_type] = []
      }
      grouped[doc.document_type].push(doc)
    })
    return grouped
  }, [filteredDocuments])

  // Get subcontractor ID from user profile
  // Note: For subcontractor users, we use their user ID as the subcontractor reference
  const subcontractorId = userProfile?.id || ''

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 heading-page">
            <Shield className="h-6 w-6" />
            Compliance Documents
          </h1>
          <p className="text-muted-foreground">
            Manage your compliance documents, certificates, and licenses.
          </p>
        </div>
        <ComplianceUploadDialog subcontractorId={subcontractorId} />
      </div>

      {/* Expiring Documents Alert */}
      {expiringDocuments && expiringDocuments.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Documents Requiring Attention</AlertTitle>
          <AlertDescription>
            You have {expiringDocuments.length} document(s) that are expired or expiring soon.
            Please update them to maintain compliance.
          </AlertDescription>
        </Alert>
      )}

      {/* Insurance Certificate Upload Widget */}
      {userProfile?.company_id && (
        <InsuranceUploadWidget
          subcontractorId={subcontractorId}
          companyId={userProfile.company_id}
          onUploadComplete={() => {
            // Documents will be refetched automatically via React Query
          }}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('all')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="heading-section">{counts.all}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => setActiveTab('expiring')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-warning heading-section">{counts.expiring}</p>
                <p className="text-xs text-muted-foreground">Expiring</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="heading-section">{counts.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('approved')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-success heading-section">{counts.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('rejected')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-destructive heading-section">{counts.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Endorsement Compliance Summary */}
      <EndorsementComplianceSummary />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="endorsements" className="gap-1">
            <ShieldCheck className="h-4 w-4" />
            Endorsements
            {insuranceCertificates && insuranceCertificates.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {insuranceCertificates.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expiring" className="text-warning">
            Expiring ({counts.expiring})
          </TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
        </TabsList>

        {/* Endorsements Tab Content */}
        <TabsContent value="endorsements" className="mt-6">
          {!insuranceCertificates || insuranceCertificates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="mb-2 heading-subsection">
                  No Insurance Certificates
                </h3>
                <p className="text-muted-foreground mb-4">
                  Upload your insurance certificates to track endorsement verification status.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="heading-section">
                  Insurance Certificates & Endorsements
                </h2>
                <p className="text-sm text-muted-foreground">
                  {insuranceCertificates.filter((c) => c.has_all_required_endorsements).length} of{' '}
                  {insuranceCertificates.length} fully compliant
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {insuranceCertificates.map((cert) => (
                  <InsuranceEndorsementCard key={cert.id} certificate={cert} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* All Tab Content */}
        <TabsContent value="all" className="mt-6">
          <DocumentsTabContent
            isLoading={isLoading}
            isError={isError}
            filteredDocuments={filteredDocuments}
            documentsByType={documentsByType}
            activeTab="all"
            subcontractorId={subcontractorId}
          />
        </TabsContent>

        {/* Expiring Tab Content */}
        <TabsContent value="expiring" className="mt-6">
          <DocumentsTabContent
            isLoading={isLoading}
            isError={isError}
            filteredDocuments={filteredDocuments}
            documentsByType={documentsByType}
            activeTab="expiring"
            subcontractorId={subcontractorId}
          />
        </TabsContent>

        {/* Pending Tab Content */}
        <TabsContent value="pending" className="mt-6">
          <DocumentsTabContent
            isLoading={isLoading}
            isError={isError}
            filteredDocuments={filteredDocuments}
            documentsByType={documentsByType}
            activeTab="pending"
            subcontractorId={subcontractorId}
          />
        </TabsContent>

        {/* Approved Tab Content */}
        <TabsContent value="approved" className="mt-6">
          <DocumentsTabContent
            isLoading={isLoading}
            isError={isError}
            filteredDocuments={filteredDocuments}
            documentsByType={documentsByType}
            activeTab="approved"
            subcontractorId={subcontractorId}
          />
        </TabsContent>

        {/* Rejected Tab Content */}
        <TabsContent value="rejected" className="mt-6">
          <DocumentsTabContent
            isLoading={isLoading}
            isError={isError}
            filteredDocuments={filteredDocuments}
            documentsByType={documentsByType}
            activeTab="rejected"
            subcontractorId={subcontractorId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper component for document tab content
interface DocumentsTabContentProps {
  isLoading: boolean
  isError: boolean
  filteredDocuments: any[]
  documentsByType: Record<string, any[]>
  activeTab: TabValue
  subcontractorId: string
}

function DocumentsTabContent({
  isLoading,
  isError,
  filteredDocuments,
  documentsByType,
  activeTab,
  subcontractorId,
}: DocumentsTabContentProps) {
  if (isLoading) {
    return <ComplianceSkeleton />
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Failed to load compliance documents
        </CardContent>
      </Card>
    )
  }

  if (filteredDocuments.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="mb-2 heading-subsection">
            {activeTab === 'all'
              ? 'No Documents Yet'
              : activeTab === 'expiring'
                ? 'No Expiring Documents'
                : activeTab === 'pending'
                  ? 'No Pending Documents'
                  : activeTab === 'approved'
                    ? 'No Approved Documents'
                    : 'No Rejected Documents'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {activeTab === 'all'
              ? "Upload your compliance documents to get started. You'll need insurance certificates, licenses, and other required documentation."
              : 'No documents match this filter.'}
          </p>
          {activeTab === 'all' && (
            <ComplianceUploadDialog subcontractorId={subcontractorId} />
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {Object.entries(documentsByType).map(([type, docs]) => (
        <section key={type}>
          <h2 className="mb-4 flex items-center gap-2 heading-section">
            {getDocumentTypeLabel(type)}
            <Badge variant="secondary">{docs.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {docs.map((doc) => (
              <ComplianceDocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default SubcontractorCompliancePage
