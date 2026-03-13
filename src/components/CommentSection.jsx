import { useState } from 'react';
import { MessageSquare, Send, User, Mail, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

// Compact inline comment thread for a single section
export default function CommentSection({ sectionRef, sectionLabel, comments = [], onSubmit }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const sectionComments = comments.filter(c => c.section_ref === sectionRef);
  const count = sectionComments.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim() || !email.trim() || !text.trim()) {
      setError('All fields are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        commenter_name: name.trim(),
        commenter_email: email.trim(),
        comment_text: text.trim(),
        section_ref: sectionRef,
      });
      setText('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors group"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>
          {count > 0 ? `${count} comment${count !== 1 ? 's' : ''}` : 'Add comment'}
        </span>
        {expanded
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />
        }
      </button>

      {/* Expanded thread */}
      {expanded && (
        <div className="mt-3 pl-4 border-l-2 border-blue-100 space-y-3">
          {/* Existing comments */}
          {sectionComments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-[11px] flex-shrink-0">
                {(comment.commenter_name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-semibold text-xs text-slate-800">{comment.commenter_name}</span>
                  <span className="text-[10px] text-slate-400">{comment.commenter_email}</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-400 ml-auto">
                    <Clock className="w-2.5 h-2.5" />
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{comment.comment_text}</p>
              </div>
            </div>
          ))}

          {count === 0 && (
            <p className="text-[11px] text-slate-400 italic">No comments on this section yet.</p>
          )}

          {/* Comment form */}
          <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  type="text" placeholder="Name *" value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  type="email" placeholder="Email *" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
              </div>
            </div>
            <textarea
              placeholder="Write a comment..."
              value={text} onChange={e => setText(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none"
            />

            {error && (
              <div className="text-[11px] text-red-600 bg-red-50 px-2.5 py-1.5 rounded border border-red-100">{error}</div>
            )}
            {success && (
              <div className="text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-100">Comment posted!</div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !name.trim() || !email.trim() || !text.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
