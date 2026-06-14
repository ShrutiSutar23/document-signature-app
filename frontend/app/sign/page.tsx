'use client';
import { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { useRouter, useSearchParams } from 'next/navigation';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

export default function SignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [docId, setDocId] = useState('');
  const [sigX, setSigX] = useState(100);
  const [sigY, setSigY] = useState(100);
  const [dragging, setDragging] = useState(false);
  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = searchParams.get('docId');
    if (id) setDocId(id);
  }, [searchParams]);

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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">📄 Document Signature App</h1>
        <button onClick={() => router.push('/dashboard')} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
          Back to Dashboard
        </button>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
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
            <div>
              <p className="text-gray-600">Top Left Corner</p>
              <p className="font-bold text-gray-800">X: 0, Y: 0</p>
            </div>
            <div>
              <p className="text-gray-600">Bottom Right Corner</p>
              <p className="font-bold text-gray-800">X: {PAGE_WIDTH}, Y: {PAGE_HEIGHT}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Place Signature</h2>
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
            <div className="mt-5">
              <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                Save Signature Position
              </button>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-3">Current Position — X: <strong>{sigX}</strong> Y: <strong>{sigY}</strong></p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Signature Canvas</h2>
          <p className="text-gray-500 text-sm mb-1">Drag the signature box OR type X and Y values above.</p>
          <p className="text-gray-400 text-xs mb-4">Canvas represents A4 page — Width: {PAGE_WIDTH}pts × Height: {PAGE_HEIGHT}pts</p>
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
              className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-auto"
              style={{height: '842px', cursor: dragging ? 'grabbing' : 'default'}}
            >
              <div
                onMouseDown={handleMouseDown}
                style={{position: 'absolute', left: `${(sigX / PAGE_WIDTH) * 100}%`, top: `${(sigY / PAGE_HEIGHT) * 100}%`, cursor: 'grab', userSelect: 'none', transform: 'translate(-50%, -50%)'}}
                className="bg-blue-100 border-2 border-blue-500 rounded px-4 py-2 shadow-md"
              >
                <p className="text-blue-700 font-semibold text-sm">✍️ Signature</p>
                <p className="text-blue-500 text-xs">Drag me!</p>
                <p className="text-blue-400 text-xs">X:{sigX} Y:{sigY}</p>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>X:0, Y:{PAGE_HEIGHT}</span>
              <span>X:{PAGE_WIDTH}, Y:{PAGE_HEIGHT}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}