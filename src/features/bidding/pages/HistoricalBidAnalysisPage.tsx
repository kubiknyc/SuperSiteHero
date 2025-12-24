/**
 * Historical Bid Analysis Page
 * Full page layout for bid analysis with navigation and help
 */

import React from 'react'
import { HistoricalBidAnalysis } from '../components/HistoricalBidAnalysis'
import { Button } from '@/components/ui/button'
import { HelpCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function HistoricalBidAnalysisPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="ghost" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Help
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <HistoricalBidAnalysis />
      </div>

      {/* Help Section */}
      <div className="border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <h3 className="text-lg font-semibold mb-4" className="heading-subsection">About Historical Bid Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2" className="heading-card">Vendor Performance</h4>
              <p>
                Track vendor bid history, win rates, and reliability scores. Compare
                vendors across projects to identify top performers and reliable partners.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2" className="heading-card">Bid Accuracy</h4>
              <p>
                Analyze estimated vs actual costs to improve future bidding accuracy.
                Identify trades with consistent over or under-runs for better budgeting.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2" className="heading-card">Market Trends</h4>
              <p>
                Monitor pricing trends, markup patterns, and market conditions over time.
                Use historical data to make informed decisions on future bids.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HistoricalBidAnalysisPage
