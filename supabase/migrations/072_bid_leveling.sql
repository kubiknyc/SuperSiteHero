-- Migration: 072_bid_leveling.sql
-- Description: Enhanced bid leveling matrix with line item comparison
-- Date: 2025-01-02

-- =============================================
-- TABLE: bid_leveling_analyses
-- Stores saved bid leveling/comparison analyses
-- =============================================

CREATE TABLE IF NOT EXISTS bid_leveling_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bid_package_id UUID NOT NULL REFERENCES bid_packages(id) ON DELETE CASCADE,

  -- Analysis info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Submissions included
  submission_ids UUID[] NOT NULL DEFAULT '{}',

  -- Summary statistics
  low_bid_amount DECIMAL(15, 2),
  high_bid_amount DECIMAL(15, 2),
  average_bid_amount DECIMAL(15, 2),
  bid_spread_percent DECIMAL(10, 4),

  -- Comparison to estimate
  estimated_value DECIMAL(15, 2),
  variance_from_estimate_percent DECIMAL(10, 4),

  -- Recommendation
  recommended_submission_id UUID REFERENCES bid_submissions(id) ON DELETE SET NULL,
  recommendation_reason TEXT,
  recommendation_notes TEXT,

  -- Export tracking
  last_exported_at TIMESTAMPTZ,
  export_format VARCHAR(20),

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bid_leveling_company ON bid_leveling_analyses(company_id);
CREATE INDEX idx_bid_leveling_package ON bid_leveling_analyses(bid_package_id);
CREATE INDEX idx_bid_leveling_date ON bid_leveling_analyses(analysis_date);

-- Trigger
CREATE TRIGGER update_bid_leveling_analyses_updated_at
  BEFORE UPDATE ON bid_leveling_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE bid_leveling_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view bid leveling from their company"
  ON bid_leveling_analyses FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create bid leveling for their company"
  ON bid_leveling_analyses FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update bid leveling from their company"
  ON bid_leveling_analyses FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete bid leveling from their company"
  ON bid_leveling_analyses FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- TABLE: bid_leveling_notes
-- Notes/comments on specific line items in leveling
-- =============================================

CREATE TABLE IF NOT EXISTS bid_leveling_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES bid_leveling_analyses(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES bid_submissions(id) ON DELETE CASCADE,
  package_item_id UUID REFERENCES bid_package_items(id) ON DELETE CASCADE,

  -- Note content
  note_type VARCHAR(50) DEFAULT 'general', -- general, clarification, concern, recommendation
  note TEXT NOT NULL,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bid_leveling_notes_analysis ON bid_leveling_notes(analysis_id);
CREATE INDEX idx_bid_leveling_notes_submission ON bid_leveling_notes(submission_id);
CREATE INDEX idx_bid_leveling_notes_item ON bid_leveling_notes(package_item_id);

-- Trigger
CREATE TRIGGER update_bid_leveling_notes_updated_at
  BEFORE UPDATE ON bid_leveling_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE bid_leveling_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage notes on their analyses"
  ON bid_leveling_notes FOR ALL
  USING (
    analysis_id IN (
      SELECT id FROM bid_leveling_analyses
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- FUNCTION: generate_bid_leveling_matrix
-- Generate comprehensive bid comparison data
-- =============================================

CREATE OR REPLACE FUNCTION generate_bid_leveling_matrix(p_package_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_line_items JSONB;
  v_submissions JSONB;
  v_alternates JSONB;
  v_summary JSONB;
  v_low_bid DECIMAL(15, 2);
  v_high_bid DECIMAL(15, 2);
  v_avg_bid DECIMAL(15, 2);
  v_estimated DECIMAL(15, 2);
  v_total_bids INTEGER;
  v_qualified_bids INTEGER;
BEGIN
  -- Get basic stats
  SELECT
    MIN(base_bid_amount),
    MAX(base_bid_amount),
    AVG(base_bid_amount),
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('received', 'under_review', 'qualified', 'shortlisted'))
  INTO v_low_bid, v_high_bid, v_avg_bid, v_total_bids, v_qualified_bids
  FROM bid_submissions
  WHERE bid_package_id = p_package_id
  AND status NOT IN ('withdrawn', 'disqualified');

  -- Get estimated value
  SELECT estimated_value INTO v_estimated
  FROM bid_packages WHERE id = p_package_id;

  -- Build line items comparison
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'itemId', pi.id,
      'itemNumber', pi.item_number,
      'description', pi.description,
      'unit', pi.unit,
      'quantity', pi.quantity,
      'estimatedUnitPrice', pi.estimated_unit_price,
      'estimatedTotal', pi.estimated_total,
      'isAlternate', pi.is_alternate,
      'submissions', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'submissionId', si.submission_id,
            'bidderName', bs.bidder_company_name,
            'unitPrice', si.unit_price,
            'totalPrice', si.total_price,
            'isIncluded', si.is_included,
            'notes', si.notes
          ) ORDER BY si.total_price NULLS LAST
        ), '[]'::jsonb)
        FROM bid_submission_items si
        JOIN bid_submissions bs ON si.submission_id = bs.id
        WHERE si.package_item_id = pi.id
        AND bs.status NOT IN ('withdrawn', 'disqualified')
      ),
      'lowestPrice', (
        SELECT MIN(si.total_price)
        FROM bid_submission_items si
        JOIN bid_submissions bs ON si.submission_id = bs.id
        WHERE si.package_item_id = pi.id
        AND si.is_included = true
        AND bs.status NOT IN ('withdrawn', 'disqualified')
      ),
      'highestPrice', (
        SELECT MAX(si.total_price)
        FROM bid_submission_items si
        JOIN bid_submissions bs ON si.submission_id = bs.id
        WHERE si.package_item_id = pi.id
        AND si.is_included = true
        AND bs.status NOT IN ('withdrawn', 'disqualified')
      ),
      'averagePrice', (
        SELECT AVG(si.total_price)
        FROM bid_submission_items si
        JOIN bid_submissions bs ON si.submission_id = bs.id
        WHERE si.package_item_id = pi.id
        AND si.is_included = true
        AND bs.status NOT IN ('withdrawn', 'disqualified')
      )
    ) ORDER BY pi.sort_order
  ), '[]'::jsonb)
  INTO v_line_items
  FROM bid_package_items pi
  WHERE pi.bid_package_id = p_package_id;

  -- Build submissions comparison
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', bs.id,
      'bidderName', bs.bidder_company_name,
      'bidderContact', bs.bidder_contact_name,
      'bidderEmail', bs.bidder_email,
      'baseBidAmount', bs.base_bid_amount,
      'alternatesTotal', bs.alternates_total,
      'totalBidAmount', COALESCE(bs.total_bid_amount, bs.base_bid_amount),
      'rank', ROW_NUMBER() OVER (ORDER BY bs.base_bid_amount),
      'varianceFromLow', CASE
        WHEN v_low_bid > 0 THEN ((bs.base_bid_amount - v_low_bid) / v_low_bid * 100)
        ELSE 0
      END,
      'varianceFromEstimate', CASE
        WHEN v_estimated > 0 THEN ((bs.base_bid_amount - v_estimated) / v_estimated * 100)
        ELSE NULL
      END,
      'status', bs.status,
      'isLate', bs.is_late,
      'submittedAt', bs.submitted_at,
      'exclusions', bs.exclusions,
      'clarifications', bs.clarifications,
      'assumptions', bs.assumptions,
      'proposedStartDate', bs.proposed_start_date,
      'proposedDuration', bs.proposed_duration_days,
      'bidBondIncluded', bs.bid_bond_included,
      'insuranceCertIncluded', bs.insurance_cert_included
    ) ORDER BY bs.base_bid_amount
  ), '[]'::jsonb)
  INTO v_submissions
  FROM bid_submissions bs
  WHERE bs.bid_package_id = p_package_id
  AND bs.status NOT IN ('withdrawn', 'disqualified');

  -- Build alternates comparison
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'alternateNumber', pi.alternate_number,
      'description', pi.alternate_description,
      'submissions', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'submissionId', si.submission_id,
            'bidderName', bs.bidder_company_name,
            'amount', si.total_price,
            'isIncluded', si.is_included,
            'notes', si.notes
          )
        ), '[]'::jsonb)
        FROM bid_submission_items si
        JOIN bid_submissions bs ON si.submission_id = bs.id
        WHERE si.package_item_id = pi.id
        AND bs.status NOT IN ('withdrawn', 'disqualified')
      )
    )
  ), '[]'::jsonb)
  INTO v_alternates
  FROM bid_package_items pi
  WHERE pi.bid_package_id = p_package_id
  AND pi.is_alternate = true;

  -- Build summary
  v_summary := jsonb_build_object(
    'totalBids', v_total_bids,
    'qualifiedBids', v_qualified_bids,
    'lowBid', v_low_bid,
    'highBid', v_high_bid,
    'averageBid', ROUND(v_avg_bid::numeric, 2),
    'spreadPercent', CASE
      WHEN v_low_bid > 0 THEN ROUND(((v_high_bid - v_low_bid) / v_low_bid * 100)::numeric, 2)
      ELSE 0
    END,
    'estimatedValue', v_estimated,
    'varianceFromEstimate', CASE
      WHEN v_estimated > 0 THEN ROUND(((v_low_bid - v_estimated) / v_estimated * 100)::numeric, 2)
      ELSE NULL
    END
  );

  -- Build final result
  v_result := jsonb_build_object(
    'packageId', p_package_id,
    'lineItems', v_line_items,
    'submissions', v_submissions,
    'alternates', v_alternates,
    'summary', v_summary
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION generate_bid_leveling_matrix(UUID) TO authenticated;

-- =============================================
-- FUNCTION: get_bid_exclusions_comparison
-- Compare exclusions across all submissions
-- =============================================

CREATE OR REPLACE FUNCTION get_bid_exclusions_comparison(p_package_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'submissionId', bs.id,
        'bidderName', bs.bidder_company_name,
        'exclusions', string_to_array(bs.exclusions, E'\n'),
        'clarifications', string_to_array(bs.clarifications, E'\n'),
        'assumptions', string_to_array(bs.assumptions, E'\n')
      )
    ), '[]'::jsonb)
    FROM bid_submissions bs
    WHERE bs.bid_package_id = p_package_id
    AND bs.status NOT IN ('withdrawn', 'disqualified')
    AND (bs.exclusions IS NOT NULL OR bs.clarifications IS NOT NULL OR bs.assumptions IS NOT NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_bid_exclusions_comparison(UUID) TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE bid_leveling_analyses IS 'Saved bid leveling/comparison analyses';
COMMENT ON TABLE bid_leveling_notes IS 'Notes on specific items in bid leveling';
COMMENT ON FUNCTION generate_bid_leveling_matrix IS 'Generate comprehensive bid comparison matrix';
COMMENT ON FUNCTION get_bid_exclusions_comparison IS 'Compare exclusions across bid submissions';
