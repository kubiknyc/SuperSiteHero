-- Migration: 103_lien_waiver_all_states.sql
-- Description: Expand lien waiver templates to all 50 US states
-- Adds templates for all states with all 4 waiver types:
--   - conditional_progress
--   - unconditional_progress
--   - conditional_final
--   - unconditional_final
--
-- States with statutory form requirements:
--   AZ, CA, GA, MI, MS, MO, NV, TX, UT, WY
--
-- States requiring notarization: AZ, NV, UT, WY (varies by county/type)

-- =============================================
-- HELPER FUNCTION FOR BATCH INSERT
-- =============================================

-- Common placeholders for all templates
-- ["claimant_name", "claimant_title", "claimant_company", "customer_name", "owner_name", "job_location", "project_name", "through_date", "payment_amount", "check_maker", "payee", "exceptions", "signature_date", "legal_description"]

-- =============================================
-- ALABAMA (AL) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Alabama Conditional Progress Payment Waiver',
  'AL',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF ALABAMA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment in the sum of ${{payment_amount}}, the undersigned waives and releases any and all liens, lien rights, and claims against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver and release is conditioned upon receipt of actual payment. This document shall become effective only upon the claimant''s receipt of payment from the financial institution on which the check is drawn.</p>

<p>This waiver covers only the payment described and does not cover retention, extras, or work performed after {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Alabama Code Title 35, Chapter 11',
  'Ala. Code § 35-11-210 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Alabama Unconditional Progress Payment Waiver',
  'AL',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF ALABAMA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS.</p>

<p>The undersigned has received payment in the sum of ${{payment_amount}} and hereby waives and releases any and all liens, lien rights, and claims against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p>This waiver covers only the payment described and does not cover retention, extras, or work performed after {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Alabama Code Title 35, Chapter 11',
  'Ala. Code § 35-11-210 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Alabama Conditional Final Payment Waiver',
  'AL',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF ALABAMA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment in the sum of ${{payment_amount}}, the undersigned waives and releases any and all liens, lien rights, and claims against the above-described property for ALL labor, services, equipment, or materials furnished on this project.</p>

<p><strong>CONDITIONAL:</strong> This waiver and release is conditioned upon receipt of actual payment. This document shall become effective only upon the claimant''s receipt of payment from the financial institution on which the check is drawn.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Alabama Code Title 35, Chapter 11',
  'Ala. Code § 35-11-210 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Alabama Unconditional Final Payment Waiver',
  'AL',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF ALABAMA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID IN FULL.</p>

<p>The undersigned has received final payment and hereby waives and releases any and all liens, lien rights, and claims against the above-described property for ALL labor, services, equipment, or materials furnished on this project.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Alabama Code Title 35, Chapter 11',
  'Ala. Code § 35-11-210 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- ALASKA (AK) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Alaska Conditional Progress Payment Waiver',
  'AK',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF ALASKA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment in the sum of ${{payment_amount}}, the undersigned waives and releases any and all liens, lien rights, and claims against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p>This waiver covers only the payment described and does not cover retention, extras, or work performed after {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Alaska Statutes Title 34, Chapter 35',
  'AS § 34.35.050 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Alaska Unconditional Progress Payment Waiver',
  'AK',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF ALASKA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES RIGHTS UNCONDITIONALLY.</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby waives and releases any and all liens, lien rights, and claims for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Alaska Statutes Title 34, Chapter 35',
  'AS § 34.35.050 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Alaska Conditional Final Payment Waiver',
  'AK',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF ALASKA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL liens, lien rights, and claims against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Alaska Statutes Title 34, Chapter 35',
  'AS § 34.35.050 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Alaska Unconditional Final Payment Waiver',
  'AK',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF ALASKA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES ALL RIGHTS UNCONDITIONALLY.</p>

<p>The undersigned has received final payment and hereby waives and releases ALL liens, lien rights, and claims against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Alaska Statutes Title 34, Chapter 35',
  'AS § 34.35.050 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- ARKANSAS (AR) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Arkansas Conditional Progress Payment Waiver',
  'AR',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF ARKANSAS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any materialman''s or mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Arkansas Code Title 18, Chapter 44',
  'Ark. Code Ann. § 18-44-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Arkansas Unconditional Progress Payment Waiver',
  'AR',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF ARKANSAS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES RIGHTS UNCONDITIONALLY.</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby waives and releases any materialman''s or mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Arkansas Code Title 18, Chapter 44',
  'Ark. Code Ann. § 18-44-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Arkansas Conditional Final Payment Waiver',
  'AR',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF ARKANSAS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL materialman''s or mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Arkansas Code Title 18, Chapter 44',
  'Ark. Code Ann. § 18-44-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Arkansas Unconditional Final Payment Waiver',
  'AR',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF ARKANSAS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES ALL RIGHTS UNCONDITIONALLY.</p>

<p>The undersigned has received final payment and hereby waives and releases ALL materialman''s or mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Arkansas Code Title 18, Chapter 44',
  'Ark. Code Ann. § 18-44-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- CONNECTICUT (CT) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Connecticut Conditional Progress Payment Waiver',
  'CT',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF CONNECTICUT</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Connecticut General Statutes Chapter 847',
  'Conn. Gen. Stat. § 49-33 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Connecticut Unconditional Progress Payment Waiver',
  'CT',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF CONNECTICUT</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Connecticut General Statutes Chapter 847',
  'Conn. Gen. Stat. § 49-33 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Connecticut Conditional Final Payment Waiver',
  'CT',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF CONNECTICUT</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Connecticut General Statutes Chapter 847',
  'Conn. Gen. Stat. § 49-33 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Connecticut Unconditional Final Payment Waiver',
  'CT',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF CONNECTICUT</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Connecticut General Statutes Chapter 847',
  'Conn. Gen. Stat. § 49-33 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- DELAWARE (DE) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Delaware Conditional Progress Payment Waiver',
  'DE',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF DELAWARE</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Delaware Code Title 25, Chapter 27',
  '25 Del. C. § 2701 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Delaware Unconditional Progress Payment Waiver',
  'DE',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF DELAWARE</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Delaware Code Title 25, Chapter 27',
  '25 Del. C. § 2701 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Delaware Conditional Final Payment Waiver',
  'DE',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF DELAWARE</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Delaware Code Title 25, Chapter 27',
  '25 Del. C. § 2701 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Delaware Unconditional Final Payment Waiver',
  'DE',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF DELAWARE</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Delaware Code Title 25, Chapter 27',
  '25 Del. C. § 2701 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- HAWAII (HI) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Hawaii Conditional Progress Payment Waiver',
  'HI',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF HAWAII</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s and materialman''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Hawaii Revised Statutes Chapter 507',
  'HRS § 507-41 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Hawaii Unconditional Progress Payment Waiver',
  'HI',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF HAWAII</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s and materialman''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Hawaii Revised Statutes Chapter 507',
  'HRS § 507-41 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Hawaii Conditional Final Payment Waiver',
  'HI',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF HAWAII</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s and materialman''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Hawaii Revised Statutes Chapter 507',
  'HRS § 507-41 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Hawaii Unconditional Final Payment Waiver',
  'HI',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF HAWAII</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s and materialman''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Hawaii Revised Statutes Chapter 507',
  'HRS § 507-41 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- IDAHO (ID) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Idaho Conditional Progress Payment Waiver',
  'ID',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF IDAHO</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any construction lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Idaho Code Title 45, Chapter 5',
  'Idaho Code § 45-501 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Idaho Unconditional Progress Payment Waiver',
  'ID',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF IDAHO</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any construction lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Idaho Code Title 45, Chapter 5',
  'Idaho Code § 45-501 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Idaho Conditional Final Payment Waiver',
  'ID',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF IDAHO</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL construction lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Idaho Code Title 45, Chapter 5',
  'Idaho Code § 45-501 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Idaho Unconditional Final Payment Waiver',
  'ID',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF IDAHO</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL construction lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Idaho Code Title 45, Chapter 5',
  'Idaho Code § 45-501 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- INDIANA (IN) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Indiana Conditional Progress Payment Waiver',
  'IN',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF INDIANA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Indiana Code Title 32, Article 28',
  'Ind. Code § 32-28-3-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Indiana Unconditional Progress Payment Waiver',
  'IN',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF INDIANA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Indiana Code Title 32, Article 28',
  'Ind. Code § 32-28-3-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Indiana Conditional Final Payment Waiver',
  'IN',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF INDIANA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Indiana Code Title 32, Article 28',
  'Ind. Code § 32-28-3-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Indiana Unconditional Final Payment Waiver',
  'IN',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF INDIANA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Indiana Code Title 32, Article 28',
  'Ind. Code § 32-28-3-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- IOWA (IA) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Iowa Conditional Progress Payment Waiver',
  'IA',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF IOWA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Iowa Code Chapter 572',
  'Iowa Code § 572.1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Iowa Unconditional Progress Payment Waiver',
  'IA',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF IOWA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Iowa Code Chapter 572',
  'Iowa Code § 572.1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Iowa Conditional Final Payment Waiver',
  'IA',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF IOWA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Iowa Code Chapter 572',
  'Iowa Code § 572.1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Iowa Unconditional Final Payment Waiver',
  'IA',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF IOWA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Iowa Code Chapter 572',
  'Iowa Code § 572.1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- KANSAS (KS) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Kansas Conditional Progress Payment Waiver',
  'KS',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF KANSAS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Kansas Statutes Chapter 60, Article 11',
  'K.S.A. § 60-1101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Kansas Unconditional Progress Payment Waiver',
  'KS',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF KANSAS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Kansas Statutes Chapter 60, Article 11',
  'K.S.A. § 60-1101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Kansas Conditional Final Payment Waiver',
  'KS',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF KANSAS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Kansas Statutes Chapter 60, Article 11',
  'K.S.A. § 60-1101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Kansas Unconditional Final Payment Waiver',
  'KS',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF KANSAS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Kansas Statutes Chapter 60, Article 11',
  'K.S.A. § 60-1101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- KENTUCKY (KY) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Kentucky Conditional Progress Payment Waiver',
  'KY',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>COMMONWEALTH OF KENTUCKY</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Kentucky Revised Statutes Chapter 376',
  'KRS § 376.010 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Kentucky Unconditional Progress Payment Waiver',
  'KY',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>COMMONWEALTH OF KENTUCKY</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Kentucky Revised Statutes Chapter 376',
  'KRS § 376.010 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Kentucky Conditional Final Payment Waiver',
  'KY',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>COMMONWEALTH OF KENTUCKY</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Kentucky Revised Statutes Chapter 376',
  'KRS § 376.010 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Kentucky Unconditional Final Payment Waiver',
  'KY',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>COMMONWEALTH OF KENTUCKY</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Kentucky Revised Statutes Chapter 376',
  'KRS § 376.010 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- LOUISIANA (LA) - No statutory form (Civil Code)
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Louisiana Conditional Progress Payment Waiver',
  'LA',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF LOUISIANA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any privilege (lien) rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}} pursuant to the Louisiana Private Works Act.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Louisiana Private Works Act - RS 9:4801 et seq.',
  'La. R.S. 9:4801 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Louisiana Unconditional Progress Payment Waiver',
  'LA',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF LOUISIANA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any privilege (lien) rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Louisiana Private Works Act - RS 9:4801 et seq.',
  'La. R.S. 9:4801 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Louisiana Conditional Final Payment Waiver',
  'LA',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF LOUISIANA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL privilege (lien) rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Louisiana Private Works Act - RS 9:4801 et seq.',
  'La. R.S. 9:4801 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Louisiana Unconditional Final Payment Waiver',
  'LA',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF LOUISIANA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL privilege (lien) rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Louisiana Private Works Act - RS 9:4801 et seq.',
  'La. R.S. 9:4801 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- MAINE (ME) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Maine Conditional Progress Payment Waiver',
  'ME',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MAINE</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Maine Revised Statutes Title 10, Chapter 603',
  '10 M.R.S.A. § 3251 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Maine Unconditional Progress Payment Waiver',
  'ME',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MAINE</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Maine Revised Statutes Title 10, Chapter 603',
  '10 M.R.S.A. § 3251 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Maine Conditional Final Payment Waiver',
  'ME',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF MAINE</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Maine Revised Statutes Title 10, Chapter 603',
  '10 M.R.S.A. § 3251 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Maine Unconditional Final Payment Waiver',
  'ME',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF MAINE</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Maine Revised Statutes Title 10, Chapter 603',
  '10 M.R.S.A. § 3251 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- MARYLAND (MD) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Maryland Conditional Progress Payment Waiver',
  'MD',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MARYLAND</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Maryland Real Property Code Title 9',
  'Md. Code, Real Prop. § 9-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Maryland Unconditional Progress Payment Waiver',
  'MD',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MARYLAND</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Maryland Real Property Code Title 9',
  'Md. Code, Real Prop. § 9-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Maryland Conditional Final Payment Waiver',
  'MD',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF MARYLAND</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Maryland Real Property Code Title 9',
  'Md. Code, Real Prop. § 9-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Maryland Unconditional Final Payment Waiver',
  'MD',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF MARYLAND</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Maryland Real Property Code Title 9',
  'Md. Code, Real Prop. § 9-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- MASSACHUSETTS (MA) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Massachusetts Conditional Progress Payment Waiver',
  'MA',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>COMMONWEALTH OF MASSACHUSETTS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Massachusetts General Laws Chapter 254',
  'M.G.L. c. 254 § 1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Massachusetts Unconditional Progress Payment Waiver',
  'MA',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>COMMONWEALTH OF MASSACHUSETTS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Massachusetts General Laws Chapter 254',
  'M.G.L. c. 254 § 1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Massachusetts Conditional Final Payment Waiver',
  'MA',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>COMMONWEALTH OF MASSACHUSETTS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Massachusetts General Laws Chapter 254',
  'M.G.L. c. 254 § 1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Massachusetts Unconditional Final Payment Waiver',
  'MA',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>COMMONWEALTH OF MASSACHUSETTS</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Massachusetts General Laws Chapter 254',
  'M.G.L. c. 254 § 1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- MICHIGAN (MI) - Has statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Michigan Conditional Progress Payment Waiver',
  'MI',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MICHIGAN</strong></p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S CONSTRUCTION LIEN AND PAYMENT BOND RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT. A PERSON SHOULD NOT RELY ON THIS DOCUMENT UNLESS SATISFIED THAT THE CLAIMANT HAS RECEIVED PAYMENT.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release:</strong><br/>
This document waives and releases construction lien and payment bond rights the claimant has for labor or material or both labor and material furnished to the customer on this job through {{through_date}}. This document becomes effective only on the claimant''s receipt of payment from the financial institution on which the following check is drawn:</p>

<p>Maker of Check: {{check_maker}}<br/>
Amount of Check: ${{payment_amount}}<br/>
Check Payable to: {{payee}}</p>

<p><strong>Exceptions:</strong> This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p><strong>Signature:</strong><br/>
Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Michigan Construction Lien Act - MCL 570.1101 et seq.',
  'MCL § 570.1115',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "check_maker", "payment_amount", "payee", "exceptions", "claimant_title", "signature_date"]'
),
(
  'Michigan Unconditional Progress Payment Waiver',
  'MI',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MICHIGAN</strong></p>

<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES AND RELEASES CONSTRUCTION LIEN AND PAYMENT BOND RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS. THIS DOCUMENT IS ENFORCEABLE AGAINST YOU IF YOU SIGN IT, EVEN IF YOU HAVE NOT BEEN PAID. IF YOU HAVE NOT BEEN PAID, USE A CONDITIONAL WAIVER AND RELEASE FORM.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release:</strong><br/>
This document waives and releases construction lien and payment bond rights the claimant has for labor or material or both labor and material furnished to the customer on this job through {{through_date}}. The claimant has received the following progress payment: ${{payment_amount}}</p>

<p><strong>Exceptions:</strong> This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p><strong>Signature:</strong><br/>
Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Michigan Construction Lien Act - MCL 570.1101 et seq.',
  'MCL § 570.1115',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "payment_amount", "exceptions", "claimant_title", "signature_date"]'
),
(
  'Michigan Conditional Final Payment Waiver',
  'MI',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>
<p><strong>STATE OF MICHIGAN</strong></p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S CONSTRUCTION LIEN AND PAYMENT BOND RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT. A PERSON SHOULD NOT RELY ON THIS DOCUMENT UNLESS SATISFIED THAT THE CLAIMANT HAS RECEIVED PAYMENT.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release:</strong><br/>
This document waives and releases construction lien and payment bond rights the claimant has for ALL labor or material or both labor and material furnished to the customer on this job. This document becomes effective only on the claimant''s receipt of payment from the financial institution on which the following check is drawn:</p>

<p>Maker of Check: {{check_maker}}<br/>
Amount of Check: ${{payment_amount}}<br/>
Check Payable to: {{payee}}</p>

<p><strong>Exceptions:</strong> This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p><strong>Signature:</strong><br/>
Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Michigan Construction Lien Act - MCL 570.1101 et seq.',
  'MCL § 570.1115',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "check_maker", "payment_amount", "payee", "exceptions", "claimant_title", "signature_date"]'
),
(
  'Michigan Unconditional Final Payment Waiver',
  'MI',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>
<p><strong>STATE OF MICHIGAN</strong></p>

<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES AND RELEASES CONSTRUCTION LIEN AND PAYMENT BOND RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS. THIS DOCUMENT IS ENFORCEABLE AGAINST YOU IF YOU SIGN IT, EVEN IF YOU HAVE NOT BEEN PAID. IF YOU HAVE NOT BEEN PAID, USE A CONDITIONAL WAIVER AND RELEASE FORM.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release:</strong><br/>
This document waives and releases construction lien and payment bond rights the claimant has for ALL labor or material or both labor and material furnished to the customer on this job. The claimant has been paid in full.</p>

<p><strong>Exceptions:</strong> This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p><strong>Signature:</strong><br/>
Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Michigan Construction Lien Act - MCL 570.1101 et seq.',
  'MCL § 570.1115',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "exceptions", "claimant_title", "signature_date"]'
);

-- =============================================
-- MINNESOTA (MN) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Minnesota Conditional Progress Payment Waiver',
  'MN',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MINNESOTA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Minnesota Statutes Chapter 514',
  'Minn. Stat. § 514.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Minnesota Unconditional Progress Payment Waiver',
  'MN',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MINNESOTA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Minnesota Statutes Chapter 514',
  'Minn. Stat. § 514.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Minnesota Conditional Final Payment Waiver',
  'MN',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF MINNESOTA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Minnesota Statutes Chapter 514',
  'Minn. Stat. § 514.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Minnesota Unconditional Final Payment Waiver',
  'MN',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF MINNESOTA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Minnesota Statutes Chapter 514',
  'Minn. Stat. § 514.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- MISSISSIPPI (MS) - Has statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Mississippi Conditional Progress Payment Waiver',
  'MS',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MISSISSIPPI</strong></p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S LIEN RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release:</strong><br/>
This document waives and releases mechanic''s lien rights the claimant has on the real property described above for labor, services, equipment, or materials furnished through {{through_date}}. This document is effective only on the claimant''s receipt of payment:</p>

<p>Amount: ${{payment_amount}}</p>

<p><strong>Exceptions:</strong> This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p>{{claimant_company}}<br/>
Signature: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Mississippi Code Title 85, Chapter 7',
  'Miss. Code Ann. § 85-7-131 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "payment_amount", "exceptions", "claimant_company", "claimant_title", "signature_date"]'
),
(
  'Mississippi Unconditional Progress Payment Waiver',
  'MS',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MISSISSIPPI</strong></p>

<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES LIEN RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release:</strong><br/>
This document waives and releases mechanic''s lien rights the claimant has for labor, services, equipment, or materials furnished through {{through_date}}. The claimant has received progress payment of: ${{payment_amount}}</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Signature: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Mississippi Code Title 85, Chapter 7',
  'Miss. Code Ann. § 85-7-131 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "payment_amount", "exceptions", "claimant_company", "claimant_title", "signature_date"]'
),
(
  'Mississippi Conditional Final Payment Waiver',
  'MS',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF MISSISSIPPI</strong></p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S LIEN RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release:</strong><br/>
This document waives and releases ALL mechanic''s lien rights the claimant has on the real property described above. This document is effective only on the claimant''s receipt of final payment:</p>

<p>Amount: ${{payment_amount}}</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Signature: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Mississippi Code Title 85, Chapter 7',
  'Miss. Code Ann. § 85-7-131 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_title", "signature_date"]'
),
(
  'Mississippi Unconditional Final Payment Waiver',
  'MS',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF MISSISSIPPI</strong></p>

<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES ALL LIEN RIGHTS UNCONDITIONALLY.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release:</strong><br/>
This document waives and releases ALL mechanic''s lien rights the claimant has on the real property described above. The claimant has been paid in full.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Signature: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Mississippi Code Title 85, Chapter 7',
  'Miss. Code Ann. § 85-7-131 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_title", "signature_date"]'
);

-- =============================================
-- MISSOURI (MO) - Has statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Missouri Conditional Progress Payment Waiver',
  'MO',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MISSOURI</strong></p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S MECHANIC''S LIEN RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release:</strong><br/>
This document waives and releases mechanic''s lien rights the claimant has for labor and service provided, and equipment and material delivered, to the customer on this job through {{through_date}}. This document is effective only on the claimant''s receipt of payment from the financial institution on which the following check is drawn:</p>

<p>Maker of Check: {{check_maker}}<br/>
Amount of Check: ${{payment_amount}}<br/>
Check Payable to: {{payee}}</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Signature: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Missouri Revised Statutes Chapter 429',
  'Mo. Rev. Stat. § 429.005 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "check_maker", "payment_amount", "payee", "exceptions", "claimant_company", "claimant_title", "signature_date"]'
),
(
  'Missouri Unconditional Progress Payment Waiver',
  'MO',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MISSOURI</strong></p>

<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES AND RELEASES MECHANIC''S LIEN RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release:</strong><br/>
This document waives and releases mechanic''s lien rights the claimant has for labor and service provided, and equipment and material delivered, to the customer on this job through {{through_date}}. The claimant has received the following progress payment: ${{payment_amount}}</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Signature: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Missouri Revised Statutes Chapter 429',
  'Mo. Rev. Stat. § 429.005 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "payment_amount", "exceptions", "claimant_company", "claimant_title", "signature_date"]'
),
(
  'Missouri Conditional Final Payment Waiver',
  'MO',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>
<p><strong>STATE OF MISSOURI</strong></p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S MECHANIC''S LIEN RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release:</strong><br/>
This document waives and releases ALL mechanic''s lien rights the claimant has for ALL labor and service provided, and equipment and material delivered, to the customer on this job. This document is effective only on the claimant''s receipt of payment:</p>

<p>Maker of Check: {{check_maker}}<br/>
Amount of Check: ${{payment_amount}}<br/>
Check Payable to: {{payee}}</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Signature: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Missouri Revised Statutes Chapter 429',
  'Mo. Rev. Stat. § 429.005 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "check_maker", "payment_amount", "payee", "exceptions", "claimant_company", "claimant_title", "signature_date"]'
),
(
  'Missouri Unconditional Final Payment Waiver',
  'MO',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>
<p><strong>STATE OF MISSOURI</strong></p>

<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES AND RELEASES ALL MECHANIC''S LIEN RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID IN FULL.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release:</strong><br/>
This document waives and releases ALL mechanic''s lien rights the claimant has for ALL labor and service provided, and equipment and material delivered, to the customer on this job. The claimant has been paid in full.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Signature: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Missouri Revised Statutes Chapter 429',
  'Mo. Rev. Stat. § 429.005 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_title", "signature_date"]'
);

-- Continue with remaining states in Part 2...
-- (Due to size, this migration continues in migration 104)

COMMENT ON TABLE lien_waiver_templates IS 'State-specific lien waiver templates - expanded to support all 50 US states';
