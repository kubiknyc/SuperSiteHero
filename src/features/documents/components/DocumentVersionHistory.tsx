import { useState } from 'react'
import {
  useDocumentVersionHistory,
  useCreateDocumentVersion,
  useRevertDocumentVersion,
} from '../hooks/useDocuments'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { History, RotateCcw, FileText, Clock, GitCompare, MessageSquare, Activity } from 'lucide-react'
import { VersionComparisonView, MarkupVersionComparison } from './comparison'
import { DocumentComments } from './DocumentComments'
import { DocumentAccessLog } from './DocumentAccessLog'
import { toast } from 'sonner'

interface DocumentVersionHistoryProps {
  documentId: string
  projectId?: string
}

export function DocumentVersionHistory({ documentId, projectId }: DocumentVersionHistoryProps) {
  const [open, setOpen] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showAccessLog, setShowAccessLog] = useState(false)
  const [comparisonMode, setComparisonMode] = useState<'basic' | 'markup'>('basic')

  const { data: versions, isLoading } = useDocumentVersionHistory(documentId)
  const _createVersion = useCreateDocumentVersion()
  const revertVersion = useRevertDocumentVersion()

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId)
      } else if (prev.length < 2) {
        return [...prev, versionId]
      } else {
        // Replace the first selected with the new one
        return [prev[1], versionId]
      }
    })
  }

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      setShowComparison(true)
    } else {
      toast.error('Please select exactly 2 versions to compare')
    }
  }

  const version1 = versions?.find((v) => v.id === selectedVersions[0])
  const version2 = versions?.find((v) => v.id === selectedVersions[1])

  const handleRevert = async (versionId: string) => {
    try {
      await revertVersion.mutateAsync(versionId)
      toast.success('Document reverted to selected version')
      setOpen(false)
    } catch (_error) {
      toast.error('Failed to revert document version')
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <History className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    )
  }

  const _latestVersion = versions?.find((v) => v.is_latest_version)
  const versionCount = versions?.length || 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          Version History ({versionCount})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Document Version History</DialogTitle>
            <div className="flex gap-2">
              {projectId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComments(true)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Comments
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAccessLog(true)}
              >
                <Activity className="mr-2 h-4 w-4" />
                Access Log
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {versions && versions.length > 0 ? (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 ${
                    version.is_latest_version ? 'bg-blue-50 border-blue-200' : 'bg-card'
                  } ${selectedVersions.includes(version.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {versions.length > 1 && (
                        <input
                          type="checkbox"
                          checked={selectedVersions.includes(version.id)}
                          onChange={() => handleVersionSelect(version.id)}
                          className="w-4 h-4 text-primary rounded focus:ring-blue-500"
                          aria-label={`Select version ${version.version}`}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted" />
                          <span className="font-medium">{version.name}</span>
                        {version.version && (
                          <Badge variant="outline">v{version.version}</Badge>
                        )}
                        {version.is_latest_version && (
                          <Badge variant="default">Latest</Badge>
                        )}
                        {version.status && (
                          <Badge variant="secondary">{version.status}</Badge>
                        )}
                      </div>

                      <div className="text-sm text-secondary space-y-1">
                        {version.description && (
                          <p className="text-sm">{version.description}</p>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {version.created_at
                                ? formatDistanceToNow(new Date(version.created_at), {
                                    addSuffix: true,
                                  })
                                : 'Unknown'}
                            </span>
                          </div>
                          {version.file_size && (
                            <span>
                              {(version.file_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          )}
                          {version.issue_date && (
                            <span>
                              Issued:{' '}
                              {new Date(version.issue_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-3 flex-shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(version.file_url, '_blank')}
                      >
                        View
                      </Button>
                      {!version.is_latest_version && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevert(version.id)}
                          disabled={revertVersion.isPending}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Revert
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No version history available</p>
            </div>
          )}

          {versions && versions.length > 1 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-medium heading-subsection">Compare Versions</h3>
                  <p className="text-xs text-secondary mt-1">
                    Select 2 versions using checkboxes to compare ({selectedVersions.length}/2 selected)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Select value={comparisonMode} onValueChange={(value: 'basic' | 'markup') => setComparisonMode(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Compare</SelectItem>
                      <SelectItem value="markup">Markup Compare</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleCompare}
                    disabled={selectedVersions.length !== 2}
                    size="sm"
                  >
                    <GitCompare className="mr-2 h-4 w-4" />
                    Compare Selected
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Version Comparison Modal */}
      {showComparison && version1 && version2 && (
        comparisonMode === 'basic' ? (
          <VersionComparisonView
            version1={version1}
            version2={version2}
            onClose={() => {
              setShowComparison(false)
              setSelectedVersions([])
            }}
          />
        ) : (
          <MarkupVersionComparison
            version1={version1}
            version2={version2}
            open={showComparison}
            onClose={() => {
              setShowComparison(false)
              setSelectedVersions([])
            }}
            onExportReport={() => toast.success('Markup comparison report export coming soon')}
          />
        )
      )}

      {/* Comments Modal */}
      {projectId && (
        <DocumentComments
          documentId={documentId}
          projectId={projectId}
          open={showComments}
          onOpenChange={setShowComments}
        />
      )}

      {/* Access Log Modal */}
      <DocumentAccessLog
        documentId={documentId}
        open={showAccessLog}
        onOpenChange={setShowAccessLog}
      />
    </Dialog>
  )
}

export default DocumentVersionHistory
