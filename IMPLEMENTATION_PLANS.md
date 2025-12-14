# Implementation Plans - Remaining Features

**Generated:** December 12, 2025
**Status:** 98.5% → 100% Complete

---

## Table of Contents
1. [DocuSign API Integration](#1-docusign-api-integration)
2. [Live Cursor Tracking](#2-live-cursor-tracking)
3. [Permission/RBAC Tests](#3-permissionrbac-tests)
4. [Deepen Test Coverage](#4-deepen-test-coverage)
5. [QuickBooks Edge Function Tests](#5-quickbooks-edge-function-tests)
6. [Look-Ahead PDF/Excel Export](#6-look-ahead-pdfexcel-export)

---

## 1. DocuSign API Integration

**Priority:** P1 (Critical)
**Effort:** 2-3 days
**Status:** 40% Complete

### Current State
- ✅ Complete TypeScript types (769 lines)
- ✅ Database schema (Migration 101)
- ✅ OAuth flow structure
- ✅ Envelope management structure
- ❌ Actual API calls (marked as TODO)

### Files to Modify
- `src/lib/api/services/docusign.ts` (main implementation)
- `src/types/docusign.ts` (possibly extend types)
- `.env.example` (add DocuSign credentials)

### Step-by-Step Implementation

#### Step 1: Set Up DocuSign Sandbox Account (30 minutes)
```bash
# Actions:
1. Sign up at https://developers.docusign.com/
2. Create Integration Key (Client ID)
3. Generate Secret Key
4. Set Redirect URI: http://localhost:5173/auth/docusign/callback
5. Note Account ID and Base URL
```

**Environment Variables:**
```env
VITE_DOCUSIGN_CLIENT_ID=your_integration_key
VITE_DOCUSIGN_SECRET=your_secret
VITE_DOCUSIGN_ACCOUNT_ID=your_account_id
VITE_DOCUSIGN_BASE_URL=https://demo.docusign.net/restapi
```

---

#### Step 2: Implement OAuth Token Management (2 hours)

**File:** `src/lib/api/services/docusign.ts`

```typescript
// Add to existing file around line 100

import { supabase } from '@/lib/supabase';

interface DocuSignTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Get valid DocuSign access token (refresh if needed)
 */
async function getValidAccessToken(userId: string): Promise<string> {
  // Fetch from docusign_connections table
  const { data: connection, error } = await supabase
    .from('docusign_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !connection) {
    throw new Error('DocuSign not connected. Please authorize first.');
  }

  // Check if token expired
  const now = Date.now();
  if (connection.expires_at <= now) {
    // Refresh token
    return await refreshAccessToken(connection.refresh_token, userId);
  }

  return connection.access_token;
}

/**
 * Refresh DocuSign access token
 */
async function refreshAccessToken(
  refreshToken: string,
  userId: string
): Promise<string> {
  const response = await fetch(
    `${import.meta.env.VITE_DOCUSIGN_BASE_URL}/oauth/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to refresh DocuSign token');
  }

  const tokens = await response.json();

  // Update in database
  await supabase
    .from('docusign_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return tokens.access_token;
}
```

---

#### Step 3: Implement createEnvelope (3 hours)

**File:** `src/lib/api/services/docusign.ts` (line 243)

```typescript
/**
 * Create a DocuSign envelope from a document
 * ACTUAL IMPLEMENTATION
 */
export async function createEnvelope(params: {
  userId: string;
  accountId: string;
  documentId: string;
  documentType: 'payment_application' | 'change_order' | 'lien_waiver';
  recipients: {
    email: string;
    name: string;
    role: 'signer' | 'carbon_copy';
    routingOrder: number;
  }[];
}): Promise<{ envelopeId: string; uri: string }> {
  try {
    const accessToken = await getValidAccessToken(params.userId);

    // Step 1: Fetch the document from our database
    const document = await fetchDocument(params.documentId, params.documentType);

    // Step 2: Generate PDF from document data
    const pdfBytes = await generatePDF(document, params.documentType);

    // Step 3: Convert PDF to base64
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    // Step 4: Prepare envelope definition
    const envelopeDefinition = {
      emailSubject: `Please sign: ${document.title}`,
      status: 'created', // Draft status
      documents: [
        {
          documentId: '1',
          name: `${document.title}.pdf`,
          fileExtension: 'pdf',
          documentBase64: pdfBase64,
        },
      ],
      recipients: {
        signers: params.recipients
          .filter((r) => r.role === 'signer')
          .map((recipient, index) => ({
            email: recipient.email,
            name: recipient.name,
            recipientId: String(index + 1),
            routingOrder: recipient.routingOrder,
            tabs: getSignatureTabsForDocType(params.documentType),
          })),
        carbonCopies: params.recipients
          .filter((r) => r.role === 'carbon_copy')
          .map((recipient, index) => ({
            email: recipient.email,
            name: recipient.name,
            recipientId: String(params.recipients.length + index + 1),
            routingOrder: recipient.routingOrder,
          })),
      },
    };

    // Step 5: Create envelope via DocuSign API
    const response = await fetch(
      `${import.meta.env.VITE_DOCUSIGN_BASE_URL}/v2.1/accounts/${params.accountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelopeDefinition),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DocuSign API error: ${errorText}`);
    }

    const result = await response.json();

    // Step 6: Store envelope in our database
    await supabase.from('docusign_envelopes').insert({
      envelope_id: result.envelopeId,
      user_id: params.userId,
      document_id: params.documentId,
      document_type: params.documentType,
      status: 'created',
      created_at: new Date().toISOString(),
    });

    return {
      envelopeId: result.envelopeId,
      uri: result.uri,
    };
  } catch (error) {
    console.error('Error creating DocuSign envelope:', error);
    throw error;
  }
}

/**
 * Helper: Get signature tab positions based on document type
 */
function getSignatureTabsForDocType(
  docType: string
): { signHereTabs?: any[]; dateSignedTabs?: any[] } {
  // Default signature positions (adjust per document type)
  const positions = {
    payment_application: { x: 100, y: 650, page: 1 },
    change_order: { x: 100, y: 700, page: 1 },
    lien_waiver: { x: 100, y: 600, page: 1 },
  };

  const pos = positions[docType] || { x: 100, y: 650, page: 1 };

  return {
    signHereTabs: [
      {
        documentId: '1',
        pageNumber: pos.page,
        xPosition: String(pos.x),
        yPosition: String(pos.y),
      },
    ],
    dateSignedTabs: [
      {
        documentId: '1',
        pageNumber: pos.page,
        xPosition: String(pos.x + 200),
        yPosition: String(pos.y),
      },
    ],
  };
}
```

---

#### Step 4: Implement sendEnvelope (1 hour)

```typescript
/**
 * Send an envelope for signing
 */
export async function sendEnvelope(params: {
  userId: string;
  accountId: string;
  envelopeId: string;
}): Promise<{ status: string }> {
  try {
    const accessToken = await getValidAccessToken(params.userId);

    // Update envelope status to 'sent'
    const response = await fetch(
      `${import.meta.env.VITE_DOCUSIGN_BASE_URL}/v2.1/accounts/${params.accountId}/envelopes/${params.envelopeId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'sent',
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send envelope');
    }

    const result = await response.json();

    // Update in our database
    await supabase
      .from('docusign_envelopes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('envelope_id', params.envelopeId);

    return { status: result.status };
  } catch (error) {
    console.error('Error sending envelope:', error);
    throw error;
  }
}
```

---

#### Step 5: Implement getSigningUrl (1 hour)

```typescript
/**
 * Get signing URL for a recipient
 */
export async function getSigningUrl(params: {
  userId: string;
  accountId: string;
  envelopeId: string;
  recipientEmail: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  try {
    const accessToken = await getValidAccessToken(params.userId);

    // Get recipient view (signing URL)
    const response = await fetch(
      `${import.meta.env.VITE_DOCUSIGN_BASE_URL}/v2.1/accounts/${params.accountId}/envelopes/${params.envelopeId}/views/recipient`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authenticationMethod: 'email',
          email: params.recipientEmail,
          returnUrl: params.returnUrl,
          userName: params.recipientEmail,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get signing URL');
    }

    const result = await response.json();

    return { url: result.url };
  } catch (error) {
    console.error('Error getting signing URL:', error);
    throw error;
  }
}
```

---

#### Step 6: Implement PDF Generation (2 hours)

**New File:** `src/lib/api/services/pdf-generator.ts`

```typescript
import { jsPDF } from 'jspdf';
import type { PaymentApplication, ChangeOrder, LienWaiver } from '@/types';

/**
 * Generate PDF for different document types
 */
export async function generatePDF(
  document: any,
  type: 'payment_application' | 'change_order' | 'lien_waiver'
): Promise<Uint8Array> {
  const doc = new jsPDF();

  switch (type) {
    case 'payment_application':
      return generatePaymentAppPDF(doc, document);
    case 'change_order':
      return generateChangeOrderPDF(doc, document);
    case 'lien_waiver':
      return generateLienWaiverPDF(doc, document);
    default:
      throw new Error(`Unknown document type: ${type}`);
  }
}

function generatePaymentAppPDF(doc: jsPDF, app: PaymentApplication): Uint8Array {
  // Add content (use existing payment app export logic)
  doc.setFontSize(16);
  doc.text(`Payment Application #${app.application_number}`, 20, 20);

  doc.setFontSize(12);
  doc.text(`Project: ${app.project?.name || 'N/A'}`, 20, 40);
  doc.text(`Period: ${app.period_start} to ${app.period_end}`, 20, 50);

  // Add signature line
  doc.text('Signature: _____________________', 20, 250);
  doc.text('Date: _____________________', 20, 260);

  return doc.output('arraybuffer');
}

// Similar for other types...
```

---

#### Step 7: Implement Webhook Handler (2 hours)

**New File:** `supabase/functions/docusign-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();

    // DocuSign sends envelope status updates
    const envelopeId = payload.data?.envelopeId;
    const status = payload.data?.envelopeSummary?.status;

    if (!envelopeId || !status) {
      return new Response('Invalid payload', { status: 400 });
    }

    // Update envelope status in database
    await supabase
      .from('docusign_envelopes')
      .update({
        status: status.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('envelope_id', envelopeId);

    // If completed, update the original document
    if (status === 'completed') {
      const { data: envelope } = await supabase
        .from('docusign_envelopes')
        .select('document_id, document_type')
        .eq('envelope_id', envelopeId)
        .single();

      if (envelope) {
        // Mark document as signed
        await supabase
          .from(envelope.document_type + 's')
          .update({ signed_at: new Date().toISOString() })
          .eq('id', envelope.document_id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

---

#### Step 8: Testing Plan

**Test File:** `src/lib/api/services/docusign.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createEnvelope, sendEnvelope, getSigningUrl } from './docusign';

describe('DocuSign Integration', () => {
  it('should create an envelope', async () => {
    const result = await createEnvelope({
      userId: 'test-user',
      accountId: 'test-account',
      documentId: 'doc-1',
      documentType: 'payment_application',
      recipients: [
        {
          email: 'signer@example.com',
          name: 'Test Signer',
          role: 'signer',
          routingOrder: 1,
        },
      ],
    });

    expect(result).toHaveProperty('envelopeId');
    expect(result).toHaveProperty('uri');
  });

  it('should send an envelope', async () => {
    const result = await sendEnvelope({
      userId: 'test-user',
      accountId: 'test-account',
      envelopeId: 'env-123',
    });

    expect(result.status).toBe('sent');
  });

  it('should generate signing URL', async () => {
    const result = await getSigningUrl({
      userId: 'test-user',
      accountId: 'test-account',
      envelopeId: 'env-123',
      recipientEmail: 'signer@example.com',
      returnUrl: 'https://app.example.com/signed',
    });

    expect(result.url).toContain('docusign.net');
  });
});
```

---

### Acceptance Criteria
- [ ] Can authenticate with DocuSign (OAuth flow)
- [ ] Can create envelope from payment application
- [ ] Can create envelope from change order
- [ ] Can create envelope from lien waiver
- [ ] Can send envelope to recipients
- [ ] Can get signing URL for recipients
- [ ] Webhooks update envelope status
- [ ] Documents marked as signed when completed
- [ ] All functions have tests

---

### Estimated Timeline
- **Day 1 (Morning):** OAuth + token management
- **Day 1 (Afternoon):** createEnvelope implementation
- **Day 2 (Morning):** sendEnvelope + getSigningUrl
- **Day 2 (Afternoon):** PDF generation
- **Day 3 (Morning):** Webhook handler
- **Day 3 (Afternoon):** Testing + bug fixes

---

## 2. Live Cursor Tracking

**Priority:** P1 (Critical)
**Effort:** 4-6 hours
**Status:** 70% Complete

### Current State
- ✅ Presence tracking (who's online)
- ✅ Typing indicators
- ❌ Live cursor positions
- ❌ Cursor UI component

### Files to Create/Modify
- `src/components/realtime/LiveCursor.tsx` (new)
- `src/hooks/useLiveCursors.ts` (new)
- `src/lib/realtime/presence.ts` (extend existing)
- `src/features/documents/components/markup/UnifiedDrawingCanvas.tsx` (integrate)

### Step-by-Step Implementation

#### Step 1: Extend Presence System (1 hour)

**File:** `src/lib/realtime/presence.ts`

```typescript
// Add to existing presence system

export interface CursorPosition {
  x: number;
  y: number;
  pageX?: number; // For documents
  pageY?: number;
}

export interface UserPresence {
  user_id: string;
  user_name: string;
  user_color: string;
  online_at: string;
  cursor?: CursorPosition;
  typing?: boolean;
  current_page?: string;
}

/**
 * Broadcast cursor position to other users
 * Throttled to 60fps (16ms)
 */
let lastCursorBroadcast = 0;
const CURSOR_THROTTLE_MS = 16;

export function broadcastCursorPosition(
  channel: RealtimeChannel,
  position: CursorPosition
) {
  const now = Date.now();
  if (now - lastCursorBroadcast < CURSOR_THROTTLE_MS) {
    return; // Throttle updates
  }
  lastCursorBroadcast = now;

  channel.track({
    cursor: position,
  });
}

/**
 * Subscribe to cursor movements from other users
 */
export function subscribeToCursors(
  channel: RealtimeChannel,
  onCursorMove: (userId: string, cursor: CursorPosition) => void
) {
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();

    Object.values(state).forEach((presences) => {
      presences.forEach((presence: any) => {
        if (presence.cursor) {
          onCursorMove(presence.user_id, presence.cursor);
        }
      });
    });
  });
}
```

---

#### Step 2: Create useLiveCursors Hook (1.5 hours)

**File:** `src/hooks/useLiveCursors.ts`

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getPresenceChannel, broadcastCursorPosition, subscribeToCursors } from '@/lib/realtime/presence';
import type { CursorPosition } from '@/lib/realtime/presence';

interface UserCursor {
  userId: string;
  userName: string;
  color: string;
  position: CursorPosition;
  lastUpdate: number;
}

export function useLiveCursors(roomId: string) {
  const { user } = useAuth();
  const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map());
  const channelRef = useRef<any>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Cleanup stale cursors (not updated in 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const updated = new Map(prev);
        let changed = false;

        updated.forEach((cursor, userId) => {
          if (now - cursor.lastUpdate > 3000) {
            updated.delete(userId);
            changed = true;
          }
        });

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize presence channel
  useEffect(() => {
    if (!user || !roomId) return;

    const channel = getPresenceChannel(roomId, {
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email || 'Anonymous',
      user_color: getUserColor(user.id),
    });

    channelRef.current = channel;

    // Subscribe to cursor movements
    subscribeToCursors(channel, (userId, cursor) => {
      if (userId === user.id) return; // Skip own cursor

      setCursors((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(userId);

        updated.set(userId, {
          userId,
          userName: existing?.userName || 'Anonymous',
          color: existing?.color || getUserColor(userId),
          position: cursor,
          lastUpdate: Date.now(),
        });

        return updated;
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user, roomId]);

  // Broadcast cursor position on mouse move
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!channelRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        pageX: event.pageX,
        pageY: event.pageY,
      };

      broadcastCursorPosition(channelRef.current, position);
    },
    []
  );

  // Attach mouse move listener to container
  const setContainer = useCallback((element: HTMLElement | null) => {
    if (containerRef.current) {
      containerRef.current.removeEventListener('mousemove', handleMouseMove);
    }

    containerRef.current = element;

    if (element) {
      element.addEventListener('mousemove', handleMouseMove);
    }
  }, [handleMouseMove]);

  return {
    cursors: Array.from(cursors.values()),
    setContainer,
  };
}

/**
 * Generate consistent color for user based on ID
 */
function getUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  ];

  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
```

---

#### Step 3: Create LiveCursor Component (1.5 hours)

**File:** `src/components/realtime/LiveCursor.tsx`

```typescript
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveCursorProps {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

export const LiveCursor: React.FC<LiveCursorProps> = ({
  userId,
  userName,
  color,
  x,
  y,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1, x, y }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        type: 'spring',
        damping: 30,
        stiffness: 200,
      }}
      className="pointer-events-none absolute left-0 top-0 z-50"
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      {/* Cursor Icon */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        <path
          d="M5.65376 12.3673L13.0564 5.00413L9.98988 19.9905L7.17563 13.3717L5.65376 12.3673Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* User Name Label */}
      <div
        className="ml-6 -mt-2 rounded-full px-2 py-1 text-xs font-medium text-white shadow-lg"
        style={{ backgroundColor: color }}
      >
        {userName}
      </div>
    </motion.div>
  );
};

/**
 * Container for all live cursors
 */
interface LiveCursorsContainerProps {
  cursors: Array<{
    userId: string;
    userName: string;
    color: string;
    position: { x: number; y: number };
  }>;
}

export const LiveCursorsContainer: React.FC<LiveCursorsContainerProps> = ({
  cursors,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <AnimatePresence>
        {cursors.map((cursor) => (
          <LiveCursor
            key={cursor.userId}
            userId={cursor.userId}
            userName={cursor.userName}
            color={cursor.color}
            x={cursor.position.x}
            y={cursor.position.y}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
```

---

#### Step 4: Integrate into Drawing Canvas (1 hour)

**File:** `src/features/documents/components/markup/UnifiedDrawingCanvas.tsx`

```typescript
import { useLiveCursors } from '@/hooks/useLiveCursors';
import { LiveCursorsContainer } from '@/components/realtime/LiveCursor';

export function UnifiedDrawingCanvas({ documentId }: { documentId: string }) {
  // ... existing code ...

  // Add live cursors
  const { cursors, setContainer } = useLiveCursors(`document:${documentId}`);

  return (
    <div
      ref={(el) => {
        canvasContainerRef.current = el;
        setContainer(el); // Enable cursor tracking
      }}
      className="relative h-full w-full"
    >
      {/* Existing canvas content */}

      {/* Live cursors overlay */}
      <LiveCursorsContainer cursors={cursors} />
    </div>
  );
}
```

---

#### Step 5: Add Tests (1 hour)

**File:** `src/hooks/useLiveCursors.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useLiveCursors } from './useLiveCursors';
import { vi } from 'vitest';

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    },
  }),
}));

describe('useLiveCursors', () => {
  it('should track cursor positions', () => {
    const { result } = renderHook(() => useLiveCursors('room-123'));

    expect(result.current.cursors).toEqual([]);
  });

  it('should cleanup stale cursors', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useLiveCursors('room-123'));

    // Simulate cursor update
    act(() => {
      // Would normally come from presence channel
    });

    // Fast-forward 4 seconds (past 3s threshold)
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.cursors).toEqual([]);

    vi.useRealTimers();
  });
});
```

---

### Acceptance Criteria
- [ ] Cursors appear for all online users
- [ ] Cursors move smoothly (60fps throttled)
- [ ] Cursors show user name and color
- [ ] Stale cursors removed after 3 seconds
- [ ] No performance impact (throttled updates)
- [ ] Works on drawing canvas
- [ ] Tests pass

---

### Estimated Timeline
- **Hour 1-2:** Extend presence system + hook
- **Hour 3-4:** Create cursor component
- **Hour 5:** Integrate into canvas
- **Hour 6:** Testing + polish

---

## 3. Permission/RBAC Tests

**Priority:** P0 (Critical Security)
**Effort:** 1-2 days
**Status:** 0% Complete

### Overview
Critical security gap. Need comprehensive tests for:
- Role-Based Access Control (RBAC)
- Row-Level Security (RLS) policies
- Permission inheritance
- Data isolation

### Files to Create

#### File 1: `src/lib/auth/rbac.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { checkPermission, getUserRoles, hasRole } from './rbac';
import { createClient } from '@supabase/supabase-js';

describe('RBAC System', () => {
  let supabase: any;

  beforeEach(() => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
  });

  describe('Role Assignment', () => {
    it('should assign admin role to user', async () => {
      const userId = 'test-admin-user';

      // Assign role
      await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      // Verify
      const roles = await getUserRoles(userId);
      expect(roles).toContain('admin');
    });

    it('should assign multiple roles to user', async () => {
      const userId = 'test-multi-role-user';

      await supabase.from('user_roles').insert([
        { user_id: userId, role: 'project_manager' },
        { user_id: userId, role: 'foreman' },
      ]);

      const roles = await getUserRoles(userId);
      expect(roles).toContain('project_manager');
      expect(roles).toContain('foreman');
    });
  });

  describe('Permission Checks', () => {
    it('should allow admin to manage users', async () => {
      const canManage = await checkPermission('admin', 'users', 'manage');
      expect(canManage).toBe(true);
    });

    it('should deny field_worker from managing users', async () => {
      const canManage = await checkPermission('field_worker', 'users', 'manage');
      expect(canManage).toBe(false);
    });

    it('should allow project_manager to create change orders', async () => {
      const canCreate = await checkPermission('project_manager', 'change_orders', 'create');
      expect(canCreate).toBe(true);
    });

    it('should deny foreman from approving change orders', async () => {
      const canApprove = await checkPermission('foreman', 'change_orders', 'approve');
      expect(canApprove).toBe(false);
    });
  });

  describe('Permission Inheritance', () => {
    it('should inherit permissions from parent role', async () => {
      // Admin inherits all permissions
      const permissions = await getRolePermissions('admin');

      expect(permissions).toContain('projects.read');
      expect(permissions).toContain('projects.write');
      expect(permissions).toContain('projects.delete');
      expect(permissions).toContain('users.manage');
    });

    it('should not inherit restricted permissions', async () => {
      const permissions = await getRolePermissions('field_worker');

      expect(permissions).toContain('daily_reports.create');
      expect(permissions).not.toContain('users.manage');
      expect(permissions).not.toContain('projects.delete');
    });
  });
});
```

#### File 2: `src/__tests__/security/rls-policies.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  describe('Projects Table', () => {
    it('should allow user to read own projects only', async () => {
      const user1 = createAuthenticatedClient('user-1');
      const user2 = createAuthenticatedClient('user-2');

      // User 1 creates project
      const { data: project } = await user1
        .from('projects')
        .insert({ name: 'Project A', company_id: 'company-1' })
        .select()
        .single();

      // User 1 can read their project
      const { data: user1Projects } = await user1
        .from('projects')
        .select()
        .eq('id', project.id);

      expect(user1Projects).toHaveLength(1);

      // User 2 cannot read User 1's project
      const { data: user2Projects } = await user2
        .from('projects')
        .select()
        .eq('id', project.id);

      expect(user2Projects).toHaveLength(0);
    });

    it('should allow company members to read company projects', async () => {
      const admin = createAuthenticatedClient('admin-user', 'company-1');
      const member = createAuthenticatedClient('member-user', 'company-1');

      // Admin creates project
      const { data: project } = await admin
        .from('projects')
        .insert({ name: 'Company Project', company_id: 'company-1' })
        .select()
        .single();

      // Company member can read
      const { data } = await member
        .from('projects')
        .select()
        .eq('id', project.id);

      expect(data).toHaveLength(1);
    });
  });

  describe('Daily Reports Table', () => {
    it('should allow project members to read reports', async () => {
      const pm = createAuthenticatedClient('pm-user');
      const foreman = createAuthenticatedClient('foreman-user');

      // PM creates report
      const { data: report } = await pm
        .from('daily_reports')
        .insert({
          project_id: 'project-1',
          date: '2025-12-12',
          weather_conditions: 'Sunny',
        })
        .select()
        .single();

      // Foreman on same project can read
      const { data } = await foreman
        .from('daily_reports')
        .select()
        .eq('id', report.id);

      expect(data).toHaveLength(1);
    });

    it('should prevent unauthorized users from reading reports', async () => {
      const outsider = createAuthenticatedClient('outsider-user');

      const { data, error } = await outsider
        .from('daily_reports')
        .select()
        .eq('project_id', 'project-1');

      expect(data).toHaveLength(0);
    });
  });

  describe('Payment Applications Table', () => {
    it('should restrict financial data to authorized roles', async () => {
      const fieldWorker = createAuthenticatedClient('field-worker', 'company-1');

      const { data, error } = await fieldWorker
        .from('payment_applications')
        .select();

      // Field workers should not see payment apps
      expect(data).toHaveLength(0);
    });

    it('should allow project managers to view payment apps', async () => {
      const pm = createAuthenticatedClient('pm-user', 'company-1');

      const { data } = await pm
        .from('payment_applications')
        .select();

      expect(data.length).toBeGreaterThan(0);
    });
  });
});

function createAuthenticatedClient(userId: string, companyId?: string) {
  // Helper to create authenticated client
  // Implementation depends on your auth setup
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'X-Test-User-Id': userId,
          'X-Test-Company-Id': companyId || 'default-company',
        },
      },
    }
  );
}
```

#### File 3: `src/__tests__/security/data-isolation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Data Isolation', () => {
  it('should prevent tenant A from accessing tenant B data', async () => {
    const tenantA = createAuthenticatedClient('user-a', 'company-a');
    const tenantB = createAuthenticatedClient('user-b', 'company-b');

    // Tenant A creates project
    const { data: projectA } = await tenantA
      .from('projects')
      .insert({ name: 'Project A', company_id: 'company-a' })
      .select()
      .single();

    // Tenant B tries to read Tenant A's project
    const { data: leakedData } = await tenantB
      .from('projects')
      .select()
      .eq('id', projectA.id);

    expect(leakedData).toHaveLength(0);
  });

  it('should prevent cross-tenant data leaks in related tables', async () => {
    const tenantA = createAuthenticatedClient('user-a', 'company-a');
    const tenantB = createAuthenticatedClient('user-b', 'company-b');

    // Tenant A creates daily report
    const { data: report } = await tenantA
      .from('daily_reports')
      .insert({
        project_id: 'project-a',
        date: '2025-12-12',
        company_id: 'company-a',
      })
      .select()
      .single();

    // Tenant B tries to access via join
    const { data } = await tenantB
      .from('daily_reports')
      .select(`
        *,
        project:projects(*)
      `)
      .eq('id', report.id);

    expect(data).toHaveLength(0);
  });
});
```

---

### Test Coverage Goals
- [ ] RBAC: 80%+ coverage
- [ ] RLS Policies: 100% of tables tested
- [ ] Data Isolation: All multi-tenant scenarios
- [ ] Permission Inheritance: All role hierarchies

---

### Estimated Timeline
- **Day 1:** RBAC tests + permission checks
- **Day 2:** RLS policy tests + data isolation

---

## 4. Deepen Test Coverage

**Priority:** P2 (Important)
**Effort:** 1-2 weeks
**Status:** 42% → 65%+

### Target Files

#### 4.1 Payment Applications Tests

**File:** `src/features/payment-applications/hooks/usePaymentApplications.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePaymentApplications } from './usePaymentApplications';

describe('usePaymentApplications', () => {
  it('should calculate G702 totals correctly', async () => {
    const { result } = renderHook(() =>
      usePaymentApplications('project-123')
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const totals = result.current.calculateG702Totals();

    expect(totals.originalContractSum).toBe(1000000);
    expect(totals.netChangeByChangeOrders).toBe(50000);
    expect(totals.contractSumToDate).toBe(1050000);
    expect(totals.retainagePercentage).toBe(10);
  });

  it('should calculate G703 line items correctly', () => {
    // Test individual line item calculations
  });

  it('should handle retainage calculations', () => {
    const retainage = calculateRetainage({
      scheduledValue: 100000,
      workCompleted: 80000,
      retainagePercentage: 10,
    });

    expect(retainage).toBe(8000); // 10% of 80,000
  });

  it('should calculate materials presently stored', () => {
    // Test stored materials calculations
  });
});
```

#### 4.2 EVM Tests

**File:** `src/features/cost-tracking/hooks/useEVM.test.tsx`

```typescript
describe('Earned Value Management', () => {
  it('should calculate CPI correctly', () => {
    const cpi = calculateCPI({
      earnedValue: 100000,
      actualCost: 90000,
    });

    expect(cpi).toBe(1.11); // 100000 / 90000
  });

  it('should calculate SPI correctly', () => {
    const spi = calculateSPI({
      earnedValue: 100000,
      plannedValue: 110000,
    });

    expect(spi).toBe(0.91); // 100000 / 110000
  });

  it('should calculate EAC with CPI method', () => {
    const eac = calculateEAC({
      budgetAtCompletion: 1000000,
      actualCost: 500000,
      cpi: 0.8,
    });

    expect(eac).toBe(1250000); // 1000000 / 0.8
  });

  it('should generate S-curve data points', () => {
    const sCurve = generateSCurveData({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      budget: 1000000,
    });

    expect(sCurve).toHaveLength(12); // Monthly points
    expect(sCurve[0].plannedValue).toBe(0);
    expect(sCurve[11].plannedValue).toBe(1000000);
  });
});
```

---

### Coverage Targets

| Module | Current | Target | Priority |
|--------|---------|--------|----------|
| Payment Applications | 20% | 80% | P0 |
| Cost Tracking / EVM | 30% | 80% | P0 |
| QuickBooks | 10% | 70% | P1 |
| Bidding | 5% | 60% | P2 |
| Schedule | 15% | 70% | P2 |

---

## 5. QuickBooks Edge Function Tests

**Priority:** P2
**Effort:** 1 week
**Status:** 0/7 functions tested

### Edge Functions to Test

1. `qb-sync-entity` (sync individual entities)
2. `qb-oauth-callback` (OAuth flow)
3. `qb-sync-all` (bulk sync)
4. `qb-webhook` (webhook handler)
5. `qb-refresh-token` (token refresh)
6. `qb-create-invoice` (create invoice)
7. `qb-update-payment` (update payment)

### Test Template

**File:** `supabase/functions/qb-sync-entity/index.test.ts`

```typescript
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

Deno.test('qb-sync-entity handles customer sync', async () => {
  const response = await handler({
    body: JSON.stringify({
      entity_type: 'customer',
      entity_id: 'cust-123',
    }),
  });

  const data = await response.json();

  assertEquals(data.success, true);
  assertEquals(data.qb_id, '1234');
});

Deno.test('qb-sync-entity handles errors gracefully', async () => {
  const response = await handler({
    body: JSON.stringify({
      entity_type: 'invalid',
    }),
  });

  assertEquals(response.status, 400);
});
```

---

## 6. Look-Ahead PDF/Excel Export

**Priority:** P3
**Effort:** 4 hours
**Status:** Feature complete, export missing

### Implementation

**File:** `src/features/look-ahead/utils/export.ts`

```typescript
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export function exportLookAheadToPDF(activities: Activity[]) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('3-Week Look-Ahead Schedule', 20, 20);

  let y = 40;
  activities.forEach((activity, index) => {
    doc.setFontSize(12);
    doc.text(`${index + 1}. ${activity.name}`, 20, y);
    doc.setFontSize(10);
    doc.text(`Start: ${activity.planned_start} | End: ${activity.planned_end}`, 30, y + 6);
    doc.text(`Status: ${activity.status}`, 30, y + 12);
    y += 20;
  });

  doc.save('look-ahead.pdf');
}

export function exportLookAheadToExcel(activities: Activity[]) {
  const data = activities.map(a => ({
    'Activity': a.name,
    'Week': getWeekNumber(a.planned_start),
    'Start Date': a.planned_start,
    'End Date': a.planned_end,
    'Status': a.status,
    'Progress': `${a.progress_percentage}%`,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Look-Ahead');

  XLSX.writeFile(workbook, 'look-ahead.xlsx');
}
```

---

## Summary Timeline

| Feature | Priority | Effort | Timeline |
|---------|----------|--------|----------|
| DocuSign API | P1 | 2-3 days | Week 1 |
| Live Cursors | P1 | 4-6 hours | Week 1 |
| RBAC Tests | P0 | 1-2 days | Week 1 |
| Deepen Tests | P2 | 1-2 weeks | Weeks 2-3 |
| QB Tests | P2 | 1 week | Week 3 |
| Look-Ahead Export | P3 | 4 hours | Anytime |

**Total Time to 99.5%:** 2-3 weeks

---

**Last Updated:** December 12, 2025
