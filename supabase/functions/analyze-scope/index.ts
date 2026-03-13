
import { createClient } from "npm:@supabase/supabase-js@2.43.4";

console.info("analyze-scope multi-agent started");

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Agent Definitions
const AGENTS = [
  {
    name: "summary",
    outputKey: "summary",
    dependsOn: [],
    systemPrompt: `You are a senior Solutions Architect.
    Extract a comprehensive 4-6 sentence executive summary from the transcript.
    Focus on the high-level vision, core value proposition, and key problem being solved.
    IMPORTANT: Only include information explicitly stated in the transcript. Do not make assumptions.
    Output JSON: { "summary": "..." }`
  },
  {
    name: "personas",
    outputKey: "personas",
    dependsOn: ["summary"],
    systemPrompt: `You are a UX Researcher.
    Identify the key user personas based on the transcript and summary.
    Focus on functional roles that will log into and use the system (e.g., "Admin", "Seller", "Buyer").
    Do not confuse with market segments (e.g., "Small Business Owners" is a market segment, "Store Manager" is a role).
    Only include personas explicitly mentioned or clearly implied by the user's requirements.
    For each, provide a title, description, and list of goals (only if discussed).
    Output JSON: { "personas": [ { "role": "...", "description": "...", "goals": ["..."] } ] }`
  },
  {
    name: "target_audience",
    outputKey: "target_audience",
    dependsOn: ["personas"],
    systemPrompt: `You are a Market Strategist.
    Identify the target audience segments based on the transcript and personas.
    Focus purely on market segments, industries, or organization types (e.g., "Small Retailers", "Enterprise HR Departments").
    Effectively answer "Who will buy this product?" or "Who is the customer?".
    DO NOT list functional roles (like "Admin", "User", "Manager") — those belong in Personas.
    Only include segments explicitly mentioned.
    Output JSON: { "target_audience": [ { "segment": "...", "description": "..." } ] }`
  },
  {
    name: "features",
    outputKey: "features",
    dependsOn: ["personas", "target_audience"],
    systemPrompt: `You are a Product Manager.
    Extract a comprehensive list of features discussed in the transcript.
    Only include features explicitly requested. Do not infer features based on "industry standards".
    If a feature was not discussed, do not include it.
    Output JSON: { "features": [ { "name": "...", "description": "...", "priority": "...", "category": "..." } ] }`
  },
  {
    name: "pages",
    outputKey: "pages",
    dependsOn: ["features"],
    systemPrompt: `You are a UI/UX Designer.
    List the key pages/screens required for the application based on the features.
    Only include pages explicitly mentioned or strictly necessary for the requested features.
    Do not invent administrative pages or dashboards unless requested.
    Output JSON: { "pages": [ { "name": "...", "route": "...", "description": "...", "key_components": ["..."] } ] }`
  },
  {
    name: "user_flows",
    outputKey: "user_flows",
    dependsOn: ["personas", "features", "pages"],
    systemPrompt: `You are a UX Architect.
    Define the core user flows through the application.
    Only map flows that can be derived from the requested features.
    Output JSON: { "user_flows": [ { "name": "...", "steps": ["..."] } ] }`
  },
  {
    name: "technology",
    outputKey: "technology",
    dependsOn: ["features", "pages"],
    systemPrompt: `You are a CTO.
    List the technology stack based strictly on the transcript.
    If specific tech (e.g. React, Node, AWS) was mentioned, include it.
    If NO specific tech was mentioned, return empty arrays or "Not specified".
    DO NOT recommend "industry standard" stacks (like React/Next.js) if they were not explicitly requested.
    Output JSON: { "technology": { "frontend": [], "backend": [], "database": [], "infrastructure": [], "third_party": [] } }`
  },
  {
    name: "architecture",
    outputKey: "architecture",
    dependsOn: ["technology", "features"],
    systemPrompt: `You are a System Architect.
    Describe the high-level system architecture.
    Only describe architectural patterns explicitly discussed (e.g. microservices, serverless).
    If not discussed, state "Architecture not specified in transcript."
    IMPORTANT: The value of "architecture" must be a single string of plain text. Do not use Markdown formatting or nested JSON objects.
    Output JSON: { "architecture": "..." }`
  },
  {
    name: "test_cases",
    outputKey: "test_cases",
    dependsOn: ["features", "user_flows"],
    systemPrompt: `You are a QA Lead.
    Define key test cases for the application, grouped by feature area.
    Focus on critical user flows and edge cases.
    Output JSON: { "test_cases": [ { "area": "...", "cases": ["..."] } ] }`
  },
  {
    name: "monetization",
    outputKey: "monetization",
    dependsOn: ["target_audience", "features"],
    systemPrompt: `You are a Business Strategist.
    Identify the monetization strategy discussed. Look for terms like "income plan", "pricing model", "revenue streams", "subscription", "fees", or "payment".
    Extract a DETAILED breakdown of the strategy. If specific prices, percentages, or tier names were mentioned, INCLUDE them.
    Do not summarize too briefly. Capture the full "income plan" described in the transcript.
    If monetization was NOT discussed, return "Not specified". Do NOT suggest a strategy.
    IMPORTANT: The value of "monetization" must be a single string of plain text. Do not use Markdown formatting or nested JSON objects.
    Output JSON: { "monetization": "..." }`
  },
  {
    name: "prd",
    outputKey: "prd",
    dependsOn: ["summary", "features"],
    systemPrompt: `You are a Product Owner.
    Write a concise Product Requirements Document (PRD) summary.
    Synthesize the vision, scope, and key deliverables based strictly on the transcript.
    IMPORTANT: The value of "prd" must be a single string of plain text. Do not use Markdown formatting or nested JSON objects.
    Output JSON: { "prd": "..." }`
  }
];

// Helper to run a single agent
async function runAgent(agent: any, transcript: string, context: any) {
  console.log(`Running agent: ${agent.name}`);
  
  // Construct context string from dependencies
  let contextStr = "";
  for (const dep of agent.dependsOn) {
    if (context[dep]) {
      contextStr += `\n\nCONTEXT FROM ${dep.toUpperCase()}:\n${JSON.stringify(context[dep], null, 2)}`;
    }
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${agent.systemPrompt}
          
          ACCURACY RULES:
          - Valid JSON output only.
          - strict adherence to the requested JSON structure.
          - Do not include markdown code blocks.
          
          TRANSCRIPT TO ANALYZE:
          ${transcript.slice(0, 15000)}` 
        },
        {
          role: "user",
          content: `Produce the ${agent.outputKey} based on the transcript and context provided.${contextStr}`
        }
      ],
      max_tokens: 1500, // Reduced from 4000 since it's per-agent
    }),
  });

  if (!response.ok) {
    throw new Error(`Agent ${agent.name} failed: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error(`Failed to parse JSON from ${agent.name}:`, content);
    throw new Error(`Agent ${agent.name} produced invalid JSON`);
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { scoping_input_id } = await req.json();
    if (!scoping_input_id) {
      return new Response(JSON.stringify({ error: "Missing scoping_input_id" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 1. Fetch input
    const { data: scope, error: fetchError } = await supabase
      .from("scoping_inputs")
      .select("id, status, meeting_transcript")
      .eq("id", scoping_input_id)
      .single();

    if (fetchError || !scope) {
      return new Response(JSON.stringify({ error: "Scope input not found" }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Mark analyzing
    await supabase.from("scoping_inputs").update({ status: "analyzing" }).eq("id", scoping_input_id);

    // 3. Run Pipeline
    const transcript = scope.meeting_transcript || "";
    const context: any = {};
    const finalOutput: any = {};

    // Sequential execution for now to ensure dependency chain
    // Optimization: Could parallelize independent branches later
    for (const agent of AGENTS) {
      try {
        const result = await runAgent(agent, transcript, context);
        
        // Merge result into context and final output
        // The result usually looks like { [outputKey]: ... }
        Object.assign(context, result);
        Object.assign(finalOutput, result);
        
      } catch (agentError) {
        console.error(`Error in agent ${agent.name}:`, agentError);
        // Continue with other agents? Or fail fast? 
        // Failing specific section is better than failing all
        finalOutput[agent.outputKey] = null; // or empty appropriate type
      }
    }

    // 4. Save result
    const { error: upsertError } = await supabase
      .from("scope_ai_outputs")
      .upsert(
        { scoping_input_id, ...finalOutput },
        { onConflict: 'scoping_input_id' }
      );

    if (upsertError) throw upsertError;

    // 5. Mark completed
    await supabase.from("scoping_inputs").update({ status: "completed" }).eq("id", scoping_input_id);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as any).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
