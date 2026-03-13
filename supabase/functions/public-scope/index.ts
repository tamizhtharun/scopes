import { createClient } from "npm:@supabase/supabase-js@2.43.4";

console.info("public-scope started");

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // Use service role key for public access — the share token is the auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);

    // GET — fetch scope report by share token
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Missing token" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Look up share
      const { data: share, error: shareError } = await supabase
        .from("scope_shares")
        .select("id, scope_ai_output_id, is_active")
        .eq("share_token", token)
        .single();

      if (shareError || !share) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired share link" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!share.is_active) {
        return new Response(
          JSON.stringify({ error: "This share link has been deactivated" }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch scope output
      const { data: scopeData, error: scopeError } = await supabase
        .from("scope_ai_outputs")
        .select("*")
        .eq("id", share.scope_ai_output_id)
        .single();

      if (scopeError || !scopeData) {
        return new Response(
          JSON.stringify({ error: "Scope data not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch project info via scoping_inputs
      let projectName = "Project";
      if (scopeData.scoping_input_id) {
        const { data: inputData } = await supabase
          .from("scoping_inputs")
          .select("project_id")
          .eq("id", scopeData.scoping_input_id)
          .single();

        if (inputData?.project_id) {
          const { data: projectData } = await supabase
            .from("projects")
            .select("project_name, client_company")
            .eq("id", inputData.project_id)
            .single();

          if (projectData) {
            projectName = projectData.project_name || "Project";
          }
        }
      }

      // Fetch comments
      const { data: comments } = await supabase
        .from("scope_comments")
        .select("id, commenter_name, commenter_email, comment_text, section_ref, created_at")
        .eq("scope_share_id", share.id)
        .order("created_at", { ascending: true });

      return new Response(
        JSON.stringify({
          scope: scopeData,
          project_name: projectName,
          share_id: share.id,
          comments: comments || [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST — add a comment
    if (req.method === "POST") {
      const body = await req.json();
      const { share_token, commenter_name, commenter_email, comment_text, section_ref } = body;

      if (!share_token || !commenter_name || !commenter_email || !comment_text) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: share_token, commenter_name, commenter_email, comment_text" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(commenter_email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Look up share
      const { data: share, error: shareError } = await supabase
        .from("scope_shares")
        .select("id, is_active")
        .eq("share_token", share_token)
        .single();

      if (shareError || !share || !share.is_active) {
        return new Response(
          JSON.stringify({ error: "Invalid or inactive share link" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert comment
      const { data: newComment, error: insertError } = await supabase
        .from("scope_comments")
        .insert({
          scope_share_id: share.id,
          commenter_name,
          commenter_email,
          comment_text,
          section_ref: section_ref || null,
        })
        .select("id, commenter_name, commenter_email, comment_text, section_ref, created_at")
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ comment: newComment }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: (err as any).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
