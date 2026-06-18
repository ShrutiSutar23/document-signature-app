'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import api from '../utils/api';

export default function PublicSignPage() {
  const searchParams = useSearchParams();
  const [docInfo, setDocInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'action' | 'done'>('action');
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid signing link');
      setLoading(false);
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await api.get(`/api/public/verify-token/${token}`);
      setDocInfo(response.data);
    } catch (err) {
      setError('Invalid or expired signing link');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => sigCanvasRef.current?.clear();

  const handleSign = async () => {
    if (sigCanvasRef.current?.isEmpty()) {
      alert('Please draw your signature first!');
      return;
    }
    try {
      await api.post('/api/public/complete-action', {
        token: token,
        status: 'signed'
      });
    } catch (err) {
      console.error('Failed to update status');
    }
    setStep('done');
  };

  const handleApprove = async () => {
    try {
      await api.post('/api/public/complete-action', {
        token: token,
        status: 'approved'
      });
    } catch (err) {
      console.error('Failed to update status');
    }
    setStep('done');
  };

  const handleReject = async () => {
    if (!rejectReason) {
      alert('Please enter a rejection reason!');
      return;
    }
    try {
      await api.post('/api/public/complete-action', {
        token: token,
        status: 'rejected',
        rejection_reason: rejectReason
      });
    } catch (err) {
      console.error('Failed to update status');
    }
    setStep('done');
  };

  const handleWitness = async () => {
    try {
      await api.post('/api/public/complete-action', {
        token: token,
        status: 'witnessed'
      });
    } catch (err) {
      console.error('Failed to update status');
    }
    setStep('done');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Verifying signing link...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <p className="text-red-600 text-xl font-semibold">❌ {error}</p>
        <p className="text-gray-500 mt-2">This link may have expired or is invalid.</p>
      </div>
    </div>
  );

  const role = docInfo?.role || 'signer';

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4">
        <h1 className="text-xl font-bold text-blue-600">📄 Document Signature App</h1>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        {step === 'action' && (
          <div className="bg-white rounded-lg shadow p-6">

            {/* Document Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-600 text-sm">Document: <strong>{docInfo?.document_name}</strong></p>
              <p className="text-gray-600 text-sm">Recipient: <strong>{docInfo?.recipient}</strong></p>
              <p className="text-gray-600 text-sm">Role:
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  role === 'signer' ? 'bg-blue-100 text-blue-700' :
                  role === 'validator' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {role === 'signer' ? '✍️ Signer' : role === 'validator' ? '✅ Validator' : '👁️ Witness'}
                </span>
              </p>
            </div>

            {/* SIGNER UI */}
            {role === 'signer' && (
              <>
                <h2 className="text-lg font-semibold mb-2 text-gray-700">✍️ Draw Your Signature</h2>
                <p className="text-gray-500 text-sm mb-4">Use your mouse or touch to draw your signature below.</p>
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden mb-4">
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="black"
                    canvasProps={{
                      style: {width: '100%', height: '200px', display: 'block'}
                    }}
                  />
                </div>
                <div className="flex gap-4">
                  <button onClick={handleClear} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                    🗑️ Clear
                  </button>
                  <button onClick={handleSign} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                    ✅ Sign Document
                  </button>
                </div>
              </>
            )}

            {/* VALIDATOR UI */}
            {role === 'validator' && (
              <>
                <h2 className="text-lg font-semibold mb-2 text-gray-700">✅ Validate Document</h2>
                <p className="text-gray-500 text-sm mb-6">As a validator, you can approve or reject this document signing request.</p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-700 font-semibold">⚠️ Your Responsibility</p>
                  <p className="text-yellow-600 text-sm mt-1">By approving, you confirm that this document is valid and ready to be signed.</p>
                </div>

                {!showReject ? (
                  <div className="flex gap-4">
                    <button onClick={handleApprove} className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition font-semibold">
                      ✅ Approve Document
                    </button>
                    <button onClick={() => setShowReject(true)} className="bg-red-500 text-white px-6 py-3 rounded hover:bg-red-600 transition font-semibold">
                      ❌ Reject Document
                    </button>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Enter rejection reason..."
                      className="w-full border border-gray-300 rounded p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={3}
                    />
                    <div className="flex gap-4">
                      <button onClick={handleReject} className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition">
                        Confirm Reject
                      </button>
                      <button onClick={() => setShowReject(false)} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition">
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* WITNESS UI */}
            {role === 'witness' && (
              <>
                <h2 className="text-lg font-semibold mb-2 text-gray-700">👁️ Witness Document Signing</h2>
                <p className="text-gray-500 text-sm mb-6">As a witness, you confirm that you have observed this document signing process.</p>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <p className="text-purple-700 font-semibold">👁️ Your Responsibility</p>
                  <p className="text-purple-600 text-sm mt-1">By confirming, you acknowledge that you have witnessed this document being signed.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                  <p className="text-gray-600 text-sm font-semibold mb-2">I hereby confirm that:</p>
                  <ul className="text-gray-500 text-sm space-y-1">
                    <li>✅ I have witnessed the signing of <strong>{docInfo?.document_name}</strong></li>
                    <li>✅ I confirm the identity of the signer</li>
                    <li>✅ I am acting as a legal witness</li>
                  </ul>
                </div>

                <button onClick={handleWitness} className="w-full bg-purple-600 text-white py-3 rounded font-semibold hover:bg-purple-700 transition">
                  👁️ Confirm as Witness
                </button>
              </>
            )}
          </div>
        )}

        {/* Done Page */}
        {step === 'done' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-6xl mb-4">🎉</p>
            <h2 className="text-2xl font-bold mb-2" style={{
              color: role === 'signer' ? '#2563eb' : role === 'validator' ? '#16a34a' : '#9333ea'
            }}>
              {role === 'signer' && 'Document Signed!'}
              {role === 'validator' && 'Document Validated!'}
              {role === 'witness' && 'Witnessed Successfully!'}
            </h2>
            <p className="text-gray-500">
              {role === 'signer' && `You have successfully signed ${docInfo?.document_name}`}
              {role === 'validator' && `You have validated ${docInfo?.document_name}`}
              {role === 'witness' && `You have witnessed the signing of ${docInfo?.document_name}`}
            </p>
            <p className="text-gray-400 text-sm mt-4">You may close this window.</p>
          </div>
        )}
      </div>
    </div>
  );
}