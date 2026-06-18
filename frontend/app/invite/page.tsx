'use client';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useRouter, useSearchParams } from 'next/navigation';

interface Invite {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [docId, setDocId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('signer');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const id = searchParams.get('docId');
    if (id) {
      setDocId(id);
      fetchInvites(id);
    }
  }, [searchParams]);

  const fetchInvites = async (id: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/invites/${id}`);
      setInvites(response.data);
    } catch (err) {
      console.error('Failed to fetch invites');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!name || !email || !docId) {
      alert('Please fill in all fields!');
      return;
    }
    setSending(true);
    try {
      await api.post('/api/invites', {
        document_id: parseInt(docId),
        name,
        email,
        role
      });
      alert(`Invite sent to ${email} as ${role}! ✅`);
      setName('');
      setEmail('');
      setRole('signer');
      fetchInvites(docId);
    } catch (err) {
      alert('Failed to send invite. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'signer': return 'bg-blue-100 text-blue-700';
      case 'validator': return 'bg-green-100 text-green-700';
      case 'witness': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'signer': return '✍️';
      case 'validator': return '✅';
      case 'witness': return '👁️';
      default: return '👤';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">📄 Document Signature App</h1>
        <button onClick={() => router.push('/dashboard')} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
          Back to Dashboard
        </button>
      </nav>

      <div className="max-w-3xl mx-auto p-6">
        {/* Invite Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">👥 Invite People to Sign</h2>
          <p className="text-gray-500 text-sm mb-4">Document ID: <strong>{docId}</strong></p>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-gray-600 text-sm font-medium">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                className="block w-full border border-gray-300 rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-gray-600 text-sm font-medium">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="block w-full border border-gray-300 rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-gray-600 text-sm font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="block w-full border border-gray-300 rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="signer">✍️ Signer — Signs the document</option>
                <option value="validator">✅ Validator — Approves the signature</option>
                <option value="witness">👁️ Witness — Witnesses the signing</option>
              </select>
            </div>
          </div>

          {/* Role descriptions */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
              <p className="text-2xl">✍️</p>
              <p className="text-blue-700 font-semibold text-sm">Signer</p>
              <p className="text-blue-500 text-xs mt-1">Draws and signs the document</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
              <p className="text-2xl">✅</p>
              <p className="text-green-700 font-semibold text-sm">Validator</p>
              <p className="text-green-500 text-xs mt-1">Approves or rejects the signature</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded p-3 text-center">
              <p className="text-2xl">👁️</p>
              <p className="text-purple-700 font-semibold text-sm">Witness</p>
              <p className="text-purple-500 text-xs mt-1">Witnesses the signing process</p>
            </div>
          </div>

          <button
            onClick={handleSendInvite}
            disabled={sending}
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition"
          >
            {sending ? 'Sending...' : '📧 Send Invite'}
          </button>
        </div>

        {/* Invites List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">📋 Sent Invites</h2>
          {loading ? (
            <p className="text-gray-500">Loading invites...</p>
          ) : invites.length === 0 ? (
            <p className="text-gray-500">No invites sent yet.</p>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getRoleIcon(invite.role)}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{invite.name}</p>
                      <p className="text-gray-500 text-sm">{invite.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(invite.role)}`}>
                      {invite.role}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(invite.status)}`}>
                      {invite.status}
                    </span>
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