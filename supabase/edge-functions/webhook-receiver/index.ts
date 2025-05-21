
// This is a placeholder for the actual Supabase Edge Function
// In a real implementation, this would be deployed to Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    
    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Ensure results is a string
    const resultsAsString = typeof body.results === 'string' 
      ? body.results 
      : (body.results ? JSON.stringify(body.results) : '')
    
    // Store the webhook data in Supabase - accepting results as they come
    const { data, error } = await supabase
      .from('blog_diagnostics')
      .insert({
        url: body.url,
        nome: body.nome,
        email: body.email,
        telefone: body.telefone,
        faturamento: body.faturamento,
        results: resultsAsString // Always store as string
      })
      .select()
    
    if (error) {
      console.error('Error inserting data:', error)
      throw error
    }
    
    console.log('Successfully stored diagnostic data:', data)
    
    // Return the diagnostic result
    return new Response(JSON.stringify({ 
      message: "Diagnostic data successfully stored",
      results: resultsAsString 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('Error in webhook-receiver function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
