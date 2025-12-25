/**
 * DocuSign Factory
 * Creates mock DocuSign data for testing
 */

import { faker } from '@faker-js/faker';
import type {
  DSEnvelopeStatus,
  DSRecipientStatus,
  DSRecipientType,
  DSDocumentType,
  DSConnection,
  DSEnvelope,
  DSEnvelopeRecipient,
  DSEnvelopeDocument,
  DSEnvelopeEvent,
  DSConnectionStatus,
  DSEnvelopeStats,
  DSOAuthTokens,
  DSUserInfo,
  DSAccountInfo,
} from '@/types/docusign';

// Factory options
export interface DSConnectionFactoryOptions {
  id?: string;
  company_id?: string;
  account_id?: string;
  account_name?: string;
  is_demo?: boolean;
  is_active?: boolean;
  connection_error?: string | null;
}

export interface DSEnvelopeFactoryOptions {
  id?: string;
  company_id?: string;
  connection_id?: string;
  envelope_id?: string;
  document_type?: DSDocumentType;
  local_document_id?: string;
  status?: DSEnvelopeStatus;
  subject?: string;
  created_by?: string;
}

export interface DSRecipientFactoryOptions {
  id?: string;
  envelope_db_id?: string;
  recipient_id?: string;
  recipient_type?: DSRecipientType;
  email?: string;
  name?: string;
  status?: DSRecipientStatus;
  routing_order?: number;
}

export interface DSEnvelopeDocumentFactoryOptions {
  id?: string;
  envelope_db_id?: string;
  document_id?: string;
  name?: string;
  order?: number;
}

/**
 * Create a mock DocuSign connection
 */
export function createMockDSConnection(options: DSConnectionFactoryOptions = {}): DSConnection {
  const id = options.id ?? faker.string.uuid();
  const createdAt = faker.date.past().toISOString();
  const isActive = options.is_active ?? true;
  const isDemo = options.is_demo ?? false;

  // Generate token expiry (1 hour from now if active)
  const tokenExpiresAt = isActive
    ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
    : null;

  return {
    id,
    company_id: options.company_id ?? faker.string.uuid(),
    account_id: options.account_id ?? faker.string.alphanumeric(32),
    account_name: options.account_name ?? `${faker.company.name()} DocuSign Account`,
    base_uri: isDemo
      ? 'https://demo.docusign.net'
      : 'https://na4.docusign.net',
    access_token: isActive ? `mock-access-token-${faker.string.alphanumeric(64)}` : null,
    refresh_token: isActive ? `mock-refresh-token-${faker.string.alphanumeric(64)}` : null,
    token_expires_at: tokenExpiresAt,
    is_demo: isDemo,
    is_active: isActive,
    last_connected_at: isActive ? faker.date.recent().toISOString() : null,
    connection_error: options.connection_error ?? null,
    webhook_uri: `https://api.example.com/webhooks/docusign/${id}`,
    webhook_secret: faker.string.alphanumeric(32),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
    created_by: faker.string.uuid(),
  };
}

/**
 * Create a mock DocuSign envelope
 */
export function createMockDSEnvelope(options: DSEnvelopeFactoryOptions = {}): DSEnvelope {
  const id = options.id ?? faker.string.uuid();
  const createdAt = faker.date.past().toISOString();
  const status = options.status ?? faker.helpers.arrayElement([
    'created', 'sent', 'delivered', 'signed', 'completed', 'declined', 'voided'
  ] as DSEnvelopeStatus[]);

  const documentType = options.document_type ?? faker.helpers.arrayElement([
    'payment_application', 'change_order', 'lien_waiver', 'contract', 'subcontract', 'other'
  ] as DSDocumentType[]);

  // Set dates based on status
  const sentAt = ['sent', 'delivered', 'signed', 'completed', 'declined'].includes(status)
    ? faker.date.recent().toISOString()
    : null;

  const completedAt = status === 'completed'
    ? faker.date.recent().toISOString()
    : null;

  const voidedAt = status === 'voided'
    ? faker.date.recent().toISOString()
    : null;

  return {
    id,
    company_id: options.company_id ?? faker.string.uuid(),
    connection_id: options.connection_id ?? faker.string.uuid(),
    envelope_id: options.envelope_id ?? faker.string.uuid(),
    document_type: documentType,
    local_document_id: options.local_document_id ?? faker.string.uuid(),
    local_document_number: `DOC-${faker.string.numeric(6)}`,
    status,
    subject: options.subject ?? `${faker.helpers.arrayElement(['Payment Application', 'Change Order', 'Lien Waiver', 'Contract'])} - ${faker.company.name()}`,
    message: faker.lorem.sentence(),
    sent_at: sentAt,
    completed_at: completedAt,
    voided_at: voidedAt,
    void_reason: status === 'voided' ? faker.lorem.sentence() : null,
    expires_at: faker.date.future().toISOString(),
    signing_order_enabled: faker.datatype.boolean(),
    reminder_enabled: faker.datatype.boolean(),
    reminder_delay_days: faker.number.int({ min: 1, max: 7 }),
    reminder_frequency_days: faker.number.int({ min: 1, max: 5 }),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
    created_by: options.created_by ?? faker.string.uuid(),
    recipients: undefined,
    documents: undefined,
  };
}

/**
 * Create a mock envelope recipient
 */
export function createMockDSRecipient(options: DSRecipientFactoryOptions = {}): DSEnvelopeRecipient {
  const id = options.id ?? faker.string.uuid();
  const createdAt = faker.date.past().toISOString();
  const status = options.status ?? faker.helpers.arrayElement([
    'created', 'sent', 'delivered', 'signed', 'completed', 'declined'
  ] as DSRecipientStatus[]);

  const recipientType = options.recipient_type ?? faker.helpers.arrayElement([
    'signer', 'cc', 'certifiedDelivery'
  ] as DSRecipientType[]);

  // Set dates based on status
  const signedAt = status === 'signed' || status === 'completed'
    ? faker.date.recent().toISOString()
    : null;

  const declinedAt = status === 'declined'
    ? faker.date.recent().toISOString()
    : null;

  const deliveredAt = ['delivered', 'signed', 'completed'].includes(status)
    ? faker.date.recent().toISOString()
    : null;

  return {
    id,
    envelope_db_id: options.envelope_db_id ?? faker.string.uuid(),
    recipient_id: options.recipient_id ?? faker.string.numeric(8),
    recipient_type: recipientType,
    email: options.email ?? faker.internet.email(),
    name: options.name ?? faker.person.fullName(),
    role_name: faker.helpers.arrayElement([
      'Contractor', 'Owner', 'Architect', 'Subcontractor', 'Project Manager'
    ]),
    routing_order: options.routing_order ?? faker.number.int({ min: 1, max: 5 }),
    status,
    signed_at: signedAt,
    declined_at: declinedAt,
    decline_reason: status === 'declined' ? faker.lorem.sentence() : null,
    delivered_at: deliveredAt,
    client_user_id: null,
    user_id: faker.datatype.boolean() ? faker.string.uuid() : null,
    authentication_method: faker.helpers.arrayElement(['none', 'email', 'phone']),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
  };
}

/**
 * Create a mock envelope document
 */
export function createMockDSEnvelopeDocument(options: DSEnvelopeDocumentFactoryOptions = {}): DSEnvelopeDocument {
  return {
    id: options.id ?? faker.string.uuid(),
    envelope_db_id: options.envelope_db_id ?? faker.string.uuid(),
    document_id: options.document_id ?? faker.string.numeric(4),
    name: options.name ?? `${faker.lorem.words(3)}.pdf`,
    file_extension: 'pdf',
    uri: `/documents/${faker.string.numeric(4)}`,
    order: options.order ?? 1,
    pages: faker.number.int({ min: 1, max: 20 }),
    created_at: faker.date.past().toISOString(),
  };
}

/**
 * Create a mock envelope event
 */
export function createMockDSEnvelopeEvent(options: {
  id?: string;
  envelope_db_id?: string;
  event_type?: string;
} = {}): DSEnvelopeEvent {
  const eventTypes = [
    'envelope-sent',
    'envelope-delivered',
    'envelope-completed',
    'envelope-declined',
    'envelope-voided',
    'recipient-sent',
    'recipient-delivered',
    'recipient-completed',
    'recipient-declined',
    'recipient-autoresponded',
  ];

  return {
    id: options.id ?? faker.string.uuid(),
    envelope_db_id: options.envelope_db_id ?? faker.string.uuid(),
    event_type: options.event_type ?? faker.helpers.arrayElement(eventTypes),
    event_time: faker.date.recent().toISOString(),
    recipient_email: faker.internet.email(),
    recipient_name: faker.person.fullName(),
    ip_address: faker.internet.ip(),
    user_agent: faker.internet.userAgent(),
    details: {
      action: faker.helpers.arrayElement(['viewed', 'signed', 'declined', 'sent']),
    },
    created_at: faker.date.recent().toISOString(),
  };
}

/**
 * Create a mock connection status
 */
export function createMockDSConnectionStatus(options: {
  isConnected?: boolean;
  isDemo?: boolean;
  needsReauth?: boolean;
  connectionError?: string | null;
} = {}): DSConnectionStatus {
  const isConnected = options.isConnected ?? true;
  const tokenExpiresAt = isConnected
    ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
    : null;

  return {
    isConnected,
    connectionId: isConnected ? faker.string.uuid() : null,
    accountId: isConnected ? faker.string.alphanumeric(32) : null,
    accountName: isConnected ? `${faker.company.name()} DocuSign Account` : null,
    isDemo: options.isDemo ?? false,
    lastConnectedAt: isConnected ? faker.date.recent().toISOString() : null,
    tokenExpiresAt,
    isTokenExpired: false,
    needsReauth: options.needsReauth ?? false,
    connectionError: options.connectionError ?? null,
  };
}

/**
 * Create mock envelope statistics
 */
export function createMockDSEnvelopeStats(): DSEnvelopeStats {
  const total = faker.number.int({ min: 10, max: 200 });
  const completed = faker.number.int({ min: 0, max: total });
  const pending = total - completed;

  return {
    total,
    pending,
    sent: faker.number.int({ min: 0, max: pending }),
    delivered: faker.number.int({ min: 0, max: pending }),
    signed: faker.number.int({ min: 0, max: pending }),
    completed,
    declined: faker.number.int({ min: 0, max: 10 }),
    voided: faker.number.int({ min: 0, max: 5 }),
    byDocumentType: {
      payment_application: {
        total: faker.number.int({ min: 5, max: 50 }),
        pending: faker.number.int({ min: 0, max: 10 }),
        completed: faker.number.int({ min: 5, max: 40 }),
      },
      change_order: {
        total: faker.number.int({ min: 5, max: 30 }),
        pending: faker.number.int({ min: 0, max: 10 }),
        completed: faker.number.int({ min: 5, max: 20 }),
      },
      lien_waiver: {
        total: faker.number.int({ min: 10, max: 100 }),
        pending: faker.number.int({ min: 0, max: 20 }),
        completed: faker.number.int({ min: 10, max: 80 }),
      },
      contract: {
        total: faker.number.int({ min: 1, max: 10 }),
        pending: faker.number.int({ min: 0, max: 2 }),
        completed: faker.number.int({ min: 1, max: 8 }),
      },
      subcontract: {
        total: faker.number.int({ min: 5, max: 30 }),
        pending: faker.number.int({ min: 0, max: 5 }),
        completed: faker.number.int({ min: 5, max: 25 }),
      },
      other: {
        total: faker.number.int({ min: 1, max: 20 }),
        pending: faker.number.int({ min: 0, max: 5 }),
        completed: faker.number.int({ min: 1, max: 15 }),
      },
    },
  };
}

/**
 * Create mock OAuth tokens
 */
export function createMockDSOAuthTokens(): DSOAuthTokens {
  return {
    access_token: `mock-access-token-${faker.string.alphanumeric(64)}`,
    refresh_token: `mock-refresh-token-${faker.string.alphanumeric(64)}`,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'signature impersonation',
  };
}

/**
 * Create mock user info
 */
export function createMockDSUserInfo(): DSUserInfo {
  const accountId = faker.string.alphanumeric(32);

  return {
    sub: faker.string.uuid(),
    name: faker.person.fullName(),
    given_name: faker.person.firstName(),
    family_name: faker.person.lastName(),
    email: faker.internet.email(),
    accounts: [
      {
        account_id: accountId,
        account_name: `${faker.company.name()} DocuSign Account`,
        base_uri: 'https://na4.docusign.net',
        is_default: true,
      },
    ],
  };
}

/**
 * Create mock account info
 */
export function createMockDSAccountInfo(): DSAccountInfo {
  return {
    account_id: faker.string.alphanumeric(32),
    account_name: `${faker.company.name()} DocuSign Account`,
    base_uri: 'https://na4.docusign.net',
    is_default: true,
  };
}

/**
 * Create an active DocuSign connection
 */
export function createMockActiveDSConnection(options: Omit<DSConnectionFactoryOptions, 'is_active'> = {}): DSConnection {
  return createMockDSConnection({ ...options, is_active: true });
}

/**
 * Create an inactive DocuSign connection
 */
export function createMockInactiveDSConnection(options: Omit<DSConnectionFactoryOptions, 'is_active'> = {}): DSConnection {
  return createMockDSConnection({ ...options, is_active: false });
}

/**
 * Create a demo DocuSign connection
 */
export function createMockDemoDSConnection(options: Omit<DSConnectionFactoryOptions, 'is_demo'> = {}): DSConnection {
  return createMockDSConnection({ ...options, is_demo: true });
}

/**
 * Create a connection with error
 */
export function createMockErrorDSConnection(errorMessage: string = 'Token expired'): DSConnection {
  return createMockDSConnection({
    is_active: false,
    connection_error: errorMessage,
  });
}

/**
 * Create a completed envelope
 */
export function createMockCompletedDSEnvelope(options: Omit<DSEnvelopeFactoryOptions, 'status'> = {}): DSEnvelope {
  return createMockDSEnvelope({ ...options, status: 'completed' });
}

/**
 * Create a pending envelope
 */
export function createMockPendingDSEnvelope(options: Omit<DSEnvelopeFactoryOptions, 'status'> = {}): DSEnvelope {
  return createMockDSEnvelope({ ...options, status: 'sent' });
}

/**
 * Create a declined envelope
 */
export function createMockDeclinedDSEnvelope(options: Omit<DSEnvelopeFactoryOptions, 'status'> = {}): DSEnvelope {
  return createMockDSEnvelope({ ...options, status: 'declined' });
}

/**
 * Create multiple mock envelopes
 */
export function createMockDSEnvelopes(count: number, options: DSEnvelopeFactoryOptions = {}): DSEnvelope[] {
  return Array.from({ length: count }, () => createMockDSEnvelope(options));
}

/**
 * Create an envelope with recipients and documents
 */
export function createMockDSEnvelopeWithDetails(options: DSEnvelopeFactoryOptions = {}): {
  envelope: DSEnvelope;
  recipients: DSEnvelopeRecipient[];
  documents: DSEnvelopeDocument[];
  events: DSEnvelopeEvent[];
} {
  const envelope = createMockDSEnvelope(options);
  const recipientCount = faker.number.int({ min: 1, max: 4 });

  const recipients = Array.from({ length: recipientCount }, (_, index) =>
    createMockDSRecipient({
      envelope_db_id: envelope.id,
      routing_order: index + 1,
      recipient_type: index === 0 ? 'signer' : faker.helpers.arrayElement(['signer', 'cc']),
    })
  );

  const documents = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, (_, index) =>
    createMockDSEnvelopeDocument({
      envelope_db_id: envelope.id,
      order: index + 1,
    })
  );

  const events = Array.from({ length: faker.number.int({ min: 2, max: 10 }) }, () =>
    createMockDSEnvelopeEvent({
      envelope_db_id: envelope.id,
    })
  );

  return {
    envelope: {
      ...envelope,
      recipients,
      documents,
    },
    recipients,
    documents,
    events,
  };
}

// Default test DocuSign data for consistent testing
export const TEST_DOCUSIGN = {
  connection: createMockDSConnection({
    id: 'test-ds-connection',
    company_id: 'test-company-id',
    account_id: 'test-account-id',
    account_name: 'Test DocuSign Account',
    is_demo: true,
    is_active: true,
  }),
  envelope: {
    paymentApp: createMockDSEnvelope({
      id: 'test-envelope-payment',
      company_id: 'test-company-id',
      document_type: 'payment_application',
      status: 'sent',
      subject: 'Payment Application #1',
    }),
    changeOrder: createMockDSEnvelope({
      id: 'test-envelope-co',
      company_id: 'test-company-id',
      document_type: 'change_order',
      status: 'completed',
      subject: 'Change Order #1',
    }),
    lienWaiver: createMockDSEnvelope({
      id: 'test-envelope-lw',
      company_id: 'test-company-id',
      document_type: 'lien_waiver',
      status: 'delivered',
      subject: 'Lien Waiver - ABC Contractor',
    }),
  },
  recipient: {
    signer: createMockDSRecipient({
      id: 'test-recipient-signer',
      recipient_type: 'signer',
      email: 'signer@test.com',
      name: 'Test Signer',
      status: 'delivered',
    }),
    cc: createMockDSRecipient({
      id: 'test-recipient-cc',
      recipient_type: 'cc',
      email: 'cc@test.com',
      name: 'Test CC',
      status: 'completed',
    }),
  },
};
