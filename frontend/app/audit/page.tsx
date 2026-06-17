'use client';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useRouter } from 'next/navigation';

interface AuditLog {
  id: number;
  user_id: number;
  document_id: number | null;
  action: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/api/audit');
      setLogs(response.data);
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'document_signed': return 'bg-green-100 text-green-700';
      case 'document_uploaded': return 'bg-blue-100 text-blue-700';
      case 'user_login': return 'bg-yellow-100 text-yellow-700';
      case 'user_registered': return 'bg-purple-100 text-purple-700';
      case 'signature_placed': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'document_signed': return '✍️';
      case 'document_uploaded': return '📄';
      case 'user_login': return '🔑';
      case 'user_registered': return '👤';
      case 'signature_placed': return '📌';
      default: return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">📄 Document Signature App</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
        >
          Back to Dashboard
        </button>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-6 text-gray-700">📋 Audit Trail</h2>

          {loading ? (
            <p className="text-gray-500">Loading audit logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-500">No audit logs found.</p>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getActionIcon(log.action)}</span>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <p className="text-gray-600 text-sm mt-1">{log.details}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <p>{formatDate(log.created_at)}</p>
                      <p>IP: {log.ip_address || 'N/A'}</p>
                      {log.document_id && <p>Doc ID: {log.document_id}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}