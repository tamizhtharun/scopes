import { createClient } from "npm:@supabase/supabase-js@2.43.4";

console.info("share-scope started");

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Decode JWT payload to extract user ID (sub claim)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // Extract user ID from the JWT (gateway already validated it)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    const payload = decodeJwtPayload(jwt);
    const userId = payload?.sub as string | undefined;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid token: no user ID" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key to bypass RLS (we control access via userId)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);

    // GET — retrieve existing share for a scope output
    if (req.method === "GET") {
      const scopeAiOutputId = url.searchParams.get("scope_ai_output_id");
      if (!scopeAiOutputId) {
        return new Response(
          JSON.stringify({ error: "Missing scope_ai_output_id" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existing, error } = await supabase
        .from("scope_shares")
        .select("share_token, is_active, created_at")
        .eq("scope_ai_output_id", scopeAiOutputId)
        .eq("created_by", userId)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ share: existing }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST — create a new share link
    if (req.method === "POST") {
      const body = await req.json();
      const { scope_ai_output_id } = body;

      if (!scope_ai_output_id) {
        return new Response(
          JSON.stringify({ error: "Missing scope_ai_output_id" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if share already exists
      const { data: existing } = await supabase
        .from("scope_shares")
        .select("share_token")
        .eq("scope_ai_output_id", scope_ai_output_id)
        .eq("created_by", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ share_token: existing.share_token, existing: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create new share
      const { data: newShare, error: insertError } = await supabase
        .from("scope_shares")
        .insert({
          scope_ai_output_id,
          created_by: userId,
        })
        .select("share_token")
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ share_token: newShare.share_token, existing: false }),
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
