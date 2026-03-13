import { useState, useEffect } from 'react';
import { 
  FileText, Users, Layers, Code, Zap, 
  DollarSign, CheckCircle, ArrowRight, Layout,
  Target, Shield, TestTube, BookOpen, ChevronRight,
  Save, Loader2, Plus, Trash2, X
} from 'lucide-react';
import CommentSection from './CommentSection.jsx';

// Helper: safely render any value
function SafeRender({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-400 italic">—</span>;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v, i) => <span key={i}>{typeof v === 'string' ? v : JSON.stringify(v)}{i < value.length - 1 ? ', ' : ''}</span>);
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

// Editable text
function EditableText({ value, onChange, editable, className = '', multiline = false, placeholder = '' }) {
  if (!editable) return <span className={className}><SafeRender value={value} /></span>;
  const cls = `w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all ${className}`;
  return multiline
    ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder} className={`${cls} resize-none`} />
    : <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />;
}

// Editable tag list
function EditableTags({ items, onChange, editable, color = 'bg-slate-100 text-slate-600' }) {
  const [newVal, setNewVal] = useState('');
  if (!editable) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(items || []).map((item, i) => (
          <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${color}`}>{item}</span>
        ))}
      </div>
    );
  }
  const add = () => { if (!newVal.trim()) return; onChange([...(items || []), newVal.trim()]); setNewVal(''); };
  const remove = (idx) => onChange((items || []).filter((_, i) => i !== idx));
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {(items || []).map((item, i) => (
        <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full ${color} inline-flex items-center gap-1`}>
          {item}
          <button onClick={() => remove(i)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <div className="inline-flex items-center gap-1">
        <input type="text" value={newVal} onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Add..." className="px-2 py-0.5 text-[11px] w-24 border border-dashed border-amber-300 rounded-full bg-amber-50/50 focus:outline-none focus:border-amber-400" />
        <button onClick={add} className="text-amber-600 hover:text-amber-700"><Plus className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

// Section wrapper with optional comment thread
function Section({ icon: Icon, title, iconColor = "text-blue-600", sectionRef, comments, onAddComment, showComments, children }) {
  return (
    <section className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className={`p-1.5 rounded-lg bg-white shadow-sm ring-1 ring-slate-200 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
      </div>
      <div className="p-6">
        {children}
        {showComments && sectionRef && (
          <CommentSection
            sectionRef={sectionRef}
            sectionLabel={title}
            comments={comments || []}
            onSubmit={onAddComment}
          />
        )}
      </div>
    </section>
  );
}

export default function ScopeReport({ data, editable = false, onSave, saving = false, comments = [], onAddComment, showComments = false }) {
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    if (editable && data) {
      setEditData(JSON.parse(JSON.stringify(data)));
    }
  }, [editable, data]);

  if (!data) return null;

  const d = editable && editData ? editData : data;

  const updateField = (field, value) => setEditData(prev => ({ ...prev, [field]: value }));

  const updateArrayItem = (field, idx, updater) => {
    const arr = [...(editData[field] || [])];
    arr[idx] = typeof updater === 'function' ? updater(arr[idx]) : updater;
    updateField(field, arr);
  };
  const addArrayItem = (field, item) => updateField(field, [...(editData[field] || []), item]);
  const removeArrayItem = (field, idx) => updateField(field, (editData[field] || []).filter((_, i) => i !== idx));

  const handleSave = () => {
    if (onSave && editData) {
      const { id, scoping_input_id, created_at, updated_at, ...contentFields } = editData;
      onSave(contentFields);
    }
  };

  // Shared comment props for sections
  const commentProps = showComments ? { comments, onAddComment, showComments } : {};

  // Group features by category
  const featuresByCategory = {};
  if (Array.isArray(d.features)) {
    d.features.forEach(f => {
      const cat = (typeof f === 'object' ? f.category : null) || 'General';
      if (!featuresByCategory[cat]) featuresByCategory[cat] = [];
      featuresByCategory[cat].push(f);
    });
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1 text-blue-200 text-sm font-medium uppercase tracking-wider">
          <CheckCircle className="w-4 h-4" /> Scope Document
        </div>
        <h2 className="text-2xl font-bold mb-2">Project Scope of Work</h2>
        <p className="text-blue-100 text-sm">AI-Generated • Ready for Review</p>
      </div>

      {/* Save bar */}
      {editable && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-6 py-3">
          <span className="text-sm text-amber-700 font-medium">✏️ Editing mode — all fields are editable</span>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Executive Summary */}
      <Section icon={FileText} title="Executive Summary" iconColor="text-blue-600" sectionRef="summary" {...commentProps}>
        <div className="text-slate-600 leading-relaxed text-[15px]">
          <EditableText value={d.summary} onChange={v => updateField('summary', v)} editable={editable} multiline />
        </div>
      </Section>

      {/* PRD */}
      {(d.prd || editable) && (
        <Section icon={BookOpen} title="Product Requirements" iconColor="text-violet-600" sectionRef="prd" {...commentProps}>
          <div className="text-slate-600 leading-relaxed text-[15px]">
            <EditableText value={d.prd} onChange={v => updateField('prd', v)} editable={editable} multiline />
          </div>
        </Section>
      )}

      {/* Target Audience */}
      {(Array.isArray(d.target_audience) && d.target_audience.length > 0 || editable) && (
        <Section icon={Target} title="Target Audience" iconColor="text-teal-600" sectionRef="target_audience" {...commentProps}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(d.target_audience || []).map((segment, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-teal-50/30 relative">
                {editable && (
                  <button onClick={() => removeArrayItem('target_audience', idx)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm">{idx + 1}</div>
                  {editable ? (
                    <input type="text" value={typeof segment === 'object' ? (segment.segment || '') : segment}
                      onChange={e => updateArrayItem('target_audience', idx, typeof segment === 'object' ? { ...segment, segment: e.target.value } : e.target.value)}
                      className="flex-1 px-2 py-1 text-sm font-semibold border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400" placeholder="Segment name" />
                  ) : (
                    <h4 className="font-semibold text-slate-900 text-sm">
                      {typeof segment === 'string' ? segment : segment.segment || segment.name || 'Segment'}
                    </h4>
                  )}
                </div>
                {editable ? (
                  <textarea value={typeof segment === 'object' ? (segment.description || '') : ''}
                    onChange={e => updateArrayItem('target_audience', idx, typeof segment === 'object' ? { ...segment, description: e.target.value } : { segment: segment, description: e.target.value })}
                    rows={2} placeholder="Description..."
                    className="w-full px-2 py-1 text-sm text-slate-500 border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400 resize-none" />
                ) : (
                  typeof segment === 'object' && segment.description && (
                    <p className="text-slate-500 text-sm leading-relaxed">{segment.description}</p>
                  )
                )}
              </div>
            ))}
            {editable && (
              <button onClick={() => addArrayItem('target_audience', { segment: '', description: '' })}
                className="border-2 border-dashed border-teal-200 rounded-lg p-5 flex items-center justify-center gap-2 text-teal-500 hover:border-teal-400 hover:text-teal-600 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Segment
              </button>
            )}
          </div>
        </Section>
      )}

      {/* Personas */}
      {(Array.isArray(d.personas) && d.personas.length > 0 || editable) && (
        <Section icon={Users} title="User Personas" iconColor="text-indigo-600" sectionRef="personas" {...commentProps}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(d.personas || []).map((persona, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50 relative">
                {editable && (
                  <button onClick={() => removeArrayItem('personas', idx)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">{idx + 1}</div>
                  {editable ? (
                    <input type="text" value={typeof persona === 'object' ? (persona.role || persona.name || '') : persona}
                      onChange={e => updateArrayItem('personas', idx, p => typeof p === 'object' ? { ...p, role: e.target.value } : { role: e.target.value, description: '', goals: [] })}
                      className="flex-1 px-2 py-1 text-sm font-semibold border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400" placeholder="Persona role" />
                  ) : (
                    <h4 className="font-semibold text-slate-900 text-sm">
                      {typeof persona === 'string' ? persona : persona.role || persona.name || 'Persona'}
                    </h4>
                  )}
                </div>
                {editable ? (
                  <textarea value={typeof persona === 'object' ? (persona.description || '') : ''}
                    onChange={e => updateArrayItem('personas', idx, p => ({ ...(typeof p === 'object' ? p : { role: p }), description: e.target.value }))}
                    rows={2} placeholder="Description..."
                    className="w-full px-2 py-1 text-sm text-slate-500 border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400 resize-none mb-2" />
                ) : (
                  typeof persona === 'object' && persona.description && (
                    <p className="text-slate-500 text-sm leading-relaxed mb-3">{persona.description}</p>
                  )
                )}
                {typeof persona === 'object' && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Goals</span>
                    {editable ? (
                      <EditableTags items={persona.goals || []}
                        onChange={goals => updateArrayItem('personas', idx, p => ({ ...p, goals }))}
                        editable={true} color="bg-indigo-50 text-indigo-600" />
                    ) : (
                      (persona.goals || []).map((goal, gi) => (
                        <div key={gi} className="flex items-start gap-2 text-xs text-slate-600">
                          <Target className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span>{goal}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
            {editable && (
              <button onClick={() => addArrayItem('personas', { role: '', description: '', goals: [] })}
                className="border-2 border-dashed border-indigo-200 rounded-lg p-5 flex items-center justify-center gap-2 text-indigo-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Persona
              </button>
            )}
          </div>
        </Section>
      )}

      {/* Features */}
      <Section icon={Zap} title="Core Features" iconColor="text-amber-500" sectionRef="features" {...commentProps}>
        {editable ? (
          <div className="space-y-3">
            {(d.features || []).map((feature, idx) => {
              const f = typeof feature === 'object' ? feature : { name: feature, description: '', priority: 'medium', category: 'General' };
              return (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 relative">
                  <button onClick={() => removeArrayItem('features', idx)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="text" value={f.name || ''} placeholder="Feature name"
                      onChange={e => updateArrayItem('features', idx, { ...f, name: e.target.value })}
                      className="px-2 py-1.5 text-sm font-semibold border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400" />
                    <select value={f.priority || 'medium'}
                      onChange={e => updateArrayItem('features', idx, { ...f, priority: e.target.value })}
                      className="px-2 py-1.5 text-sm border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <input type="text" value={f.category || ''} placeholder="Category"
                      onChange={e => updateArrayItem('features', idx, { ...f, category: e.target.value })}
                      className="px-2 py-1.5 text-sm border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400" />
                  </div>
                  <textarea value={f.description || ''} placeholder="Description..."
                    onChange={e => updateArrayItem('features', idx, { ...f, description: e.target.value })}
                    rows={2}
                    className="w-full mt-2 px-2 py-1.5 text-sm border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400 resize-none" />
                </div>
              );
            })}
            <button onClick={() => addArrayItem('features', { name: '', description: '', priority: 'medium', category: 'General' })}
              className="w-full border-2 border-dashed border-amber-200 rounded-lg p-3 flex items-center justify-center gap-2 text-amber-500 hover:border-amber-400 hover:text-amber-600 transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Feature
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(featuresByCategory).map(([category, features], catIdx) => (
              <div key={catIdx}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{category}</span>
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400">{features.length} features</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {features.map((feature, idx) => {
                    const name = typeof feature === 'string' ? feature : feature.name;
                    const desc = typeof feature === 'object' ? feature.description : null;
                    const priority = typeof feature === 'object' ? feature.priority : null;
                    const priorityColors = {
                      high: 'bg-red-50 text-red-600 ring-red-200',
                      medium: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
                      low: 'bg-green-50 text-green-600 ring-green-200',
                    };
                    return (
                      <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h5 className="font-semibold text-slate-800 text-sm">{name}</h5>
                          {priority && (
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ring-1 ${priorityColors[priority] || 'bg-slate-50 text-slate-500 ring-slate-200'}`}>
                              {priority}
                            </span>
                          )}
                        </div>
                        {desc && <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Pages */}
      {(Array.isArray(d.pages) && d.pages.length > 0 || editable) && (
        <Section icon={Layout} title="Application Structure" iconColor="text-purple-600" sectionRef="pages" {...commentProps}>
          {editable ? (
            <div className="space-y-3">
              {(d.pages || []).map((page, idx) => {
                const p = typeof page === 'object' ? page : { name: page, route: '', description: '', key_components: [] };
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 relative">
                    <button onClick={() => removeArrayItem('pages', idx)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                      <input type="text" value={p.name || ''} placeholder="Page name"
                        onChange={e => updateArrayItem('pages', idx, { ...p, name: e.target.value })}
                        className="px-2 py-1.5 text-sm font-semibold border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400" />
                      <input type="text" value={p.route || ''} placeholder="/route-path"
                        onChange={e => updateArrayItem('pages', idx, { ...p, route: e.target.value })}
                        className="px-2 py-1.5 text-sm font-mono border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400" />
                    </div>
                    <textarea value={p.description || ''} placeholder="Description..."
                      onChange={e => updateArrayItem('pages', idx, { ...p, description: e.target.value })}
                      rows={2}
                      className="w-full px-2 py-1.5 text-sm border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400 resize-none mb-2" />
                    <div>
                      <span className="text-xs text-slate-400 font-semibold mb-1 block">Key Components</span>
                      <EditableTags items={p.key_components || []}
                        onChange={comps => updateArrayItem('pages', idx, { ...p, key_components: comps })}
                        editable={true} color="bg-purple-50 text-purple-600" />
                    </div>
                  </div>
                );
              })}
              <button onClick={() => addArrayItem('pages', { name: '', route: '', description: '', key_components: [] })}
                className="w-full border-2 border-dashed border-purple-200 rounded-lg p-3 flex items-center justify-center gap-2 text-purple-500 hover:border-purple-400 hover:text-purple-600 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Page
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {d.pages.map((page, idx) => {
                const name = typeof page === 'string' ? page : page.name;
                const route = typeof page === 'object' ? page.route : null;
                const desc = typeof page === 'object' ? page.description : null;
                const comps = typeof page === 'object' && Array.isArray(page.key_components) ? page.key_components : [];
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <h5 className="font-semibold text-slate-800 text-sm">{name}</h5>
                      {route && <code className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-auto font-mono">{route}</code>}
                    </div>
                    {desc && <p className="text-slate-500 text-xs leading-relaxed mt-1">{desc}</p>}
                    {comps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {comps.map((c, ci) => (
                          <span key={ci} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* User Flows */}
      {(Array.isArray(d.user_flows) && d.user_flows.length > 0 || editable) && (
        <Section icon={Layers} title="User Flows" iconColor="text-blue-500" sectionRef="user_flows" {...commentProps}>
          {editable ? (
            <div className="space-y-3">
              {(d.user_flows || []).map((flow, idx) => {
                const f = typeof flow === 'object' ? flow : { name: `Flow ${idx + 1}`, steps: [flow] };
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 relative">
                    <button onClick={() => removeArrayItem('user_flows', idx)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <input type="text" value={f.name || ''} placeholder="Flow name"
                      onChange={e => updateArrayItem('user_flows', idx, { ...f, name: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm font-semibold border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400 mb-2" />
                    <span className="text-xs text-slate-400 font-semibold mb-1 block">Steps</span>
                    <EditableTags items={f.steps || []}
                      onChange={steps => updateArrayItem('user_flows', idx, { ...f, steps })}
                      editable={true} color="bg-blue-50 text-blue-700" />
                  </div>
                );
              })}
              <button onClick={() => addArrayItem('user_flows', { name: '', steps: [] })}
                className="w-full border-2 border-dashed border-blue-200 rounded-lg p-3 flex items-center justify-center gap-2 text-blue-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Add User Flow
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {d.user_flows.map((flow, idx) => {
                const name = typeof flow === 'string' ? `Flow ${idx + 1}` : flow.name;
                const steps = typeof flow === 'string' ? [flow] : (flow.steps || []);
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                      <h5 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400" />{name}
                      </h5>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-1">
                        {steps.map((step, si) => (
                          <div key={si} className="flex items-center gap-1">
                            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md border border-blue-100 font-medium">{step}</span>
                            {si < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* Technical Architecture */}
      <section className="bg-slate-900 text-white rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/50">
          <div className="p-1.5 rounded-lg bg-slate-800 text-blue-400 ring-1 ring-slate-700">
            <Code className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold tracking-tight">Technical Architecture</h3>
        </div>
        <div className="p-6 space-y-6">
          {(d.architecture || editable) && (
            <div>
              <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">System Overview</h4>
              {editable ? (
                <textarea value={typeof d.architecture === 'string' ? d.architecture : ''}
                  onChange={e => updateField('architecture', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-900 resize-none" />
              ) : (
                <p className="text-slate-300 text-sm leading-relaxed"><SafeRender value={d.architecture} /></p>
              )}
            </div>
          )}

          {d.technology && typeof d.technology === 'object' && !Array.isArray(d.technology) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(d.technology).map(([layer, techs], i) => (
                <div key={i}>
                  <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 capitalize">{layer.replace(/_/g, ' ')}</h4>
                  {editable ? (
                    <EditableTags items={Array.isArray(techs) ? techs : [techs]}
                      onChange={newTechs => updateField('technology', { ...d.technology, [layer]: newTechs })}
                      editable={true} color="bg-slate-800 text-blue-300 border border-slate-700" />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(techs) ? techs : [techs]).map((t, ti) => (
                        <span key={ti} className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-blue-300 font-medium">
                          {typeof t === 'string' ? t : JSON.stringify(t)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : Array.isArray(d.technology) ? (
            <div>
              <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">Tech Stack</h4>
              {editable ? (
                <EditableTags items={d.technology}
                  onChange={v => updateField('technology', v)}
                  editable={true} color="bg-slate-800 text-blue-300 border border-slate-700" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {d.technology.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-blue-300 font-medium">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Architecture section comments */}
          {showComments && (
            <div className="pt-4 border-t border-slate-700/50">
              <CommentSection
                sectionRef="architecture"
                sectionLabel="Technical Architecture"
                comments={comments || []}
                onSubmit={onAddComment}
              />
            </div>
          )}
        </div>
      </section>

      {/* Test Cases */}
      {(Array.isArray(d.test_cases) && d.test_cases.length > 0 || editable) && (
        <Section icon={TestTube} title="Test Cases" iconColor="text-emerald-600" sectionRef="test_cases" {...commentProps}>
          {editable ? (
            <div className="space-y-3">
              {(d.test_cases || []).map((area, idx) => {
                const a = typeof area === 'object' ? area : { area: area, cases: [] };
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 relative">
                    <button onClick={() => removeArrayItem('test_cases', idx)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <input type="text" value={a.area || ''} placeholder="Test area name"
                      onChange={e => updateArrayItem('test_cases', idx, { ...a, area: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm font-semibold border border-amber-200 rounded bg-amber-50/50 focus:outline-none focus:border-amber-400 mb-2" />
                    <span className="text-xs text-slate-400 font-semibold mb-1 block">Test Cases</span>
                    <EditableTags items={a.cases || []}
                      onChange={cases => updateArrayItem('test_cases', idx, { ...a, cases })}
                      editable={true} color="bg-emerald-50 text-emerald-600" />
                  </div>
                );
              })}
              <button onClick={() => addArrayItem('test_cases', { area: '', cases: [] })}
                className="w-full border-2 border-dashed border-emerald-200 rounded-lg p-3 flex items-center justify-center gap-2 text-emerald-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Test Area
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {d.test_cases.map((area, idx) => {
                const areaName = typeof area === 'string' ? area : area.area;
                const cases = typeof area === 'object' && Array.isArray(area.cases) ? area.cases : [];
                return (
                  <div key={idx}>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-sm font-semibold text-slate-800">{areaName}</span>
                    </div>
                    <div className="space-y-1.5 ml-5">
                      {cases.map((tc, ci) => (
                        <div key={ci} className="flex items-start gap-2 text-sm text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                          {tc}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* Monetization */}
      {(d.monetization || editable) && (
        <Section icon={DollarSign} title="Monetization Strategy" iconColor="text-green-600" sectionRef="monetization" {...commentProps}>
          <div className="text-slate-600 text-[15px] leading-relaxed">
            <EditableText value={d.monetization} onChange={v => updateField('monetization', v)} editable={editable} multiline />
          </div>
        </Section>
      )}

      {/* Bottom save */}
      {editable && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-all shadow-md">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
