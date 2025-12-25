# Implementation Guide - Registration System

This guide covers the backend integration and database schema needed to support the registration UI components.

## Database Schema

### Companies Table

```sql
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for case-insensitive search
create index companies_name_lower_idx on companies (lower(trim(name)));
```

### Users Table Extensions

Add these columns to your existing users/profiles table:

```sql
alter table profiles add column if not exists company_id uuid references companies(id);
alter table profiles add column if not exists status text default 'pending' check (status in ('pending', 'active', 'rejected'));
alter table profiles add column if not exists role_title text;
alter table profiles add column if not exists is_company_admin boolean default false;
alter table profiles add column if not exists requested_at timestamptz default now();
alter table profiles add column if not exists approved_at timestamptz;
alter table profiles add column if not exists approved_by uuid references profiles(id);
```

### Row Level Security Policies

```sql
-- Users can read their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- Company admins can view pending users in their company
create policy "Admins can view company pending users"
  on profiles for select
  using (
    exists (
      select 1 from profiles admin
      where admin.id = auth.uid()
      and admin.company_id = profiles.company_id
      and admin.is_company_admin = true
    )
  );

-- Admins can update pending users in their company
create policy "Admins can approve/reject users"
  on profiles for update
  using (
    exists (
      select 1 from profiles admin
      where admin.id = auth.uid()
      and admin.company_id = profiles.company_id
      and admin.is_company_admin = true
    )
  );
```

## API Functions

### 1. Company Lookup

```typescript
// Check if company exists (case-insensitive)
export async function findCompanyByName(name: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', name.trim())
    .maybeSingle();

  return { company: data, error };
}

// Search companies (for autocomplete)
export async function searchCompanies(query: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', `%${query.trim()}%`)
    .order('name')
    .limit(10);

  return { companies: data || [], error };
}
```

### 2. User Registration

```typescript
interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleTitle: string;
  companyMode: 'new' | 'join';
  companyName?: string;
  companyId?: string;
}

export async function registerUser(data: RegistrationData) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
      }
    }
  });

  if (authError) throw authError;

  let companyId = data.companyId;
  let isAdmin = false;

  // 2. Handle company creation or lookup
  if (data.companyMode === 'new') {
    // Create new company
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({ name: data.companyName })
      .select()
      .single();

    if (companyError) throw companyError;

    companyId = newCompany.id;
    isAdmin = true; // First user is admin
  } else {
    // Joining existing company - check it exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .single();

    if (!existingCompany) {
      throw new Error('Company not found');
    }
  }

  // 3. Create user profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user!.id,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      company_id: companyId,
      role_title: data.roleTitle,
      is_company_admin: isAdmin,
      status: isAdmin ? 'active' : 'pending',
      requested_at: new Date().toISOString(),
    });

  if (profileError) throw profileError;

  // 4. Send notification emails
  if (!isAdmin) {
    // Notify company admin about new pending user
    await sendAdminNotification(companyId!, data);
  }

  return {
    userId: authData.user!.id,
    companyId,
    isAdmin,
    status: isAdmin ? 'active' : 'pending'
  };
}
```

### 3. Admin Actions

```typescript
// Get pending users for admin's company
export async function getPendingUsers(adminUserId: string) {
  // First get admin's company
  const { data: admin } = await supabase
    .from('profiles')
    .select('company_id, is_company_admin')
    .eq('id', adminUserId)
    .single();

  if (!admin?.is_company_admin) {
    throw new Error('Unauthorized');
  }

  // Get pending users for that company
  const { data: pendingUsers, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('company_id', admin.company_id)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  return { users: pendingUsers || [], error };
}

// Approve user
export async function approveUser(adminUserId: string, userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: adminUserId
    })
    .eq('id', userId);

  if (error) throw error;

  // Send approval email to user
  await sendApprovalEmail(userId);

  return { success: true };
}

// Reject user
export async function rejectUser(adminUserId: string, userId: string) {
  // Option 1: Mark as rejected
  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'rejected',
      approved_by: adminUserId
    })
    .eq('id', userId);

  // Option 2: Delete the user entirely (cleaner)
  // const { error } = await supabase
  //   .from('profiles')
  //   .delete()
  //   .eq('id', userId);

  if (error) throw error;

  // Send rejection email
  await sendRejectionEmail(userId);

  return { success: true };
}
```

## Email Notifications

### Using Resend (Recommended)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates
const ADMIN_NOTIFICATION_TEMPLATE = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>New User Awaiting Approval</h2>
  <p><strong>{{firstName}} {{lastName}}</strong> has requested to join your company.</p>
  <p>
    <strong>Email:</strong> {{email}}<br>
    <strong>Role:</strong> {{roleTitle}}
  </p>
  <a href="{{approvalUrl}}" style="display: inline-block; padding: 12px 24px; background: #FF6B35; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
    Review Request
  </a>
</div>
`;

const APPROVAL_EMAIL_TEMPLATE = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Welcome to JobSight!</h2>
  <p>Great news! Your access request has been approved.</p>
  <p>You can now log in and start using JobSight.</p>
  <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 24px; background: #FF6B35; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
    Log In Now
  </a>
</div>
`;

const REJECTION_EMAIL_TEMPLATE = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Access Request Update</h2>
  <p>Unfortunately, your request to join {{companyName}} was not approved at this time.</p>
  <p>If you believe this is an error, please contact your company administrator.</p>
</div>
`;

// Send functions
export async function sendAdminNotification(companyId: string, userData: any) {
  // Get admin email
  const { data: admin } = await supabase
    .from('profiles')
    .select('email')
    .eq('company_id', companyId)
    .eq('is_company_admin', true)
    .single();

  if (!admin) return;

  await resend.emails.send({
    from: 'JobSight <notifications@jobsight.com>',
    to: admin.email,
    subject: 'New User Awaiting Approval',
    html: ADMIN_NOTIFICATION_TEMPLATE
      .replace('{{firstName}}', userData.firstName)
      .replace('{{lastName}}', userData.lastName)
      .replace('{{email}}', userData.email)
      .replace('{{roleTitle}}', userData.roleTitle)
      .replace('{{approvalUrl}}', `${process.env.APP_URL}/admin/approvals`)
  });
}

export async function sendApprovalEmail(userId: string) {
  const { data: user } = await supabase
    .from('profiles')
    .select('email, first_name')
    .eq('id', userId)
    .single();

  if (!user) return;

  await resend.emails.send({
    from: 'JobSight <notifications@jobsight.com>',
    to: user.email,
    subject: 'Your JobSight Access Has Been Approved!',
    html: APPROVAL_EMAIL_TEMPLATE
      .replace('{{loginUrl}}', `${process.env.APP_URL}/login`)
  });
}

export async function sendRejectionEmail(userId: string) {
  const { data: user } = await supabase
    .from('profiles')
    .select('email, company_id')
    .eq('id', userId)
    .single();

  if (!user) return;

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', user.company_id)
    .single();

  await resend.emails.send({
    from: 'JobSight <notifications@jobsight.com>',
    to: user.email,
    subject: 'JobSight Access Request Update',
    html: REJECTION_EMAIL_TEMPLATE
      .replace('{{companyName}}', company?.name || 'your company')
  });
}
```

## Component Integration

### Update CompanyRegistration Component

```typescript
import { registerUser, searchCompanies } from './api';

// In handleRegistration:
const result = await registerUser({
  email: userData.email,
  password: userData.password,
  firstName: userData.firstName,
  lastName: userData.lastName,
  roleTitle: userData.role,
  companyMode: mode!,
  companyName: mode === 'new' ? newCompanyName : undefined,
  companyId: mode === 'join' ? selectedCompany!.id : undefined
});

if (result.isAdmin) {
  navigate('/dashboard');
} else {
  navigate('/pending-approval');
}
```

### Update AdminApprovalDashboard Component

```typescript
import { getPendingUsers, approveUser, rejectUser } from './api';

// Load pending users
useEffect(() => {
  const loadPendingUsers = async () => {
    const { users } = await getPendingUsers(currentUserId);
    setPendingUsers(users);
  };
  loadPendingUsers();
}, [currentUserId]);

// Handle approve
const handleApprove = async (userId: string) => {
  await approveUser(currentUserId, userId);
  // Refresh list
  const { users } = await getPendingUsers(currentUserId);
  setPendingUsers(users);
};
```

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Email Service (Resend)
RESEND_API_KEY=your-resend-api-key

# App URLs
VITE_APP_URL=http://localhost:5173
```

## Testing Checklist

- [ ] New company registration creates admin user with immediate access
- [ ] Joining existing company creates pending user
- [ ] Admin receives email notification when user requests access
- [ ] Admin can see all pending users for their company only
- [ ] Approve action grants access and sends email
- [ ] Reject action denies access and sends email
- [ ] Users cannot access app while pending (route guards)
- [ ] RLS policies prevent unauthorized access
- [ ] Company name search is case-insensitive
- [ ] Duplicate company names are prevented

## Production Deployment

1. **Environment Setup**: Configure production environment variables
2. **Database Migrations**: Run schema changes in production
3. **RLS Policies**: Verify all policies are active
4. **Email Service**: Set up production email domain
5. **Monitoring**: Track registration metrics, approval times
6. **Rate Limiting**: Implement rate limits on registration endpoint
7. **Email Deliverability**: Configure SPF/DKIM records

---

**Next Steps**: Integrate these API functions into the React components and deploy!
