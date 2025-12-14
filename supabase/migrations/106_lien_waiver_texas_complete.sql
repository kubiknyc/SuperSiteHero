-- Migration: 106_lien_waiver_texas_complete.sql
-- Description: Add missing Texas waiver types (final payment waivers)
-- Texas had only conditional/unconditional progress in the original migration

-- =============================================
-- TEXAS (TX) - Add missing final payment types
-- =============================================
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Texas Conditional Final Payment Waiver',
  'TX',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Job No.:</strong> {{job_number}}<br/>
<strong>On Account Of:</strong> {{customer_name}}</p>

<p>The undersigned mechanic and/or materialman has been employed by {{customer_name}} to furnish {{work_description}} for the improvement of the property known as {{job_location}} owned by {{owner_name}}.</p>

<p>Upon receipt of the sum of ${{payment_amount}}, the undersigned waives and releases any and all lien or claim of lien the undersigned now has on the above referenced job to the following extent:</p>

<p>This waiver and release covers FINAL PAYMENT for all labor, services, equipment, or materials furnished to the jobsite or to {{customer_name}}, and releases all claims for the entire project including retention.</p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES RIGHTS UPON RECEIPT OF PAYMENT.</p>

<p><strong>Before any recipient of this document relies on it, the recipient should verify evidence of payment to the undersigned.</strong></p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant: {{claimant_name}}<br/>
By: ____________________<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Texas Property Code Chapter 53',
  'Tex. Prop. Code § 53',
  true,
  false,
  '["project_name", "job_number", "customer_name", "work_description", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Texas Unconditional Final Payment Waiver',
  'TX',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Job No.:</strong> {{job_number}}<br/>
<strong>On Account Of:</strong> {{customer_name}}</p>

<p>The undersigned mechanic and/or materialman has been employed by {{customer_name}} to furnish {{work_description}} for the improvement of the property known as {{job_location}} owned by {{owner_name}}.</p>

<p>The undersigned has been paid and has received FINAL payment in the sum of ${{payment_amount}} for all labor, services, equipment, or materials furnished to the jobsite or to {{customer_name}} and hereby releases any mechanic''s lien, any right arising from a payment bond, and any other rights the undersigned has to the above referenced job.</p>

<p>This waiver and release is FINAL and covers all work and materials furnished on this project including all retention.</p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID IN FULL. IT IS NOT NECESSARY THAT YOU BE PAID BEFORE SIGNING THIS DOCUMENT, BUT YOU ARE CERTIFYING THAT YOU HAVE BEEN PAID IN FULL.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant: {{claimant_name}}<br/>
By: ____________________<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Texas Property Code Chapter 53',
  'Tex. Prop. Code § 53',
  true,
  false,
  '["project_name", "job_number", "customer_name", "work_description", "job_location", "owner_name", "payment_amount", "exceptions", "claimant_name", "claimant_title", "signature_date"]'
);

-- Final summary: All 50 US states now have all 4 waiver types
-- Total templates: 50 states x 4 types = 200 templates
