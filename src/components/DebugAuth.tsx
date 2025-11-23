// Temporary debug component to check auth state
import { useAuth } from '@/lib/auth/AuthContext';

export function DebugAuth() {
  const { user, userProfile, loading } = useAuth();

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#1a1a1a',
      color: '#00ff00',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      maxWidth: '400px',
      zIndex: 9999,
      border: '2px solid #00ff00'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#00ff00' }}>
        🔍 AUTH DEBUG INFO
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>User ID:</strong> {user?.id || 'null'}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>User Email:</strong> {user?.email || 'null'}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Profile Loaded:</strong> {userProfile ? 'Yes' : 'No'}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong style={{ color: userProfile?.company_id ? '#00ff00' : '#ff0000' }}>
          Company ID:
        </strong>{' '}
        {userProfile?.company_id || 'MISSING ❌'}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Role:</strong> {userProfile?.role || 'null'}
      </div>

      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #333' }}>
        <strong>Full Profile:</strong>
        <pre style={{
          marginTop: '8px',
          fontSize: '10px',
          overflow: 'auto',
          maxHeight: '150px'
        }}>
          {JSON.stringify(userProfile, null, 2)}
        </pre>
      </div>
    </div>
  );
}
