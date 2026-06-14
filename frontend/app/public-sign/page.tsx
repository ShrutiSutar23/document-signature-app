'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import api from '../utils/api';

export default function PublicSignPage() {
  const searchParams = useSearchParams();
  const [docInfo, setDocInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'draw' | 'done'>('draw');
  const [loading, setLoading] = useState(true);
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
    setStep('done');
    alert('Document signed successfully! ✅');
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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4">
        <h1 className="text-xl font-bold text-blue-600">📄 Document Signature App</h1>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        {step === 'draw' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-700">✍️ Sign Document</h2>
            <p className="text-gray-500 text-sm mb-2">Document: <strong>{docInfo?.document_name}</strong></p>
            <p className="text-gray-500 text-sm mb-4">Recipient: <strong>{docInfo?.recipient}</strong></p>

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
              <button onClick={handleSign} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition">
                ✅ Sign Document
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-6xl mb-4">🎉</p>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Document Signed!</h2>
            <p className="text-gray-500">You have successfully signed <strong>{docInfo?.document_name}</strong></p>
            <p className="text-gray-400 text-sm mt-4">You may close this window.</p>
          </div>
        )}
      </div>
    </div>
  );
}