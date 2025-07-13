import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MigrationPayload {
  anonymous_analysis_id?: string;
  anonymous_questionnaire_id?: string;
}

const log = (message: string, data: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ message, ...data }));
};

const createAdminClient = (): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

const handleRequest = async (req: Request) => {
  log('Function execution started.');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    log('Missing Authorization header.');
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  let payload: MigrationPayload;
  try {
    payload = await req.json();
    log('Request payload received.', { payload });
  } catch (error) {
    log('Failed to parse request body as JSON.', { error: error.message });
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const { anonymous_analysis_id, anonymous_questionnaire_id } = payload;
  if (!anonymous_analysis_id && !anonymous_questionnaire_id) {
    log('Validation failed: at least one ID must be provided.');
    return new Response(JSON.stringify({ error: 'Missing or invalid anonymous_analysis_id or anonymous_questionnaire_id' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
  log('Payload validation successful.');

  const supabaseAdmin = createAdminClient();
  const supabaseUserClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user) {
    log('Could not retrieve user from Authorization header.');
    return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }
  log('Successfully retrieved user.', { user_id: user.id });

  const migrationPromises = [];
  if (anonymous_analysis_id) {
    migrationPromises.push(migrateAnalysisData(supabaseAdmin, anonymous_analysis_id, user.id));
  }
  if (anonymous_questionnaire_id) {
    migrationPromises.push(migrateQuestionnaireData(supabaseAdmin, anonymous_questionnaire_id, user.id));
  }

  const results = await Promise.all(migrationPromises);

  const migratedSomething = results.some(r => r.migrated);
  const messages = results.map(r => r.message).filter(Boolean);

  if (migratedSomething) {
    log('Migration process completed.', { messages: messages.join(' ') });
    return new Response(JSON.stringify({ success: true, message: messages.join(' ') }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } else {
    log('Migration process completed, but no data was found to migrate.');
    return new Response(JSON.stringify({ success: false, message: 'No data found to migrate.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
};

const migrateAnalysisData = async (supabaseAdmin: SupabaseClient, anonymousId: string, userId: string) => {
  log('Fetching anonymous analysis data.', { anonymousId });
  const { data: anonymousData, error: fetchError } = await supabaseAdmin
    .from('anonymous_analysis_data')
    .select('*')
    .eq('id', anonymousId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      log('No anonymous analysis data found for the given ID.');
      return { migrated: false, message: 'No analysis data found.'};
    }
    log('Error fetching anonymous analysis data.', { error: fetchError });
    // Decide if you want to throw or just return failure
    return { migrated: false, message: 'Error fetching analysis data.' };
  }
  log('Successfully fetched anonymous analysis data.');
  
  const newData = {
    id: anonymousData.id,
    overall_score: anonymousData.overall_score,
    hydration_score: anonymousData.hydration_score,
    barrier_score: anonymousData.barrier_score,
    overall_score_elaboration: anonymousData.overall_score_elaboration,
    hydration_score_elaboration: anonymousData.hydration_score_elaboration,
    barrier_score_elaboration: anonymousData.barrier_score_elaboration,
    important_ingredient: anonymousData.important_ingredient,
    important_habit: anonymousData.important_habit,
    routine_ids_array: anonymousData.routine_ids_array,
    user_id: userId,
  };

  log('Attempting to insert new analysis data.', { userId });
  const { error: insertError } = await supabaseAdmin
    .from('analysis_data')
    .insert(newData);

  if (insertError) {
    log('Error inserting new analysis data.', { error: insertError });
    return { migrated: false, message: 'Failed to save migrated analysis data.' };
  }
  log('Successfully inserted new analysis data.');

  log('Attempting to delete anonymous analysis data.', { anonymousId });
  const { error: deleteError } = await supabaseAdmin
    .from('anonymous_analysis_data')
    .delete()
    .eq('id', anonymousId);

  if (deleteError) {
    log('Failed to delete anonymous analysis data. This will require manual cleanup.', { error: deleteError });
  } else {
    log('Successfully deleted anonymous analysis data.');
  }

  return { migrated: true, message: 'Analysis data migrated successfully.' };
};

const migrateQuestionnaireData = async (supabaseAdmin: SupabaseClient, anonymousId: string, userId: string) => {
  log('Fetching anonymous questionnaire data.', { anonymousId });
  const { data: anonymousData, error: fetchError } = await supabaseAdmin
    .from('anonymous_questionnaires')
    .select('*')
    .eq('id', anonymousId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      log('No anonymous questionnaire data found for the given ID.');
      return { migrated: false, message: 'No questionnaire data found.' };
    }
    log('Error fetching anonymous questionnaire data.', { error: fetchError });
    return { migrated: false, message: 'Error fetching questionnaire data.' };
  }
  log('Successfully fetched anonymous questionnaire data.');

  const { id, created_at, updated_at, ...restOfData } = anonymousData;
  const newData = {
    ...restOfData,
    id: id, // Preserve the original questionnaire ID
    user_id: userId,
  };

  log('Attempting to insert new user questionnaire results.', { userId });
  const { error: insertError } = await supabaseAdmin
    .from('user_questionnaire_results')
    .insert(newData);

  if (insertError) {
    log('Error inserting new user questionnaire results.', { error: insertError });
    return { migrated: false, message: 'Failed to save migrated questionnaire data.' };
  }
  log('Successfully inserted new user questionnaire results.');

  log('Attempting to delete anonymous questionnaire data.', { anonymousId });
  const { error: deleteError } = await supabaseAdmin
    .from('anonymous_questionnaires')
    .delete()
    .eq('id', anonymousId);

  if (deleteError) {
    log('Failed to delete anonymous questionnaire data. This will require manual cleanup.', { error: deleteError });
  } else {
    log('Successfully deleted anonymous questionnaire data.');
  }

  return { migrated: true, message: 'Questionnaire data migrated successfully.' };
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    return await handleRequest(req);
  } catch (error) {
    log('An unexpected top-level error occurred.', { error: error.message });
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
