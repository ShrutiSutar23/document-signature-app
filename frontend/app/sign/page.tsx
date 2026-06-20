'use client';
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import api from '../utils/api';
import { useRouter, useSearchParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const Document = dynamic(() => import('react-pdf').then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

interface DraggableItem {
  id: string;
  type: 'signature' | 'name' | 'date';
  x: number;
  y: number;
  visible: boolean;
  onPdf: boolean;
}

export default function SignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docIdParam = searchParams.get('docId') || '';
  const [docId, setDocId] = useState('');
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [signerName, setSignerName] = useState('');
  const [signatureImage, setSignatureImage] = useState('');
  const [step, setStep] = useState<'draw' | 'place'>('draw');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [token, setToken] = useState('');
  const [pdfFile, setPdfFile] = useState<{ url: string; httpHeaders: { Authorization: string } } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [items, setItems] = useState<DraggableItem[]>([
    { id: 'signature', type: 'signature', x: 100, y: 100, visible: true },
    { id: 'name', type: 'name', x: 100, y: 200, visible: true },
    { id: 'date', type: 'date', x: 100, y: 300, visible: true },
  ]);
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];

  const [pdfLoaded, setPdfLoaded] = useState(false);

  useEffect(() => {
    if (docIdParam) {
      setDocId(docIdParam);
      setPdfUrl(`http://127.0.0.1:8000/api/docs/file/${docIdParam}`);
    }

    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        const username = payload.name;
        if (username) {
          setSignerName(username);
        } else {
          api.get('/api/auth/me')
            .then((response) => setSignerName(response.data.name || 'Signer'))
            .catch(() => setSignerName('Signer'));
        }
      } catch {
        setSignerName('Signer');
      }
    }

    import('react-pdf').then((pdf) => {
      pdf.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdf.pdfjs.version}/build/pdf.worker.min.mjs`;
      setPdfLoaded(true);
    });
  }, [docIdParam]);

  useEffect(() => {
    if (pdfUrl && token) {
      setPdfFile((previous) => {
        const authorization = `Bearer ${token}`;
        if (
          previous?.url === pdfUrl &&
          previous.httpHeaders.Authorization === authorization
        ) {
          return previous;
        }
        return {
          url: pdfUrl,
          httpHeaders: {
            Authorization: authorization,
          },
        };
      });
    } else {
      setPdfFile(null);
    }
  }, [pdfUrl, token]);

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

  const handleMouseDown = (id: string) => setDraggingId(id);
  const handleMouseUp = () => setDraggingId(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, Math.round(e.clientX - rect.left)), PAGE_WIDTH);
    const y = Math.min(Math.max(0, Math.round(e.clientY - rect.top)), PAGE_HEIGHT);
    setItems(prev => prev.map(item =>
      item.id === draggingId ? { ...item, x, y } : item
    ));
  };

  const toggleVisible = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, visible: !item.visible } : item
    ));
  };

  const handleSave = async () => {
    if (!docId) {
      alert('Please enter a Document ID');
      return;
    }
    const sigItem = items.find(i => i.id === 'signature');
    try {
      await api.post('/api/signatures', {
        document_id: parseInt(docId),
        x: sigItem?.x || 100,
        y: sigItem?.y || 100,
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
      const config: Record<string, any> = {};
      if (usePassword && password) {
        config.params = { password };
      }

      const response = await api.post(`/api/signatures/finalize/${parseInt(docId)}`, null, config);

      if (usePassword && password) {
        alert(`Document signed & password protected! 🔒\nPassword: ${password}`);
      } else {
        alert(`${response.data.message}`);
      }
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Finalize failed:', err);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to finalize signature.';
      alert(errorMessage);
    }
  };

  const getItemContent = (item: DraggableItem) => {
    switch (item.type) {
      case 'signature':
        return signatureImage ? (
          <img src={signatureImage} alt="signature" style={{width: '160px', height: '50px', objectFit: 'contain'}} />
        ) : (
          <p className="text-gray-400 text-xs text-center px-4 py-2">✍️ Signature</p>
        );
      case 'name':
        return <p className="text-black text-sm font-semibold px-3 py-1">👤 {signerName}</p>;
      case 'date':
        return <p className="text-black text-sm px-3 py-1">📅 {today}</p>;
    }
  };

  const getItemLabel = (type: string) => {
    switch (type) {
      case 'signature': return '✍️ Signature';
      case 'name': return '👤 Signed By';
      case 'date': return '📅 Date';
      default: return type;
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
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden" style={{width: '100%', background: '#f9f9f9'}}>
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="black"
                canvasProps={{style: {width: '100%', height: '200px', display: 'block'}}}
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
                <p className="text-green-600 text-sm">Drag elements individually on the PDF.</p>
              </div>
              <button onClick={() => setStep('draw')} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition text-sm">
                ✏️ Redraw
              </button>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">📌 Step 2: Place Elements on PDF</h2>

              {/* Toggle visibility */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <p className="text-gray-600 text-sm font-medium w-full">Show/Hide elements:</p>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleVisible(item.id)}
                    className={`px-3 py-1 rounded text-sm font-medium border transition ${
                      item.visible
                        ? 'bg-blue-100 border-blue-400 text-blue-700'
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}
                  >
                    {item.visible ? '✅' : '❌'} {getItemLabel(item.type)}
                  </button>
                ))}
              </div>

              {/* Positions */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                {items.map(item => (
                  <div key={item.id} className="bg-gray-50 rounded p-3">
                    <p className="text-gray-600 text-xs font-medium mb-1">{getItemLabel(item.type)}</p>
                    <p className="text-gray-500 text-xs">X: {item.x} Y: {item.y}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 items-center flex-wrap mb-4">
                <div>
                  <label className="text-gray-600 text-sm">Page Number</label>
                  <input type="number" value={page} onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) setPage(val); }} min={1} max={numPages} className="block border border-gray-300 rounded p-2 mt-1 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {numPages > 0 && <p className="text-gray-400 text-xs mt-1">Total: {numPages} pages</p>}
                </div>
              </div>

              {/* Password Protection */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <input type="checkbox" id="usePassword" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} className="w-4 h-4" />
                  <label htmlFor="usePassword" className="text-gray-600 text-sm font-medium">🔒 Password protect the signed PDF</label>
                </div>
                {usePassword && (
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password for PDF" className="block border border-gray-300 rounded p-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                  💾 Save Position
                </button>
                <button onClick={handleFinalize} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition">
                  {usePassword ? '🔒 Sign & Password Protect' : '✍️ Finalize & Sign PDF'}
                </button>
              </div>
            </div>

            {/* PDF Canvas with sidebar */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2 text-gray-700">📄 Document</h2>
              <p className="text-gray-500 text-sm mb-4">Drag elements from the right panel onto the PDF.</p>

              <div className="flex gap-4">
                {/* PDF Area */}
                <div
                  ref={containerRef}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="relative border-2 border-gray-300 rounded-lg overflow-hidden flex-1"
                  style={{cursor: draggingId ? 'grabbing' : 'default'}}
                >
                  {/* Actual PDF */}
                  {pdfLoaded && pdfFile ? (
                    <Document
                      file={pdfFile}
                      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    >
                      <Page pageNumber={page} width={500} renderTextLayer={true} renderAnnotationLayer={true} />
                    </Document>
                  ) : (
                    <div className="flex h-[842px] items-center justify-center text-gray-500">
                      Loading PDF preview...
                    </div>
                  )}

                  {/* Draggable Elements on PDF */}
                  {items.filter(item => item.visible && item.onPdf).map(item => (
                    <div
                      key={item.id}
                      onMouseDown={() => handleMouseDown(item.id)}
                      style={{
                        position: 'absolute',
                        left: `${(item.x / PAGE_WIDTH) * 100}%`,
                        top: `${(item.y / PAGE_HEIGHT) * 100}%`,
                        cursor: 'grab',
                        userSelect: 'none',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                      }}
                    >
                      {getItemContent(item)}
                    </div>
                  ))}
                </div>

                {/* Right Sidebar */}
                <div className="w-48 flex flex-col gap-3">
                  <p className="text-gray-600 text-sm font-semibold">📦 Elements</p>
                  <p className="text-gray-400 text-xs">Click to add to PDF</p>
                  {items.filter(item => item.visible).map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setItems(prev => prev.map(i =>
                          i.id === item.id ? { ...i, onPdf: true, x: 250, y: 400 } : i
                        ));
                      }}
                      className={`border-2 rounded p-2 cursor-pointer shadow-sm transition ${
                        item.onPdf
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {getItemContent(item)}
                      <p className="text-gray-400 text-xs text-center mt-1">
                        {item.onPdf ? '✅ On PDF' : '👆 Click to add'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}