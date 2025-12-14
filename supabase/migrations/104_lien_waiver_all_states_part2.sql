-- Migration: 104_lien_waiver_all_states_part2.sql
-- Description: Expand lien waiver templates to all 50 US states (Part 2)
-- Continues from migration 103 with states Montana through Wyoming

-- =============================================
-- MONTANA (MT) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Montana Conditional Progress Payment Waiver',
  'MT',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MONTANA</strong></p>
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
  'Montana Code Title 71, Chapter 3',
  'Mont. Code Ann. § 71-3-521 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Montana Unconditional Progress Payment Waiver',
  'MT',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF MONTANA</strong></p>
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
  'Montana Code Title 71, Chapter 3',
  'Mont. Code Ann. § 71-3-521 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Montana Conditional Final Payment Waiver',
  'MT',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF MONTANA</strong></p>
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
  'Montana Code Title 71, Chapter 3',
  'Mont. Code Ann. § 71-3-521 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Montana Unconditional Final Payment Waiver',
  'MT',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF MONTANA</strong></p>
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
  'Montana Code Title 71, Chapter 3',
  'Mont. Code Ann. § 71-3-521 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- NEBRASKA (NE) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Nebraska Conditional Progress Payment Waiver',
  'NE',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NEBRASKA</strong></p>
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
  'Nebraska Revised Statutes Chapter 52',
  'Neb. Rev. Stat. § 52-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Nebraska Unconditional Progress Payment Waiver',
  'NE',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NEBRASKA</strong></p>
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
  'Nebraska Revised Statutes Chapter 52',
  'Neb. Rev. Stat. § 52-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Nebraska Conditional Final Payment Waiver',
  'NE',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NEBRASKA</strong></p>
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
  'Nebraska Revised Statutes Chapter 52',
  'Neb. Rev. Stat. § 52-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Nebraska Unconditional Final Payment Waiver',
  'NE',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NEBRASKA</strong></p>
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
  'Nebraska Revised Statutes Chapter 52',
  'Neb. Rev. Stat. § 52-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- NEW HAMPSHIRE (NH) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'New Hampshire Conditional Progress Payment Waiver',
  'NH',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NEW HAMPSHIRE</strong></p>
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
  'New Hampshire RSA Chapter 447',
  'N.H. Rev. Stat. Ann. § 447:1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New Hampshire Unconditional Progress Payment Waiver',
  'NH',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NEW HAMPSHIRE</strong></p>
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
  'New Hampshire RSA Chapter 447',
  'N.H. Rev. Stat. Ann. § 447:1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New Hampshire Conditional Final Payment Waiver',
  'NH',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NEW HAMPSHIRE</strong></p>
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
  'New Hampshire RSA Chapter 447',
  'N.H. Rev. Stat. Ann. § 447:1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New Hampshire Unconditional Final Payment Waiver',
  'NH',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NEW HAMPSHIRE</strong></p>
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
  'New Hampshire RSA Chapter 447',
  'N.H. Rev. Stat. Ann. § 447:1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- NEW JERSEY (NJ) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'New Jersey Conditional Progress Payment Waiver',
  'NJ',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NEW JERSEY</strong></p>
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
  'New Jersey Construction Lien Law',
  'N.J.S.A. 2A:44A-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New Jersey Unconditional Progress Payment Waiver',
  'NJ',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NEW JERSEY</strong></p>
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
  'New Jersey Construction Lien Law',
  'N.J.S.A. 2A:44A-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New Jersey Conditional Final Payment Waiver',
  'NJ',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NEW JERSEY</strong></p>
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
  'New Jersey Construction Lien Law',
  'N.J.S.A. 2A:44A-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New Jersey Unconditional Final Payment Waiver',
  'NJ',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NEW JERSEY</strong></p>
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
  'New Jersey Construction Lien Law',
  'N.J.S.A. 2A:44A-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- NEW MEXICO (NM) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'New Mexico Conditional Progress Payment Waiver',
  'NM',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NEW MEXICO</strong></p>
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
  'New Mexico Statutes Chapter 48, Article 2',
  'N.M. Stat. Ann. § 48-2-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New Mexico Unconditional Progress Payment Waiver',
  'NM',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NEW MEXICO</strong></p>
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
  'New Mexico Statutes Chapter 48, Article 2',
  'N.M. Stat. Ann. § 48-2-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New Mexico Conditional Final Payment Waiver',
  'NM',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NEW MEXICO</strong></p>
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
  'New Mexico Statutes Chapter 48, Article 2',
  'N.M. Stat. Ann. § 48-2-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New Mexico Unconditional Final Payment Waiver',
  'NM',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NEW MEXICO</strong></p>
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
  'New Mexico Statutes Chapter 48, Article 2',
  'N.M. Stat. Ann. § 48-2-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- NORTH CAROLINA (NC) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'North Carolina Conditional Progress Payment Waiver',
  'NC',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NORTH CAROLINA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any lien or claim of lien against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'North Carolina General Statutes Chapter 44A',
  'N.C. Gen. Stat. § 44A-7 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'North Carolina Unconditional Progress Payment Waiver',
  'NC',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NORTH CAROLINA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any lien or claim of lien for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'North Carolina General Statutes Chapter 44A',
  'N.C. Gen. Stat. § 44A-7 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'North Carolina Conditional Final Payment Waiver',
  'NC',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NORTH CAROLINA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL lien or claim of lien against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'North Carolina General Statutes Chapter 44A',
  'N.C. Gen. Stat. § 44A-7 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'North Carolina Unconditional Final Payment Waiver',
  'NC',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NORTH CAROLINA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL lien or claim of lien against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'North Carolina General Statutes Chapter 44A',
  'N.C. Gen. Stat. § 44A-7 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- NORTH DAKOTA (ND) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'North Dakota Conditional Progress Payment Waiver',
  'ND',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NORTH DAKOTA</strong></p>
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
  'North Dakota Century Code Chapter 35-27',
  'N.D.C.C. § 35-27-01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'North Dakota Unconditional Progress Payment Waiver',
  'ND',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF NORTH DAKOTA</strong></p>
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
  'North Dakota Century Code Chapter 35-27',
  'N.D.C.C. § 35-27-01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'North Dakota Conditional Final Payment Waiver',
  'ND',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NORTH DAKOTA</strong></p>
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
  'North Dakota Century Code Chapter 35-27',
  'N.D.C.C. § 35-27-01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'North Dakota Unconditional Final Payment Waiver',
  'ND',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF NORTH DAKOTA</strong></p>
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
  'North Dakota Century Code Chapter 35-27',
  'N.D.C.C. § 35-27-01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- OHIO (OH) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Ohio Conditional Progress Payment Waiver',
  'OH',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF OHIO</strong></p>
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
  'Ohio Revised Code Chapter 1311',
  'O.R.C. § 1311.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Ohio Unconditional Progress Payment Waiver',
  'OH',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF OHIO</strong></p>
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
  'Ohio Revised Code Chapter 1311',
  'O.R.C. § 1311.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Ohio Conditional Final Payment Waiver',
  'OH',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF OHIO</strong></p>
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
  'Ohio Revised Code Chapter 1311',
  'O.R.C. § 1311.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Ohio Unconditional Final Payment Waiver',
  'OH',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF OHIO</strong></p>
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
  'Ohio Revised Code Chapter 1311',
  'O.R.C. § 1311.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- OKLAHOMA (OK) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Oklahoma Conditional Progress Payment Waiver',
  'OK',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF OKLAHOMA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of payment of ${{payment_amount}}, the undersigned waives and releases any mechanic''s or materialman''s lien rights against the above-described property for labor, services, equipment, or materials furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Oklahoma Statutes Title 42',
  '42 Okl. St. § 141 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Oklahoma Unconditional Progress Payment Waiver',
  'OK',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF OKLAHOMA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s or materialman''s lien rights for work through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Oklahoma Statutes Title 42',
  '42 Okl. St. § 141 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Oklahoma Conditional Final Payment Waiver',
  'OK',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF OKLAHOMA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases ALL mechanic''s or materialman''s lien rights against the above-described property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Oklahoma Statutes Title 42',
  '42 Okl. St. § 141 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Oklahoma Unconditional Final Payment Waiver',
  'OK',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF OKLAHOMA</strong></p>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Property Address:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases ALL mechanic''s or materialman''s lien rights against the above-described property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Oklahoma Statutes Title 42',
  '42 Okl. St. § 141 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- OREGON (OR) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Oregon Conditional Progress Payment Waiver',
  'OR',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF OREGON</strong></p>
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
  'Oregon Revised Statutes Chapter 87',
  'ORS § 87.001 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Oregon Unconditional Progress Payment Waiver',
  'OR',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF OREGON</strong></p>
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
  'Oregon Revised Statutes Chapter 87',
  'ORS § 87.001 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Oregon Conditional Final Payment Waiver',
  'OR',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF OREGON</strong></p>
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
  'Oregon Revised Statutes Chapter 87',
  'ORS § 87.001 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Oregon Unconditional Final Payment Waiver',
  'OR',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF OREGON</strong></p>
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
  'Oregon Revised Statutes Chapter 87',
  'ORS § 87.001 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- PENNSYLVANIA (PA) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Pennsylvania Conditional Progress Payment Waiver',
  'PA',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>COMMONWEALTH OF PENNSYLVANIA</strong></p>
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
  'Pennsylvania Mechanics'' Lien Law',
  '49 P.S. § 1101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Pennsylvania Unconditional Progress Payment Waiver',
  'PA',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>COMMONWEALTH OF PENNSYLVANIA</strong></p>
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
  'Pennsylvania Mechanics'' Lien Law',
  '49 P.S. § 1101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Pennsylvania Conditional Final Payment Waiver',
  'PA',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>COMMONWEALTH OF PENNSYLVANIA</strong></p>
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
  'Pennsylvania Mechanics'' Lien Law',
  '49 P.S. § 1101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Pennsylvania Unconditional Final Payment Waiver',
  'PA',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>COMMONWEALTH OF PENNSYLVANIA</strong></p>
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
  'Pennsylvania Mechanics'' Lien Law',
  '49 P.S. § 1101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- RHODE ISLAND (RI) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Rhode Island Conditional Progress Payment Waiver',
  'RI',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF RHODE ISLAND</strong></p>
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
  'Rhode Island General Laws Title 34, Chapter 28',
  'R.I. Gen. Laws § 34-28-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Rhode Island Unconditional Progress Payment Waiver',
  'RI',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF RHODE ISLAND</strong></p>
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
  'Rhode Island General Laws Title 34, Chapter 28',
  'R.I. Gen. Laws § 34-28-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Rhode Island Conditional Final Payment Waiver',
  'RI',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF RHODE ISLAND</strong></p>
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
  'Rhode Island General Laws Title 34, Chapter 28',
  'R.I. Gen. Laws § 34-28-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Rhode Island Unconditional Final Payment Waiver',
  'RI',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF RHODE ISLAND</strong></p>
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
  'Rhode Island General Laws Title 34, Chapter 28',
  'R.I. Gen. Laws § 34-28-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- SOUTH CAROLINA (SC) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'South Carolina Conditional Progress Payment Waiver',
  'SC',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF SOUTH CAROLINA</strong></p>
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
  'South Carolina Code Title 29, Chapter 5',
  'S.C. Code Ann. § 29-5-10 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'South Carolina Unconditional Progress Payment Waiver',
  'SC',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF SOUTH CAROLINA</strong></p>
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
  'South Carolina Code Title 29, Chapter 5',
  'S.C. Code Ann. § 29-5-10 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'South Carolina Conditional Final Payment Waiver',
  'SC',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF SOUTH CAROLINA</strong></p>
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
  'South Carolina Code Title 29, Chapter 5',
  'S.C. Code Ann. § 29-5-10 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'South Carolina Unconditional Final Payment Waiver',
  'SC',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF SOUTH CAROLINA</strong></p>
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
  'South Carolina Code Title 29, Chapter 5',
  'S.C. Code Ann. § 29-5-10 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- SOUTH DAKOTA (SD) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'South Dakota Conditional Progress Payment Waiver',
  'SD',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF SOUTH DAKOTA</strong></p>
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
  'South Dakota Codified Laws Chapter 44-9',
  'SDCL § 44-9-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'South Dakota Unconditional Progress Payment Waiver',
  'SD',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF SOUTH DAKOTA</strong></p>
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
  'South Dakota Codified Laws Chapter 44-9',
  'SDCL § 44-9-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'South Dakota Conditional Final Payment Waiver',
  'SD',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF SOUTH DAKOTA</strong></p>
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
  'South Dakota Codified Laws Chapter 44-9',
  'SDCL § 44-9-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'South Dakota Unconditional Final Payment Waiver',
  'SD',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF SOUTH DAKOTA</strong></p>
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
  'South Dakota Codified Laws Chapter 44-9',
  'SDCL § 44-9-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- TENNESSEE (TN) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Tennessee Conditional Progress Payment Waiver',
  'TN',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF TENNESSEE</strong></p>
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
  'Tennessee Code Title 66, Chapter 11',
  'Tenn. Code Ann. § 66-11-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Tennessee Unconditional Progress Payment Waiver',
  'TN',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF TENNESSEE</strong></p>
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
  'Tennessee Code Title 66, Chapter 11',
  'Tenn. Code Ann. § 66-11-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Tennessee Conditional Final Payment Waiver',
  'TN',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF TENNESSEE</strong></p>
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
  'Tennessee Code Title 66, Chapter 11',
  'Tenn. Code Ann. § 66-11-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Tennessee Unconditional Final Payment Waiver',
  'TN',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF TENNESSEE</strong></p>
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
  'Tennessee Code Title 66, Chapter 11',
  'Tenn. Code Ann. § 66-11-101 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Continues in Part 3...
