'use client';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useRouter } from 'next/navigation';

interface Document {
  id: number;
  original_name: string;
  file_size: number;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/api/docs');
      setDocuments(response.data);
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      await api.post('/api/docs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchDocuments();
    } catch (err) {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
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
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">Logout</button>
      </nav>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Upload Document</h2>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-400 rounded-lg cursor-pointer hover:bg-blue-50 transition">
            <span className="text-blue-500 font-medium">{uploading ? 'Uploading...' : '📁 Click to upload PDF'}</span>
            <span className="text-gray-400 text-sm mt-1">Only PDF files allowed</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">My Documents</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : documents.length === 0 ? (
            <p className="text-gray-500">No documents uploaded yet.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="pb-3">File Name</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 text-gray-800">{doc.original_name}</td>
                    <td className="py-3 text-gray-600">{formatSize(doc.file_size)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(doc.status)}`}>{doc.status}</span>
                    </td>
                    <td className="py-3 text-gray-600">{formatDate(doc.created_at)}</td>
                    <td className="py-3 flex gap-2">
                      <a href={`http://127.0.0.1:8000/api/docs/file/${doc.id}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">View PDF</a>
                      <button
                        onClick={() => router.push(`/sign?docId=${doc.id}`)}
                        className="text-green-600 hover:underline text-sm"
                      >
                        Sign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}