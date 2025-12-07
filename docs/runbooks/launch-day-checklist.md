# Launch Day Checklist

**Last Updated:** December 7, 2025

Complete verification checklist for SuperSiteHero production deployment.

---

## Pre-Launch (T-24 Hours)

### Infrastructure Verification

- [ ] **Database migrations applied**
  ```bash
  supabase db push --linked
  # Verify: Check migration history in Supabase Dashboard
  ```

- [ ] **Environment variables set in Vercel**
  - [ ] `VITE_SUPABASE_URL` - Production Supabase URL
  - [ ] `VITE_SUPABASE_ANON_KEY` - Production anon key
  - [ ] `VITE_SENTRY_DSN` - Sentry DSN
  - [ ] `VITE_SENTRY_ENVIRONMENT` = `production`

- [ ] **GitHub Secrets configured**
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `TEST_USER_EMAIL`
  - [ ] `TEST_USER_PASSWORD`

- [ ] **SSL certificate valid**
  ```bash
  curl -vI https://your-domain.com 2>&1 | grep "SSL certificate"
  # Should show valid certificate
  ```

- [ ] **DNS configured correctly**
  ```bash
  nslookup your-domain.com
  # Should resolve to Vercel IPs
  ```

- [ ] **Backup verified**
  ```bash
  # Create pre-launch backup
  supabase db dump -f pre_launch_backup_$(date +%Y%m%d).sql --linked
  ```

### Code Verification

- [ ] **Build succeeds**
  ```bash
  npm run build
  # Exit code: 0, no errors
  ```

- [ ] **TypeScript compiles**
  ```bash
  npm run typecheck
  # Exit code: 0, no errors
  ```

- [ ] **Linting passes**
  ```bash
  npm run lint
  # Exit code: 0, no errors
  ```

- [ ] **Unit tests pass**
  ```bash
  npm test
  # All tests passing
  ```

- [ ] **E2E tests pass**
  ```bash
  npm run test:e2e
  # All critical flows passing
  ```

- [ ] **Security audit clean**
  ```bash
  npm audit
  # 0 vulnerabilities
  ```

---

## Launch (T-0)

### Deployment

- [ ] **Merge to main branch**
  ```bash
  git checkout main
  git pull origin main
  git merge release-branch
  git push origin main
  ```

- [ ] **Monitor CI/CD pipeline**
  - [ ] Build step completes
  - [ ] Tests pass
  - [ ] Deployment to Vercel succeeds

- [ ] **Verify production URL**
  ```bash
  curl -I https://your-domain.com
  # HTTP/2 200
  ```

### Functional Verification

#### Authentication (Critical)

- [ ] **Login flow**
  1. Navigate to `/login`
  2. Enter valid credentials
  3. Click "Sign In"
  4. ✓ Redirected to dashboard
  5. ✓ User name displayed in header

- [ ] **Logout flow**
  1. Click user menu
  2. Click "Sign Out"
  3. ✓ Redirected to login page
  4. ✓ Cannot access protected routes

- [ ] **Password reset**
  1. Click "Forgot Password"
  2. Enter email
  3. ✓ Email received
  4. ✓ Can reset password via link

#### Project Management (Critical)

- [ ] **Create project**
  1. Navigate to Projects
  2. Click "New Project"
  3. Fill required fields
  4. Click "Create"
  5. ✓ Project appears in list

- [ ] **Edit project**
  1. Open existing project
  2. Click "Edit"
  3. Modify fields
  4. Click "Save"
  5. ✓ Changes persisted

- [ ] **Delete project**
  1. Open project
  2. Click "Delete"
  3. Confirm deletion
  4. ✓ Project removed from list

#### Daily Reports

- [ ] **Create daily report**
  1. Navigate to Daily Reports
  2. Click "New Report"
  3. Fill date, weather, crew
  4. Add work activities
  5. Click "Save"
  6. ✓ Report saved successfully

- [ ] **Upload photos**
  1. Open daily report
  2. Click "Add Photos"
  3. Select image file
  4. ✓ Photo uploads and displays

- [ ] **Export PDF**
  1. Open daily report
  2. Click "Export PDF"
  3. ✓ PDF downloads correctly

#### RFIs

- [ ] **Create RFI**
  1. Navigate to RFIs
  2. Click "New RFI"
  3. Fill subject, question
  4. Click "Submit"
  5. ✓ RFI created with number

- [ ] **Respond to RFI**
  1. Open existing RFI
  2. Add response
  3. Click "Save"
  4. ✓ Status updates

- [ ] **Export to Excel**
  1. Open RFI list
  2. Click "Export Excel"
  3. ✓ .xlsx file downloads

#### Submittals

- [ ] **Create submittal**
  1. Navigate to Submittals
  2. Click "New Submittal"
  3. Fill spec section, title
  4. Click "Submit"
  5. ✓ Submittal created

- [ ] **Upload attachment**
  1. Open submittal
  2. Click "Add Attachment"
  3. Select file
  4. ✓ File uploads successfully

- [ ] **Export to Excel**
  1. Open submittal list
  2. Click "Export Excel"
  3. ✓ .xlsx file downloads

#### Offline Mode

- [ ] **Enable offline**
  1. Disconnect network (airplane mode)
  2. ✓ Offline indicator appears
  3. ✓ Cached data still accessible

- [ ] **Create offline**
  1. While offline, create daily report
  2. ✓ Report saves to local storage
  3. Reconnect network
  4. ✓ Report syncs to server

---

## Post-Launch (T+1 Hour)

### Monitoring

- [ ] **Error rate check**
  - Sentry Dashboard: Error rate < 1%
  - No critical errors in last hour

- [ ] **Performance check**
  - Page load time < 3s
  - API response time < 500ms
  - No memory leaks detected

- [ ] **Uptime check**
  - All health endpoints responding
  - No 5xx errors in logs

### Communication

- [ ] **Update status page**
  - Mark deployment complete
  - Note any known issues

- [ ] **Notify stakeholders**
  - Send launch confirmation email
  - Update Slack channel

- [ ] **Announce to users** (if applicable)
  - Release notes published
  - In-app notification (optional)

---

## Post-Launch (T+24 Hours)

### Review

- [ ] **Error review**
  - Review all Sentry errors
  - Prioritize and assign fixes

- [ ] **Performance review**
  - Check Vercel Analytics
  - Review Core Web Vitals

- [ ] **User feedback**
  - Check support inbox
  - Review any reported issues

### Documentation

- [ ] **Update runbooks** if needed
- [ ] **Document any issues** encountered
- [ ] **Schedule post-launch review** meeting

---

## Rollback Criteria

Immediately rollback if any of these occur:

| Issue | Action |
|-------|--------|
| Login completely broken | Vercel instant rollback |
| Data not saving | Rollback + investigate |
| Error rate > 5% | Vercel instant rollback |
| Security vulnerability discovered | Rollback + patch |
| Critical feature completely broken | Vercel instant rollback |

**Rollback command:**
```bash
vercel promote [last-known-good-deployment] --yes
```

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Tech Lead | [Name] | [Phone/Email] |
| DevOps | [Name] | [Phone/Email] |
| Product Owner | [Name] | [Phone/Email] |
| On-call | [Rotation] | [PagerDuty/Phone] |

---

## Launch Team Sign-off

| Role | Name | Sign-off | Time |
|------|------|----------|------|
| Engineering | | ☐ | |
| QA | | ☐ | |
| Product | | ☐ | |
| DevOps | | ☐ | |

---

**Document Owner:** DevOps Team
**Last Used:** [Date]
**Review Cycle:** Before each major release
