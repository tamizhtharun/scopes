import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowLeft, FileText, Send, Clock, CheckCircle, AlertCircle, Share2, Copy, Check, Pencil } from 'lucide-react';
import ScopeReport from '../components/ScopeReport.jsx';

export default function ProjectDetails() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [scopingInput, setScopingInput] = useState(null);
  const [aiOutput, setAiOutput] = useState(null);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editable, setEditable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const { data: inputData, error: inputError } = await supabase
        .from('scoping_inputs')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inputError) throw inputError;
      setScopingInput(inputData);

      if (inputData?.status === 'completed') {
        const { data: outputData, error: outputError } = await supabase
          .from('scope_ai_outputs')
          .select('*')
          .eq('scoping_input_id', inputData.id)
          .maybeSingle();

        if (!outputError && outputData) {
          setAiOutput(outputData);
          // Fetch comments for this scope output
          fetchComments(outputData.id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (scopeOutputId) => {
    try {
      // Find the share for this scope output
      const { data: share } = await supabase
        .from('scope_shares')
        .select('id')
        .eq('scope_ai_output_id', scopeOutputId)
        .eq('is_active', true)
        .maybeSingle();

      if (!share) return;

      const { data: commentsData } = await supabase
        .from('scope_comments')
        .select('id, commenter_name, commenter_email, comment_text, section_ref, created_at')
        .eq('scope_share_id', share.id)
        .order('created_at', { ascending: true });

      setComments(commentsData || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleGenerateScope = async () => {
    if (!scopingInput?.meeting_transcript && !scopingInput?.requirements_input) {
      setError("Please provide a transcript or requirements.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      let inputId = scopingInput?.id;

      if (!inputId) {
        const { data: newInput, error: createError } = await supabase
          .from('scoping_inputs')
          .insert({
            project_id: id,
            meeting_transcript: scopingInput?.meeting_transcript || '',
            status: 'draft'
          })
          .select()
          .single();

        if (createError) throw createError;
        inputId = newInput.id;
      } else {
        const { error: updateError } = await supabase
          .from('scoping_inputs')
          .update({
            meeting_transcript: scopingInput?.meeting_transcript || '',
            status: 'draft'
          })
          .eq('id', inputId);

        if (updateError) throw updateError;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session! Please log in again.");
      console.log("Invoking with token:", session.access_token.substring(0, 10) + "...");

      const { error: fnError } = await supabase.functions.invoke('analyze-scope', {
        body: { scoping_input_id: inputId }
      });

      if (fnError) {
        console.error("Edge Function Error:", fnError);
        if (fnError.context && fnError.context.json) {
          const body = await fnError.context.json();
          if (body.error) throw new Error(body.error);
        }
        throw fnError;
      }

      let attempts = 0;
      const maxAttempts = 30;

      const pollInterval = setInterval(async () => {
        attempts++;

        const { data: pollData, error: pollError } = await supabase
          .from('scoping_inputs')
          .select('status')
          .eq('id', inputId)
          .single();

        if (pollError) {
          clearInterval(pollInterval);
          setAnalyzing(false);
          setError("Failed to check status: " + pollError.message);
          return;
        }

        if (pollData.status === 'completed') {
          clearInterval(pollInterval);
          const { data: resultData, error: resultError } = await supabase
            .from('scope_ai_outputs')
            .select('*')
            .eq('scoping_input_id', inputId)
            .single();

          if (resultError) {
            setError("Analysis completed but failed to load result: " + resultError.message);
          } else {
            setScopingInput(prev => ({ ...prev, status: 'completed' }));
            window.location.reload();
          }
          setAnalyzing(false);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setAnalyzing(false);
          setError("Analysis timed out. Please check back later.");
        }
      }, 2000);
    } catch (err) {
      setError(err.message);
      setAnalyzing(false);
    }
  };

  const handleShare = async () => {
    if (!aiOutput?.id) return;
    setSharing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session! Please log in again.");

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/share-scope`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ scope_ai_output_id: aiOutput.id }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = `Share failed (${res.status})`;
        try { errMsg = JSON.parse(errText).error || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      const token = data.share_token;
      if (!token) throw new Error('No share token returned');

      setShareToken(token);
      const shareUrl = `${window.location.origin}/share/${token}`;
      
      // Robust copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
      } catch (clipErr) {
        console.warn('Clipboard API failed, trying fallback:', clipErr);
        try {
          const textArea = document.createElement("textarea");
          textArea.value = shareUrl;
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (successful) setCopied(true);
          else throw new Error("Fallback copy failed");
        } catch (fbErr) {
          console.error('Copy failed:', fbErr);
          // Just show the token if copy completely fails
        }
      }
      
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Share error:', err);
      setError(err.message || 'Failed to generate share link');
    } finally {
      setSharing(false);
    }
  };

  const handleSaveScope = async (updatedData) => {
    if (!aiOutput?.id) return;
    setSaving(true);
    setError(null);

    try {
      // Only include columns that exist in the scope_ai_outputs table.
      // Fields not in this list are either metadata or were added to
      // the AI prompt after the original table was created.
      const knownColumns = [
        'summary', 'prd', 'personas', 'features', 'pages',
        'user_flows', 'technology', 'architecture', 'monetization',
        'test_cases', 'target_audience'
      ];

      const payload = {};
      for (const key of knownColumns) {
        if (key in updatedData) {
          payload[key] = updatedData[key];
        }
      }

      // Try saving. If a column doesn't exist yet, retry without it.
      let { error: updateError } = await supabase
        .from('scope_ai_outputs')
        .update(payload)
        .eq('id', aiOutput.id);

      if (updateError && updateError.message?.includes('column')) {
        // A column is missing — find and remove it, then retry
        const missingCol = updateError.message.match(/'(\w+)' column/)?.[1];
        if (missingCol && payload[missingCol] !== undefined) {
          delete payload[missingCol];
          const retry = await supabase
            .from('scope_ai_outputs')
            .update(payload)
            .eq('id', aiOutput.id);
          if (retry.error) throw retry.error;
        } else {
          throw updateError;
        }
      } else if (updateError) {
        throw updateError;
      }

      setAiOutput(prev => ({ ...prev, ...updatedData }));
      setEditable(false);
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600 mb-4">
        Error: {error}
        <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="inline-flex items-center text-slate-400 hover:text-slate-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-slate-900">{project?.project_name}</h1>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
            {project?.client_company}
          </span>
        </div>
        <p className="text-slate-500">{project?.project_description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content Area - Scope Generation */}
        <div className="md:col-span-2 space-y-6">
          <div className="card bg-white shadow-sm border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Scope Generator
              </h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Meeting Transcript / Requirements
              </label>
              <textarea
                className="input min-h-[200px] font-mono text-sm"
                placeholder="Paste your meeting transcript here..."
                value={scopingInput?.meeting_transcript || ''}
                onChange={(e) => setScopingInput(prev => ({ ...prev, meeting_transcript: e.target.value }))}
              />

              <div className="flex justify-end">
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateScope}
                  disabled={analyzing || !scopingInput?.meeting_transcript}
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {analyzing ? 'Analyzing...' : 'Generate Scope'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {aiOutput && (
          <div className="md:col-span-2">
            {/* Action bar: Share + Edit */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleShare}
                disabled={sharing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
              >
                {sharing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                {sharing ? 'Generating...' : copied ? 'Link Copied!' : 'Share'}
              </button>

              <button
                onClick={() => setEditable(!editable)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm ${
                  editable
                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <Pencil className="w-4 h-4" />
                {editable ? 'Editing...' : 'Edit'}
              </button>

              {shareToken && !copied && (
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg ring-1 ring-slate-200 hover:bg-slate-100 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Link
                </button>
              )}
            </div>

            <ScopeReport data={aiOutput} editable={editable} onSave={handleSaveScope} saving={saving} comments={comments} showComments={comments.length > 0} />

            <button
              onClick={() => setAiOutput(null)}
              className="mt-6 text-sm text-slate-500 underline hover:text-slate-700"
            >
              Generate New Scope
            </button>
          </div>
        )}

        {/* Sidebar - Project Info */}
        <div className="space-y-6">
          <div className="card bg-white shadow-sm border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wider">Client Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Name</span>
                <span className="text-slate-700 font-medium">{project?.client_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Email</span>
                <span className="text-slate-700 font-medium">{project?.client_email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
