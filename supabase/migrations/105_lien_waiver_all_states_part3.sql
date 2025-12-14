-- Migration: 105_lien_waiver_all_states_part3.sql
-- Description: Expand lien waiver templates to all 50 US states (Part 3)
-- Includes: Utah, Vermont, Virginia, West Virginia, Wisconsin, Wyoming
-- Also adds missing waiver types for states that only had conditional_progress

-- =============================================
-- UTAH (UT) - Has statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Utah Conditional Progress Payment Waiver',
  'UT',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>
<p><strong>STATE OF UTAH</strong></p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S LIEN AND PAYMENT BOND RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT. A PERSON SHOULD NOT RELY ON THIS DOCUMENT UNLESS SATISFIED THAT THE CLAIMANT HAS RECEIVED PAYMENT.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release:</strong><br/>
This document waives and releases lien and payment bond rights the claimant has for labor or service provided, and equipment or material delivered, to the customer on this job through {{through_date}}. This document is effective only on the claimant''s receipt of payment from the financial institution on which the following check is drawn:</p>

<p>Maker of Check: {{check_maker}}<br/>
Amount of Check: ${{payment_amount}}<br/>
Check Payable to: {{payee}}</p>

<p><strong>Exceptions:</strong> This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Utah Mechanics'' Lien Act - UCA 38-1a-801',
  'Utah Code Ann. § 38-1a-801',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "check_maker", "payment_amount", "payee", "exceptions", "claimant_title", "signature_date"]'
),
(
  'Utah Unconditional Progress Payment Waiver',
  'UT',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>
<p><strong>STATE OF UTAH</strong></p>

<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES AND RELEASES LIEN AND PAYMENT BOND RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS. THIS DOCUMENT IS ENFORCEABLE AGAINST YOU IF YOU SIGN IT, EVEN IF YOU HAVE NOT BEEN PAID. IF YOU HAVE NOT BEEN PAID, USE A CONDITIONAL WAIVER AND RELEASE FORM.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release:</strong><br/>
This document waives and releases lien and payment bond rights the claimant has for labor or service provided, and equipment or material delivered, to the customer on this job through {{through_date}}. The claimant has received the following progress payment: ${{payment_amount}}</p>

<p><strong>Exceptions:</strong> This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Utah Mechanics'' Lien Act - UCA 38-1a-802',
  'Utah Code Ann. § 38-1a-802',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "payment_amount", "exceptions", "claimant_title", "signature_date"]'
),
(
  'Utah Conditional Final Payment Waiver',
  'UT',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>
<p><strong>STATE OF UTAH</strong></p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S LIEN AND PAYMENT BOND RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release:</strong><br/>
This document waives and releases ALL lien and payment bond rights the claimant has for ALL labor or service provided, and equipment or material delivered, to the customer on this job. This document is effective only on the claimant''s receipt of payment:</p>

<p>Maker of Check: {{check_maker}}<br/>
Amount of Check: ${{payment_amount}}<br/>
Check Payable to: {{payee}}</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Utah Mechanics'' Lien Act - UCA 38-1a-803',
  'Utah Code Ann. § 38-1a-803',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "check_maker", "payment_amount", "payee", "exceptions", "claimant_title", "signature_date"]'
),
(
  'Utah Unconditional Final Payment Waiver',
  'UT',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>
<p><strong>STATE OF UTAH</strong></p>

<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES AND RELEASES ALL LIEN AND PAYMENT BOND RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID IN FULL.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release:</strong><br/>
This document waives and releases ALL lien and payment bond rights the claimant has for ALL labor or service provided, and equipment or material delivered, to the customer on this job. The claimant has been paid in full.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Utah Mechanics'' Lien Act - UCA 38-1a-804',
  'Utah Code Ann. § 38-1a-804',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "exceptions", "claimant_title", "signature_date"]'
);

-- =============================================
-- VERMONT (VT) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Vermont Conditional Progress Payment Waiver',
  'VT',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF VERMONT</strong></p>
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
  'Vermont Statutes Title 9, Chapter 51',
  '9 V.S.A. § 1921 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Vermont Unconditional Progress Payment Waiver',
  'VT',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF VERMONT</strong></p>
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
  'Vermont Statutes Title 9, Chapter 51',
  '9 V.S.A. § 1921 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Vermont Conditional Final Payment Waiver',
  'VT',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF VERMONT</strong></p>
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
  'Vermont Statutes Title 9, Chapter 51',
  '9 V.S.A. § 1921 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Vermont Unconditional Final Payment Waiver',
  'VT',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF VERMONT</strong></p>
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
  'Vermont Statutes Title 9, Chapter 51',
  '9 V.S.A. § 1921 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- VIRGINIA (VA) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Virginia Conditional Progress Payment Waiver',
  'VA',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>COMMONWEALTH OF VIRGINIA</strong></p>
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
  'Virginia Code Title 43',
  'Va. Code Ann. § 43-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Virginia Unconditional Progress Payment Waiver',
  'VA',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>COMMONWEALTH OF VIRGINIA</strong></p>
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
  'Virginia Code Title 43',
  'Va. Code Ann. § 43-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Virginia Conditional Final Payment Waiver',
  'VA',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>COMMONWEALTH OF VIRGINIA</strong></p>
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
  'Virginia Code Title 43',
  'Va. Code Ann. § 43-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Virginia Unconditional Final Payment Waiver',
  'VA',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>COMMONWEALTH OF VIRGINIA</strong></p>
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
  'Virginia Code Title 43',
  'Va. Code Ann. § 43-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- WEST VIRGINIA (WV) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'West Virginia Conditional Progress Payment Waiver',
  'WV',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF WEST VIRGINIA</strong></p>
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
  'West Virginia Code Chapter 38, Article 2',
  'W. Va. Code § 38-2-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'West Virginia Unconditional Progress Payment Waiver',
  'WV',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF WEST VIRGINIA</strong></p>
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
  'West Virginia Code Chapter 38, Article 2',
  'W. Va. Code § 38-2-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'West Virginia Conditional Final Payment Waiver',
  'WV',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF WEST VIRGINIA</strong></p>
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
  'West Virginia Code Chapter 38, Article 2',
  'W. Va. Code § 38-2-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'West Virginia Unconditional Final Payment Waiver',
  'WV',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF WEST VIRGINIA</strong></p>
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
  'West Virginia Code Chapter 38, Article 2',
  'W. Va. Code § 38-2-1 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- WISCONSIN (WI) - No statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Wisconsin Conditional Progress Payment Waiver',
  'WI',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF WISCONSIN</strong></p>
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
  'Wisconsin Statutes Chapter 779',
  'Wis. Stat. § 779.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Wisconsin Unconditional Progress Payment Waiver',
  'WI',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF WISCONSIN</strong></p>
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
  'Wisconsin Statutes Chapter 779',
  'Wis. Stat. § 779.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Wisconsin Conditional Final Payment Waiver',
  'WI',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF WISCONSIN</strong></p>
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
  'Wisconsin Statutes Chapter 779',
  'Wis. Stat. § 779.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Wisconsin Unconditional Final Payment Waiver',
  'WI',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>STATE OF WISCONSIN</strong></p>
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
  'Wisconsin Statutes Chapter 779',
  'Wis. Stat. § 779.01 et seq.',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- =============================================
-- WYOMING (WY) - Has statutory form
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Wyoming Conditional Progress Payment Waiver',
  'WY',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>
<p><strong>STATE OF WYOMING</strong></p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S LIEN RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release:</strong><br/>
This document waives and releases mechanic''s lien rights the claimant has for labor or service provided, and equipment or material delivered, to the customer on this job through {{through_date}}. This document is effective only on the claimant''s receipt of payment from the financial institution on which the following check is drawn:</p>

<p>Maker of Check: {{check_maker}}<br/>
Amount of Check: ${{payment_amount}}<br/>
Check Payable to: {{payee}}</p>

<p><strong>Exceptions:</strong> This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Wyoming Statutes Title 29, Chapter 2',
  'Wyo. Stat. § 29-2-101 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "check_maker", "payment_amount", "payee", "exceptions", "claimant_title", "signature_date"]'
),
(
  'Wyoming Unconditional Progress Payment Waiver',
  'WY',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>
<p><strong>STATE OF WYOMING</strong></p>

<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES MECHANIC''S LIEN RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release:</strong><br/>
This document waives and releases mechanic''s lien rights the claimant has for labor or service provided, and equipment or material delivered, to the customer on this job through {{through_date}}. The claimant has received the following progress payment: ${{payment_amount}}</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Wyoming Statutes Title 29, Chapter 2',
  'Wyo. Stat. § 29-2-101 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "payment_amount", "exceptions", "claimant_title", "signature_date"]'
),
(
  'Wyoming Conditional Final Payment Waiver',
  'WY',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>
<p><strong>STATE OF WYOMING</strong></p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S LIEN RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release:</strong><br/>
This document waives and releases ALL mechanic''s lien rights the claimant has for ALL labor or service provided, and equipment or material delivered, to the customer on this job. This document is effective only on the claimant''s receipt of payment:</p>

<p>Maker of Check: {{check_maker}}<br/>
Amount of Check: ${{payment_amount}}<br/>
Check Payable to: {{payee}}</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Wyoming Statutes Title 29, Chapter 2',
  'Wyo. Stat. § 29-2-101 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "check_maker", "payment_amount", "payee", "exceptions", "claimant_title", "signature_date"]'
),
(
  'Wyoming Unconditional Final Payment Waiver',
  'WY',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>
<p><strong>STATE OF WYOMING</strong></p>

<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES ALL MECHANIC''S LIEN RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID IN FULL.</p>

<p><strong>Identifying Information:</strong><br/>
Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release:</strong><br/>
This document waives and releases ALL mechanic''s lien rights the claimant has for ALL labor or service provided, and equipment or material delivered, to the customer on this job. The claimant has been paid in full.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Wyoming Statutes Title 29, Chapter 2',
  'Wyo. Stat. § 29-2-101 et seq.',
  true,
  false,
  '["claimant_name", "customer_name", "job_location", "owner_name", "exceptions", "claimant_title", "signature_date"]'
);

-- =============================================
-- ADD MISSING WAIVER TYPES FOR EXISTING STATES
-- These states only had conditional_progress in the original migration
-- =============================================

-- Florida - Add missing types
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Florida Unconditional Progress Payment Waiver',
  'FL',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL PARTIAL RELEASE OF LIEN</h2>
<p>The undersigned lienor has received payment in the sum of ${{payment_amount}} and hereby unconditionally waives and releases its lien and right to claim a lien for labor, services, or materials furnished through {{through_date}} to:</p>

<p><strong>Customer:</strong> {{customer_name}}<br/>
<strong>Property:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>LIENOR: {{claimant_name}}<br/>
By: ____________________<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Florida Statutes Chapter 713',
  'Fla. Stat. § 713',
  true,
  false,
  '["payment_amount", "through_date", "customer_name", "job_location", "owner_name", "exceptions", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Florida Conditional Final Payment Waiver',
  'FL',
  'conditional_final',
  E'<h2>CONDITIONAL FINAL RELEASE OF LIEN</h2>
<p>The undersigned lienor, in consideration of the sum of ${{payment_amount}}, hereby waives and releases its lien and right to claim a lien for ALL labor, services, or materials furnished to:</p>

<p><strong>Customer:</strong> {{customer_name}}<br/>
<strong>Property:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>This waiver and release is conditioned on actual receipt by the undersigned of good and sufficient funds in the amount shown above.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>LIENOR: {{claimant_name}}<br/>
By: ____________________<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Florida Statutes Chapter 713',
  'Fla. Stat. § 713',
  true,
  false,
  '["payment_amount", "customer_name", "job_location", "owner_name", "exceptions", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Florida Unconditional Final Payment Waiver',
  'FL',
  'unconditional_final',
  E'<h2>UNCONDITIONAL FINAL RELEASE OF LIEN</h2>
<p>The undersigned lienor has received final payment and hereby unconditionally waives and releases its lien and right to claim a lien for ALL labor, services, or materials furnished to:</p>

<p><strong>Customer:</strong> {{customer_name}}<br/>
<strong>Property:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>LIENOR: {{claimant_name}}<br/>
By: ____________________<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Florida Statutes Chapter 713',
  'Fla. Stat. § 713',
  true,
  false,
  '["customer_name", "job_location", "owner_name", "exceptions", "claimant_name", "claimant_title", "signature_date"]'
);

-- New York - Add missing types
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'New York Unconditional Progress Payment Waiver',
  'NY',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL PARTIAL WAIVER OF LIEN</h2>
<p><strong>STATE OF NEW YORK</strong></p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any and all lien or claim or right of lien under the Lien Law of the State of New York on the building, improvements and lot of land known as {{job_location}} and owned by {{owner_name}} for or on account of labor performed, materials furnished, equipment rented or services rendered through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'New York Lien Law',
  'N.Y. Lien Law',
  true,
  false,
  '["payment_amount", "job_location", "owner_name", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New York Conditional Final Payment Waiver',
  'NY',
  'conditional_final',
  E'<h2>CONDITIONAL FINAL WAIVER OF LIEN</h2>
<p><strong>STATE OF NEW YORK</strong></p>

<p>The undersigned, upon receipt of ${{payment_amount}}, does hereby waive and release any and all lien or claim or right of lien under the Lien Law of the State of New York on the building, improvements and lot of land known as {{job_location}} and owned by {{owner_name}} for ALL labor performed, materials furnished, equipment rented or services rendered.</p>

<p><strong>CONDITIONAL UPON:</strong> Actual receipt of payment in good funds.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'New York Lien Law',
  'N.Y. Lien Law',
  true,
  false,
  '["payment_amount", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'New York Unconditional Final Payment Waiver',
  'NY',
  'unconditional_final',
  E'<h2>UNCONDITIONAL FINAL WAIVER OF LIEN</h2>
<p><strong>STATE OF NEW YORK</strong></p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases any and all lien or claim or right of lien under the Lien Law of the State of New York on the building, improvements and lot of land known as {{job_location}} and owned by {{owner_name}} for ALL labor performed, materials furnished, equipment rented or services rendered.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'New York Lien Law',
  'N.Y. Lien Law',
  true,
  false,
  '["job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Arizona - Add missing types
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Arizona Unconditional Progress Payment Waiver',
  'AZ',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>
<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any mechanic''s lien, any state or federal statutory bond right, and any private bond right the undersigned has on the job of {{owner_name}} located at {{job_location}} for labor, services, equipment or materials furnished through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant''s Name: {{claimant_name}}<br/>
Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Arizona Revised Statutes § 33-1008',
  'A.R.S. § 33-1008',
  true,
  false,
  '["payment_amount", "owner_name", "job_location", "through_date", "exceptions", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Arizona Conditional Final Payment Waiver',
  'AZ',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>
<p>On receipt by the undersigned of a check from {{check_maker}} in the sum of ${{payment_amount}} payable to {{payee}} and when the check has been properly endorsed and has been paid by the bank on which it is drawn, this document becomes effective to release any mechanic''s lien, any state or federal statutory bond right, and any private bond right the undersigned has on the job of {{owner_name}} located at {{job_location}} for ALL labor, services, equipment or materials.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant''s Name: {{claimant_name}}<br/>
Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Arizona Revised Statutes § 33-1008',
  'A.R.S. § 33-1008',
  true,
  false,
  '["check_maker", "payment_amount", "payee", "owner_name", "job_location", "exceptions", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Arizona Unconditional Final Payment Waiver',
  'AZ',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>
<p>The undersigned has received final payment and hereby unconditionally waives and releases any mechanic''s lien, any state or federal statutory bond right, and any private bond right the undersigned has on the job of {{owner_name}} located at {{job_location}} for ALL labor, services, equipment or materials furnished.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant''s Name: {{claimant_name}}<br/>
Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Arizona Revised Statutes § 33-1008',
  'A.R.S. § 33-1008',
  true,
  false,
  '["owner_name", "job_location", "exceptions", "claimant_name", "claimant_title", "signature_date"]'
);

-- Georgia - Add missing types
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Georgia Unconditional Progress Payment Waiver',
  'GA',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL INTERIM WAIVER AND RELEASE UPON PAYMENT</h2>
<p><strong>STATE OF GEORGIA</strong></p>

<p>The undersigned has received payment of ${{payment_amount}} from {{customer_name}} and hereby unconditionally waives and releases any claim of lien or right to claim of lien against the real property of {{owner_name}} located at {{job_location}} for labor, services, equipment, or material furnished through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>CONTRACTOR/SUBCONTRACTOR/SUPPLIER:<br/>
{{claimant_company}}<br/>
By: ____________________<br/>
Print Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Georgia Code § 44-14-366',
  'O.C.G.A. § 44-14-366',
  true,
  false,
  '["payment_amount", "customer_name", "owner_name", "job_location", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Georgia Conditional Final Payment Waiver',
  'GA',
  'conditional_final',
  E'<h2>CONDITIONAL FINAL WAIVER AND RELEASE UPON PAYMENT</h2>
<p><strong>STATE OF GEORGIA</strong></p>

<p>Upon receipt by the undersigned of a check from {{customer_name}} in the sum of ${{payment_amount}} payable to the undersigned and when the check has been properly endorsed and has been paid by the bank upon which it was drawn, this document shall become effective to release any claim of lien or right to claim of lien that the undersigned has on the real property of {{owner_name}} located at {{job_location}} for ALL labor, services, equipment, or material furnished.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>CONTRACTOR/SUBCONTRACTOR/SUPPLIER:<br/>
{{claimant_company}}<br/>
By: ____________________<br/>
Print Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Georgia Code § 44-14-366',
  'O.C.G.A. § 44-14-366',
  true,
  false,
  '["customer_name", "payment_amount", "owner_name", "job_location", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Georgia Unconditional Final Payment Waiver',
  'GA',
  'unconditional_final',
  E'<h2>UNCONDITIONAL FINAL WAIVER AND RELEASE UPON PAYMENT</h2>
<p><strong>STATE OF GEORGIA</strong></p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases any claim of lien or right to claim of lien against the real property of {{owner_name}} located at {{job_location}} for ALL labor, services, equipment, or material furnished.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>CONTRACTOR/SUBCONTRACTOR/SUPPLIER:<br/>
{{claimant_company}}<br/>
By: ____________________<br/>
Print Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Georgia Code § 44-14-366',
  'O.C.G.A. § 44-14-366',
  true,
  false,
  '["owner_name", "job_location", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Nevada - Add missing types
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Nevada Unconditional Progress Payment Waiver',
  'NV',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL LIEN RELEASE (PROGRESS PAYMENT)</h2>
<p><strong>STATE OF NEVADA</strong></p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives any and all right to file a mechanic''s lien against the real property commonly known as {{job_location}} owned by {{owner_name}} for labor, materials, services, or equipment furnished through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Company Name: {{claimant_company}}<br/>
Authorized Signature: ____________________<br/>
Printed Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>

<p>NOTARIZATION REQUIRED IN NEVADA</p>',
  'Nevada Revised Statutes Chapter 108',
  'NRS Chapter 108',
  true,
  true,
  '["payment_amount", "job_location", "owner_name", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Nevada Conditional Final Payment Waiver',
  'NV',
  'conditional_final',
  E'<h2>CONDITIONAL LIEN RELEASE (FINAL PAYMENT)</h2>
<p><strong>STATE OF NEVADA</strong></p>

<p>Upon receipt of the sum of ${{payment_amount}} the undersigned waives any and all right to file a mechanic''s lien against the real property commonly known as {{job_location}} and owned by {{owner_name}} for ALL labor, materials, services, or equipment furnished.</p>

<p>This release is conditioned upon the actual receipt of payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Company Name: {{claimant_company}}<br/>
Authorized Signature: ____________________<br/>
Printed Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>

<p>NOTARIZATION REQUIRED IN NEVADA</p>',
  'Nevada Revised Statutes Chapter 108',
  'NRS Chapter 108',
  true,
  true,
  '["payment_amount", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Nevada Unconditional Final Payment Waiver',
  'NV',
  'unconditional_final',
  E'<h2>UNCONDITIONAL LIEN RELEASE (FINAL PAYMENT)</h2>
<p><strong>STATE OF NEVADA</strong></p>

<p>The undersigned has received final payment and hereby unconditionally waives any and all right to file a mechanic''s lien against the real property commonly known as {{job_location}} and owned by {{owner_name}} for ALL labor, materials, services, or equipment furnished.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Company Name: {{claimant_company}}<br/>
Authorized Signature: ____________________<br/>
Printed Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>

<p>NOTARIZATION REQUIRED IN NEVADA</p>',
  'Nevada Revised Statutes Chapter 108',
  'NRS Chapter 108',
  true,
  true,
  '["job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Washington - Add missing types
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Washington Unconditional Progress Payment Waiver',
  'WA',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL LIEN WAIVER ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF WASHINGTON</strong></p>

<p>Project: {{project_name}}<br/>
Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any lien, claim of lien, or right to lien under RCW 60.04 for labor, professional services, materials, or equipment furnished through {{through_date}} on the above-referenced property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'RCW 60.04 Construction Liens',
  'RCW 60.04',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Washington Conditional Final Payment Waiver',
  'WA',
  'conditional_final',
  E'<h2>CONDITIONAL LIEN WAIVER ON FINAL PAYMENT</h2>
<p><strong>STATE OF WASHINGTON</strong></p>

<p>Project: {{project_name}}<br/>
Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p>On receipt of payment of the sum of ${{payment_amount}}, the undersigned waives and releases any lien, claim of lien, or right to lien under RCW 60.04 for ALL labor, professional services, materials, or equipment furnished on the above-referenced property.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon receipt of payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'RCW 60.04 Construction Liens',
  'RCW 60.04',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Washington Unconditional Final Payment Waiver',
  'WA',
  'unconditional_final',
  E'<h2>UNCONDITIONAL LIEN WAIVER ON FINAL PAYMENT</h2>
<p><strong>STATE OF WASHINGTON</strong></p>

<p>Project: {{project_name}}<br/>
Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases any lien, claim of lien, or right to lien under RCW 60.04 for ALL labor, professional services, materials, or equipment furnished on the above-referenced property.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'RCW 60.04 Construction Liens',
  'RCW 60.04',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Colorado - Add missing types
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Colorado Unconditional Progress Payment Waiver',
  'CO',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL PARTIAL LIEN WAIVER</h2>
<p><strong>STATE OF COLORADO</strong></p>

<p>Project Name: {{project_name}}<br/>
Project Address: {{job_location}}<br/>
Property Owner: {{owner_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} and hereby unconditionally waives and releases any and all liens, lien rights, and claims against the above-described property for labor, services, equipment, or materials provided through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Authorized Representative: ____________________<br/>
Printed Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Colorado Revised Statutes § 38-22-101',
  'C.R.S. § 38-22-101',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Colorado Conditional Final Payment Waiver',
  'CO',
  'conditional_final',
  E'<h2>CONDITIONAL FINAL LIEN WAIVER</h2>
<p><strong>STATE OF COLORADO</strong></p>

<p>Project Name: {{project_name}}<br/>
Project Address: {{job_location}}<br/>
Property Owner: {{owner_name}}</p>

<p>Upon receipt of final payment of ${{payment_amount}}, the undersigned waives and releases any and all liens, lien rights, and claims against the above-described property for ALL labor, services, equipment, or materials provided.</p>

<p><strong>CONDITIONAL:</strong> This waiver shall become effective only upon receipt of actual payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Authorized Representative: ____________________<br/>
Printed Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Colorado Revised Statutes § 38-22-101',
  'C.R.S. § 38-22-101',
  true,
  false,
  '["project_name", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Colorado Unconditional Final Payment Waiver',
  'CO',
  'unconditional_final',
  E'<h2>UNCONDITIONAL FINAL LIEN WAIVER</h2>
<p><strong>STATE OF COLORADO</strong></p>

<p>Project Name: {{project_name}}<br/>
Project Address: {{job_location}}<br/>
Property Owner: {{owner_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases any and all liens, lien rights, and claims against the above-described property for ALL labor, services, equipment, or materials provided.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Authorized Representative: ____________________<br/>
Printed Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Colorado Revised Statutes § 38-22-101',
  'C.R.S. § 38-22-101',
  true,
  false,
  '["project_name", "job_location", "owner_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Illinois - Add missing types
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Illinois Unconditional Progress Payment Waiver',
  'IL',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER OF MECHANIC''S LIEN - PROGRESS PAYMENT</h2>
<p><strong>STATE OF ILLINOIS</strong></p>

<p>Property Address: {{job_location}}<br/>
Owner: {{owner_name}}<br/>
General Contractor: {{customer_name}}</p>

<p>The undersigned has received payment of ${{payment_amount}} from {{customer_name}} and hereby unconditionally waives and releases any mechanic''s lien rights against the above-described property for labor, materials, services, or equipment furnished through {{through_date}}.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Company: {{claimant_company}}<br/>
Signature: ____________________<br/>
Print Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  '770 ILCS 60/ Mechanics Lien Act',
  '770 ILCS 60/',
  true,
  false,
  '["job_location", "owner_name", "customer_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Illinois Conditional Final Payment Waiver',
  'IL',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER OF MECHANIC''S LIEN - FINAL PAYMENT</h2>
<p><strong>STATE OF ILLINOIS</strong></p>

<p>Property Address: {{job_location}}<br/>
Owner: {{owner_name}}<br/>
General Contractor: {{customer_name}}</p>

<p>The undersigned, upon receipt of the sum of ${{payment_amount}} from {{customer_name}}, waives and releases any mechanic''s lien rights the undersigned has against the above-described property for ALL labor, materials, services, or equipment furnished.</p>

<p><strong>CONDITIONAL:</strong> This waiver is conditioned upon and shall become effective only upon actual receipt of the payment described above.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Company: {{claimant_company}}<br/>
Signature: ____________________<br/>
Print Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  '770 ILCS 60/ Mechanics Lien Act',
  '770 ILCS 60/',
  true,
  false,
  '["job_location", "owner_name", "customer_name", "payment_amount", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Illinois Unconditional Final Payment Waiver',
  'IL',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER OF MECHANIC''S LIEN - FINAL PAYMENT</h2>
<p><strong>STATE OF ILLINOIS</strong></p>

<p>Property Address: {{job_location}}<br/>
Owner: {{owner_name}}<br/>
General Contractor: {{customer_name}}</p>

<p>The undersigned has received final payment and hereby unconditionally waives and releases any mechanic''s lien rights against the above-described property for ALL labor, materials, services, or equipment furnished.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Company: {{claimant_company}}<br/>
Signature: ____________________<br/>
Print Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  '770 ILCS 60/ Mechanics Lien Act',
  '770 ILCS 60/',
  true,
  false,
  '["job_location", "owner_name", "customer_name", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Summary comment
COMMENT ON TABLE lien_waiver_templates IS 'State-specific lien waiver templates - complete coverage for all 50 US states with all 4 waiver types';
