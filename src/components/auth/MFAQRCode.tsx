// File: /src/components/auth/MFAQRCode.tsx
// MFA QR Code display component

import React from 'react'
import DOMPurify from 'dompurify'
import { Card } from '@/components/ui'
import { Shield, Smartphone, Copy, Check } from 'lucide-react'

interface MFAQRCodeProps {
  qrSvg: string
  secret: string
  issuer?: string
  accountName?: string
  onCopySecret?: () => void
  secretCopied?: boolean
}

export function MFAQRCode({
  qrSvg,
  secret,
  issuer = 'JobSight',
  accountName = '',
  onCopySecret,
  secretCopied = false
}: MFAQRCodeProps) {
  // Format secret for display (groups of 4 characters)
  const formattedSecret = secret.match(/.{1,4}/g)?.join(' ') || secret

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-blue-100 rounded-full p-3">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-center mb-4">
          Scan with Authenticator App
        </h3>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200 flex justify-center">
          <div
            className="qr-code-container"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(qrSvg, { USE_PROFILES: { svg: true } }) }}
            style={{
              filter: 'contrast(1.1)',
              maxWidth: '280px',
              width: '100%'
            }}
          />
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          <Smartphone className="h-4 w-4 inline mr-1" />
          Use Google Authenticator, Microsoft Authenticator, or Authy
        </div>
      </Card>

      {/* Manual Entry Option */}
      <Card className="p-4 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Can't scan? Enter code manually:
        </h4>

        <div className="space-y-2">
          {accountName && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Account:</span> {accountName}
            </div>
          )}

          <div className="text-xs text-gray-600">
            <span className="font-medium">Issuer:</span> {issuer}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between bg-white rounded border px-3 py-2">
              <code className="text-sm font-mono tracking-wider select-all">
                {formattedSecret}
              </code>

              {onCopySecret && (
                <button
                  onClick={onCopySecret}
                  className="ml-2 p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Copy secret key"
                >
                  {secretCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            <strong>Type:</strong> Time-based (TOTP) - 6 digits, 30 second interval
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm">
        <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
        <ol className="list-decimal list-inside space-y-1 text-blue-800">
          <li>Open your authenticator app</li>
          <li>Tap the + or Add Account button</li>
          <li>Choose "Scan QR Code" or "Enter manually"</li>
          <li>Scan the code above or enter the secret key</li>
          <li>Verify the 6-digit code on the next screen</li>
        </ol>
      </div>
    </div>
  )
}