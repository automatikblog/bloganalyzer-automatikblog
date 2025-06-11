import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseWebhook = (blogUrl: string | null) => {
  const [data, setData] = useState<string | null>(null);
  const [hookRecordId, setHookRecordId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Set up real-time subscription when we have a record ID
  useEffect(() => {
    if (!hookRecordId) {
      return;
    }

    console.log('Setting up real-time subscription for record ID:', hookRecordId);
    
    const channel = supabase
      .channel('blog-diagnostics')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'blog_diagnostics',
          filter: `id=eq.${hookRecordId}` 
        }, 
        (payload) => {
          console.log('Received real-time update:', payload);
          if (payload.new && payload.new.results) {
            setData(payload.new.results);
            setIsLoading(false);
          }
        }
      )
      .subscribe();
    
    // Clean up function
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hookRecordId]);

  // Function to create a new record in Supabase and get its ID
  const createWebhookRecord = async (formData: {
    url: string;
    nome: string;
    email: string;
    telefone: string;
    faturamento: string;
    results: string;
  }) => {
    if (!formData.url) {
      setError(new Error('Blog URL is required'));
      return null;
    }

    try {
      setIsLoading(true);
      console.log('Creating webhook record for:', formData);
      
      // Create a new record in Supabase
      const { data: newRecord, error: insertError } = await supabase
        .from('blog_diagnostics')
        .insert({
          url: formData.url,
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          faturamento: formData.faturamento,
          results: formData.results
        })
        .select();
      
      if (insertError) {
        throw insertError;
      }

      if (newRecord && newRecord.length > 0) {
        console.log('Created record with ID:', newRecord[0].id);
        setHookRecordId(newRecord[0].id);
        return newRecord[0].id;
      } else {
        throw new Error('Failed to create record');
      }
      
    } catch (err) {
      console.error('Error creating webhook record:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsLoading(false);
      return null;
    }
  };

  // Function to manually fetch the data for a specific record ID
  const fetchWebhookData = async (id: string) => {
    if (!id) {
      setError(new Error('Record ID is required'));
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching webhook data for record ID:', id);
      
      // Query Supabase for the record
      const { data: diagnosticData, error: queryError } = await supabase
        .from('blog_diagnostics')
        .select('results')
        .eq('id', id)
        .single();
      
      if (queryError) {
        throw queryError;
      }

      if (diagnosticData && diagnosticData.results) {
        setData(diagnosticData.results);
      } else {
        console.log('No diagnostic data found for this record');
        setData(null);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching webhook data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsLoading(false);
    }
  };

  return { 
    data, 
    isLoading, 
    error, 
    recordId: hookRecordId, 
    setRecordId: setHookRecordId,
    createWebhookRecord,
    fetchWebhookData
  };
};
