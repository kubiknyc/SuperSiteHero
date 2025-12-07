# User Acceptance Testing (UAT) Scripts

## Overview

These test scripts are designed for field testing by superintendents and project managers. Each script covers a critical workflow with step-by-step instructions and expected results.

**Test Environment:** Staging (https://staging.supersitehero.com)
**Test Duration:** 2-3 hours total
**Testers Required:** 2-3 field users

---

## Pre-Test Setup

### Required Equipment
- [ ] Laptop with Chrome/Firefox browser
- [ ] Mobile device (iOS or Android)
- [ ] Test user credentials (provided separately)
- [ ] Sample files for upload (PDF, images)

### Environment Check
1. Navigate to staging URL
2. Verify SSL certificate (padlock icon)
3. Test login with provided credentials
4. Confirm you see the projects list

---

## Test Script 1: Authentication & Session Management

**Duration:** 10 minutes
**Priority:** Critical

### TC-1.1: Login Flow
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to login page | Login form displayed | |
| 2 | Enter valid email | Email accepted | |
| 3 | Enter valid password | Password masked | |
| 4 | Click "Sign In" | Loading indicator shown | |
| 5 | Wait for redirect | Dashboard/Projects page loads | |

### TC-1.2: Invalid Login
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Enter invalid email | No error yet | |
| 2 | Enter wrong password | No error yet | |
| 3 | Click "Sign In" | Error message displayed | |
| 4 | Verify error message | "Invalid credentials" or similar | |

### TC-1.3: Session Persistence
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Login successfully | Dashboard shown | |
| 2 | Close browser tab | - | |
| 3 | Open new tab, navigate to app | Still logged in | |
| 4 | Refresh page | Session maintained | |

### TC-1.4: Logout
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click user menu/avatar | Menu opens | |
| 2 | Click "Logout" | Logging out | |
| 3 | Verify redirect | Login page shown | |
| 4 | Try to access /projects | Redirected to login | |

---

## Test Script 2: Project Management

**Duration:** 20 minutes
**Priority:** Critical

### TC-2.1: View Projects
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to Projects | Projects list displayed | |
| 2 | Verify project cards/rows | Shows name, status, dates | |
| 3 | Check project count | Matches expected number | |

### TC-2.2: Create New Project
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "New Project" | Create dialog opens | |
| 2 | Enter project name: "UAT Test Project [Your Name]" | Name accepted | |
| 3 | Enter address: "123 Test Lane" | Address accepted | |
| 4 | Enter project number: "UAT-001" | Number accepted | |
| 5 | Click "Create" | Loading indicator | |
| 6 | Verify creation | Project appears in list | |

### TC-2.3: Edit Project
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click on your test project | Project detail opens | |
| 2 | Click "Edit" or settings icon | Edit form opens | |
| 3 | Change address to "456 Updated Ave" | Change accepted | |
| 4 | Click "Save" | Changes saved | |
| 5 | Verify update | New address displayed | |

### TC-2.4: Project Navigation
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | From project detail, find module links | RFIs, Submittals, Daily Reports, etc. visible | |
| 2 | Click "RFIs" | RFIs page for project loads | |
| 3 | Click back to project | Returns to project detail | |
| 4 | Click "Daily Reports" | Daily Reports page loads | |

---

## Test Script 3: Daily Reports (Field Critical)

**Duration:** 30 minutes
**Priority:** Critical

### TC-3.1: Create Daily Report
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to project > Daily Reports | Reports list shown | |
| 2 | Click "New Daily Report" | Create form opens | |
| 3 | Select today's date | Date set | |
| 4 | Select weather: "Sunny" | Weather recorded | |
| 5 | Enter temperature: 72°F | Temperature saved | |
| 6 | Add general notes: "UAT testing in progress" | Notes saved | |
| 7 | Click "Save" | Report created | |

### TC-3.2: Add Manpower Entry
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open your daily report | Report detail opens | |
| 2 | Find "Add Manpower" or similar | Manpower section visible | |
| 3 | Add trade: "Electricians" | Trade accepted | |
| 4 | Add count: 5 | Count accepted | |
| 5 | Add hours: 8 | Hours accepted | |
| 6 | Save manpower entry | Entry saved | |

### TC-3.3: Add Photo to Report
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find "Add Photo" button | Button visible | |
| 2 | Click to upload | File picker opens | |
| 3 | Select test image | Image uploads | |
| 4 | Add caption: "Test photo" | Caption saved | |
| 5 | Verify photo appears | Thumbnail visible | |

### TC-3.4: Submit/Finalize Report
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Review all report data | Data complete | |
| 2 | Click "Submit" or "Finalize" | Confirmation shown | |
| 3 | Confirm submission | Report status changes | |
| 4 | Verify report locked | Cannot edit submitted report | |

---

## Test Script 4: RFIs

**Duration:** 20 minutes
**Priority:** High

### TC-4.1: Create RFI
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to project > RFIs | RFI list shown | |
| 2 | Click "New RFI" | Create form opens | |
| 3 | Enter subject: "UAT Test RFI" | Subject accepted | |
| 4 | Enter question: "Please clarify the wall finish at Grid B-2" | Question saved | |
| 5 | Set due date: 7 days from now | Date set | |
| 6 | Assign to: (select available user) | User assigned | |
| 7 | Click "Create" | RFI created with number | |

### TC-4.2: View RFI Details
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click on your test RFI | Detail page opens | |
| 2 | Verify RFI number displayed | Number format: RFI-XXX | |
| 3 | Verify status: "Open" | Status badge shown | |
| 4 | Check all entered data | Data matches input | |

### TC-4.3: Add Response to RFI
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find "Add Response" section | Response area visible | |
| 2 | Enter response: "Use paint finish P-1 per spec 09 91 00" | Response accepted | |
| 3 | Save response | Response saved | |
| 4 | Verify response appears | Response visible with timestamp | |

### TC-4.4: Close RFI
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find status dropdown or "Close" button | Control visible | |
| 2 | Change status to "Closed" | Status updated | |
| 3 | Verify closed status | Badge shows "Closed" | |

---

## Test Script 5: Submittals

**Duration:** 20 minutes
**Priority:** High

### TC-5.1: Create Submittal
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to project > Submittals | Submittal list shown | |
| 2 | Click "New Submittal" | Create form opens | |
| 3 | Enter title: "UAT Test Concrete Mix Design" | Title accepted | |
| 4 | Enter spec section: "03 30 00" | Spec accepted | |
| 5 | Click "Create" | Submittal created | |

### TC-5.2: Upload Document to Submittal
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open your test submittal | Detail page opens | |
| 2 | Find "Upload" or "Attachments" | Upload area visible | |
| 3 | Upload test PDF | File uploads | |
| 4 | Verify file appears | File listed with name/size | |

### TC-5.3: Submittal Status Workflow
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Change status to "Submitted" | Status updates | |
| 2 | Change status to "Under Review" | Status updates | |
| 3 | Change status to "Approved" | Status updates | |
| 4 | Verify status history | All changes logged | |

---

## Test Script 6: Mobile Testing

**Duration:** 30 minutes
**Priority:** Critical

### TC-6.1: Mobile Login
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open app on mobile device | Login page displays correctly | |
| 2 | Enter credentials | Keyboard works properly | |
| 3 | Login | Redirects to dashboard | |

### TC-6.2: Mobile Navigation
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to Projects | List is scrollable | |
| 2 | Tap on a project | Detail loads | |
| 3 | Navigate to Daily Reports | Page loads properly | |
| 4 | Test back navigation | Returns to previous page | |

### TC-6.3: Mobile Photo Capture
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open Daily Report | Report loads | |
| 2 | Tap "Add Photo" | Camera or file picker opens | |
| 3 | Take photo with camera | Photo captured | |
| 4 | Photo uploads | Thumbnail appears | |

### TC-6.4: Mobile Form Entry
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create new RFI on mobile | Form is usable | |
| 2 | Fill all fields | Touch input works | |
| 3 | Submit form | Data saved correctly | |

---

## Test Script 7: Offline Mode

**Duration:** 15 minutes
**Priority:** High

### TC-7.1: Offline Access
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | While online, navigate through app | Pages load and cache | |
| 2 | Enable airplane mode | Network disconnected | |
| 3 | Navigate to cached pages | Pages load from cache | |
| 4 | Verify offline indicator | "Offline" banner shown | |

### TC-7.2: Offline Data Entry
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | While offline, create daily report | Form allows entry | |
| 2 | Save the report | Data queued | |
| 3 | See pending sync indicator | Shows queued item | |

### TC-7.3: Sync on Reconnect
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Disable airplane mode | Network reconnected | |
| 2 | Wait for sync | Sync indicator shows progress | |
| 3 | Verify data uploaded | Report appears in list | |

---

## Test Summary

### Critical Issues Found
| Test ID | Description | Severity | Notes |
|---------|-------------|----------|-------|
| | | | |
| | | | |
| | | | |

### Usability Feedback
| Area | Feedback | Suggested Improvement |
|------|----------|----------------------|
| | | |
| | | |
| | | |

### Overall Assessment
- [ ] All critical tests passed
- [ ] Mobile experience acceptable
- [ ] Offline mode functional
- [ ] Ready for production

**Tested By:** ___________________
**Date:** ___________________
**Signature:** ___________________

---

## Appendix: Test Data Cleanup

After testing, clean up test data:
1. Delete test projects created during UAT
2. Remove test RFIs and Submittals
3. Clear test Daily Reports

Or mark them clearly: "UAT TEST - DELETE"
