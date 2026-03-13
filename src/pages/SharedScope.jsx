import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import ScopeReport from '../components/ScopeReport.jsx';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function SharedScope() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scopeData, setScopeData] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [shareId, setShareId] = useState(null);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    fetchSharedScope();
  }, [token]);

  const fetchSharedScope = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/public-scope?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to load scope (${res.status})`);
      }

      const data = await res.json();
      setScopeData(data.scope);
      setProjectName(data.project_name || 'Project');
      setShareId(data.share_id);
      setComments(data.comments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async ({ commenter_name, commenter_email, comment_text, section_ref }) => {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/public-scope`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          share_token: token,
          commenter_name,
          commenter_email,
          comment_text,
          section_ref,
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to post comment');
    }

    const data = await res.json();
    setComments(prev => [...prev, data.comment]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading scope document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Scope</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button
            onClick={fetchSharedScope}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Minimal Public Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <FileText className="w-4 h-4 text-white" />
            </div>
            ScopeAI
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ExternalLink className="w-3 h-3" />
            Shared Document
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{projectName}</h1>
          <p className="text-sm text-slate-400 mt-1">Scope of Work — Shared View • Click any section to leave a comment</p>
        </div>

        {scopeData && (
          <ScopeReport
            data={scopeData}
            editable={false}
            comments={comments}
            onAddComment={handleAddComment}
            showComments={true}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 text-center text-xs text-slate-400">
          Powered by ScopeAI
        </div>
      </footer>
    </div>
  );
}
