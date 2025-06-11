import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Get the request body
    const body = await req.json()
    console.log('Received webhook data:', body)
    
    // Validate required fields
    if (!body.record_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: record_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Process results
    let resultsAsString = '';
    try {
      if (typeof body.results === 'string') {
        resultsAsString = body.results;
      } else if (body.results) {
        resultsAsString = JSON.stringify(body.results);
      }
    } catch (error) {
      console.error('Error processing results:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to process results',
        details: { error: error.message }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Prepare update data
    const updateData = {
      url: body.url,
      nome: body.nome,
      email: body.email,
      telefone: body.telefone,
      faturamento: body.faturamento,
      results: resultsAsString
    };
    
    console.log('Attempting to update record:', {
      id: body.record_id,
      data: updateData
    });
    
    // Update record
    const { data, error } = await supabase
      .from('blog_diagnostics')
      .update(updateData)
      .eq('id', body.record_id)
      .select()
    
    if (error) {
      console.error('Supabase update error:', error);
      return new Response(JSON.stringify({ 
        error: error.message,
        details: {
          record_id: body.record_id,
          update_data: updateData,
          supabase_error: error
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Garantir que temos um objeto, não um array
    const updatedRecord = Array.isArray(data) ? data[0] : data;
    console.log('Update successful:', updatedRecord);
    
    // Retornar um objeto com todos os dados
    return new Response(JSON.stringify({
      message: "Record updated successfully",
      record: updatedRecord,
      update_data: updateData,
      debug: {
        record_id: body.record_id,
        original_data: body,
        processed_results: resultsAsString
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
