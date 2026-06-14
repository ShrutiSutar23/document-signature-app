'use client';
import { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { useRouter, useSearchParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

export default function SignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [docId, setDocId] = useState('');
  const [sigX, setSigX] = useState(300);
  const [sigY, setSigY] = useState(700);
  const [dragging, setDragging] = useState(false);
  const [page, setPage] = useState(1);
  const [signerName, setSignerName] = useState('');
  const [signatureImage, setSignatureImage] = useState('');
  const [step, setStep] = useState<'draw' | 'place'>('draw');
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const id = searchParams.get('docId');
    if (id) setDocId(id);
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setSignerName(payload.sub || 'Signer');
      } catch {
        setSignerName('Signer');
      }
    }
  }, [searchParams]);

  const handleClear = () => {
    sigCanvasRef.current?.clear();
    setSignatureImage('');
  };

  const handleConfirmSignature = () => {
    if (sigCanvasRef.current?.isEmpty()) {
      alert('Please draw your signature first!');
      return;
    }
    const imgData = sigCanvasRef.current?.toDataURL('image/png');
    if (imgData) {
      setSignatureImage(imgData);
      setStep('place');
    }
  };

  const handleMouseDown = () => setDragging(true);
  const handleMouseUp = () => setDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, Math.round(e.clientX - rect.left)), PAGE_WIDTH);
    const y = Math.min(Math.max(0, Math.round(e.clientY - rect.top)), PAGE_HEIGHT);
    setSigX(x);
    setSigY(y);
  };

  const handleXChange = (val: number) => {
    if (isNaN(val)) return;
    setSigX(Math.min(Math.max(0, val), PAGE_WIDTH));
  };

  const handleYChange = (val: number) => {
    if (isNaN(val)) return;
    setSigY(Math.min(Math.max(0, val), PAGE_HEIGHT));
  };

  const handleSave = async () => {
    if (!docId) {
      alert('Please enter a Document ID');
      return;
    }
    try {
      await api.post('/api/signatures', {
        document_id: parseInt(docId),
        x: sigX,
        y: sigY,
        page: page,
      });
      alert('Signature position saved! ✅');
    } catch (err) {
      alert('Failed to save signature. Check document ID.');
    }
  };

  const handleFinalize = async () => {
    if (!docId) {
      alert('Please enter a Document ID');
      return;
    }
    try {
      const response = await api.post(`/api/signatures/finalize/${docId}`);
      alert(`${response.data.message}`);
      router.push('/dashboard');
    } catch (err) {
      alert('Failed to finalize signature.');
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

      <div className="max-w-4xl mx-auto p-6">

        {/* Step 1 - Draw Signature */}
        {step === 'draw' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-700">✍️ Step 1: Draw Your Signature</h2>
            <p className="text-gray-500 text-sm mb-4">Use your mouse or touch to draw your signature below.</p>

            <div className="border-2 border-gray-300 rounded-lg overflow-hidden" style={{width: '100%', height: '200px', background: '#f9f9f9'}}>
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="black"
                canvasProps={{
                  width: 700,
                  height: 200,
                  style: {width: '100%', height: '200px', display: 'block'}
                }}
              />
            </div>

            <div className="flex gap-4 mt-4">
              <button onClick={handleClear} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                🗑️ Clear
              </button>
              <button onClick={handleConfirmSignature} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                ✅ Use This Signature
              </button>
            </div>
          </div>
        )}

        {/* Step 2 - Place Signature */}
        {step === 'place' && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex justify-between items-center">
              <div>
                <p className="text-green-700 font-semibold">✅ Signature drawn successfully!</p>
                <p className="text-green-600 text-sm">Now drag it to position on the document.</p>
              </div>
              <button onClick={() => setStep('draw')} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition text-sm">
                ✏️ Redraw
              </button>
            </div>

            {/* Page Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-blue-700 font-semibold mb-2">📐 Page Dimensions (A4 Standard)</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Page Width</p>
                  <p className="font-bold text-gray-800">Min: 0 — Max: {PAGE_WIDTH} pts</p>
                </div>
                <div>
                  <p className="text-gray-600">Page Height</p>
                  <p className="font-bold text-gray-800">Min: 0 — Max: {PAGE_HEIGHT} pts</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">📌 Step 2: Place Signature</h2>
              <div className="flex gap-4 items-center flex-wrap">
                <div>
                  <label className="text-gray-600 text-sm">Document ID</label>
                  <input type="number" value={docId} onChange={(e) => setDocId(e.target.value)} placeholder="Enter doc ID" className="block border border-gray-300 rounded p-2 mt-1 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-gray-600 text-sm">Page Number</label>
                  <input type="number" value={page} onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) setPage(val); }} min={1} className="block border border-gray-300 rounded p-2 mt-1 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex gap-4 mt-4 items-center flex-wrap">
                <div>
                  <label className="text-gray-600 text-sm">X Coordinate <span className="text-gray-400">(0 to {PAGE_WIDTH})</span></label>
                  <input type="number" value={sigX} min={0} max={PAGE_WIDTH} onChange={(e) => handleXChange(parseInt(e.target.value))} className="block border border-gray-300 rounded p-2 mt-1 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-gray-600 text-sm">Y Coordinate <span className="text-gray-400">(0 to {PAGE_HEIGHT})</span></label>
                  <input type="number" value={sigY} min={0} max={PAGE_HEIGHT} onChange={(e) => handleYChange(parseInt(e.target.value))} className="block border border-gray-300 rounded p-2 mt-1 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <p className="text-gray-500 text-sm mt-3">Current Position — X: <strong>{sigX}</strong> Y: <strong>{sigY}</strong></p>

              <div className="flex gap-4 mt-4">
                <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                  💾 Save Position
                </button>
                <button onClick={handleFinalize} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition">
                  ✍️ Finalize & Sign PDF
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2 text-gray-700">Signature Canvas</h2>
              <p className="text-gray-500 text-sm mb-4">Drag your signature to the desired position.</p>
              <div className="relative">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>X:0, Y:0</span>
                  <span>X:{PAGE_WIDTH}, Y:0</span>
                </div>
                <div
                  ref={containerRef}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="relative bg-white border-2 border-gray-300 rounded-lg"
                  style={{height: '842px', cursor: dragging ? 'grabbing' : 'default', backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px'}}
                >
                  {/* Draggable Signature */}
                  <div
                    onMouseDown={handleMouseDown}
                    style={{
                      position: 'absolute',
                      left: `${(sigX / PAGE_WIDTH) * 100}%`,
                      top: `${(sigY / PAGE_HEIGHT) * 100}%`,
                      cursor: 'grab',
                      userSelect: 'none',
                      transform: 'translate(-50%, -50%)',
                      minWidth: '180px'
                    }}
                    className="border-2 border-black rounded bg-white shadow-md p-1"
                  >
                    {signatureImage && (
                      <img src={signatureImage} alt="signature" style={{width: '160px', height: '50px', objectFit: 'contain'}} />
                    )}
                    <p className="text-black text-xs text-center border-t border-gray-300 mt-1 pt-1">
                      {signerName} | {today}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>X:0, Y:{PAGE_HEIGHT}</span>
                  <span>X:{PAGE_WIDTH}, Y:{PAGE_HEIGHT}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}