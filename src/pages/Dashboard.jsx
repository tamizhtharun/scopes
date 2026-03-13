import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Briefcase, ChevronRight, Loader2, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get company
      let { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (companyError && companyError.code !== 'PGRST116') {
         throw companyError;
      }
      
      if (!company) {
          setProjects([]);
          setLoading(false);
          return;
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-2">Manage your client scoping projects</p>
        </div>
        <Link to="/new-project" className="btn btn-primary gap-2">
          <Plus className="w-5 h-5" />
          New Project
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-400">
          Error loading projects: {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-dashed border-slate-300 shadow-sm">
          <div className="bg-slate-50 p-4 rounded-full inline-flex mb-4">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No projects yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-8">
            Get started by creating your first project to scope client requirements.
          </p>
          <Link to="/new-project" className="btn btn-primary px-6">
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link 
              key={project.id} 
              to={`/project/${project.id}`}
              className="card hover:shadow-md hover:border-blue-200 transition-all group block bg-white"
            >
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Briefcase className="w-5 h-5" />
                 </div>
                 <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.created_at).toLocaleDateString()}
                 </span>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate">{project.project_name}</h3>
              <p className="text-slate-500 text-sm mb-4 truncate">{project.client_company}</p>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-400">View Details</span>
                <div className="text-blue-600 font-medium flex items-center group-hover:translate-x-1 transition-transform">
                  Open <ChevronRight className="w-4 h-4 ml-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
