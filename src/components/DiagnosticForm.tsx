import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useSupabaseWebhook } from '@/hooks/use-supabase-webhook';
import { supabase } from '@/integrations/supabase/client';

const DiagnosticForm = ({ hideResetButton = false }: { hideResetButton?: boolean }) => {
  const [url, setUrl] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    faturamento: ''
  });
  const [timeoutProgress, setTimeoutProgress] = useState(0);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  const { toast } = useToast();
  const { 
    data: results, 
    isLoading, 
    error, 
    recordId: hookRecordId, 
    createWebhookRecord
  } = useSupabaseWebhook(url);

  // Explicit useEffect to update results in Supabase when they arrive
  useEffect(() => {
    if (hookRecordId && results) {
      console.log('DiagnosticForm: Explicitly updating results in Supabase:', results);
      
      supabase
        .from('blog_diagnostics')
        .update({ results })
        .eq('id', hookRecordId)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to update results:', error);
            toast({
              title: "Erro ao salvar resultados",
              description: error.message,
              variant: "destructive"
            });
          } else {
            console.log('Successfully updated results from DiagnosticForm');
          }
        });
    }
  }, [hookRecordId, results, toast]);

  // Handle timeout progress
  useEffect(() => {
    if (isLoading) {
      const startTime = Date.now();
      const timeoutDuration = 120000; // 2 minutes
      const endTime = startTime + timeoutDuration;
      
      // Update progress every second
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsedTime = now - startTime;
        const progress = Math.min((elapsedTime / timeoutDuration) * 100, 100);
        setTimeoutProgress(progress);
        
        if (now >= endTime) {
          clearInterval(interval);
          if (isLoading) {
            toast({
              title: "Tempo esgotado",
              description: "O backend não respondeu dentro do tempo limite.",
              variant: "destructive"
            });
          }
        }
      }, 1000);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      setTimeoutProgress(0);
    }
  }, [isLoading, toast]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Show error toast when error state changes
  useEffect(() => {
    if (error) {
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const isValidWordPressURL = (url: string) => {
    const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)\/?$/;
    return urlPattern.test(url);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleStartAnalysis = () => {
    if (!isValidWordPressURL(url)) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida de um blog WordPress.",
        variant: "destructive"
      });
      return;
    }
    
    setIsDialogOpen(true);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFaturamentoChange = (value: string) => {
    setFormData(prev => ({ ...prev, faturamento: value }));
  };
  
  const handleAnalyzeSubmit = async () => {
    if (!formData.nome || !formData.email || !formData.telefone || !formData.faturamento) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos do formulário.",
        variant: "destructive"
      });
      return;
    }
    
    setIsDialogOpen(false);
    setFormSubmitted(true);
    
    try {
      const newRecordId = await createWebhookRecord({
        url,
        ...formData,
        results: '' // Include empty initial results as plain string
      });
      
      if (!newRecordId) {
        throw new Error('Falha ao criar registro no Supabase');
      }
      
      console.log('Created Supabase record with ID:', newRecordId);
      
      const payload = {
        url,
        ...formData,
        record_id: newRecordId,
        results: '' // Include empty initial results as a string
      };
      
      // Primeiro webhook - Envia para o backend AutomatikLabs
      console.log('Sending data to AutomatikLabs webhook:', payload);
      const automatikResponse = await fetch('https://webhooks.automatiklabs.com/webhook/testar-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!automatikResponse.ok) {
        console.error('Error response from AutomatikLabs webhook:', automatikResponse.status);
        const errorText = await automatikResponse.text();
        console.error('Error details:', errorText);
        
        toast({
          title: "Erro na comunicação",
          description: `O servidor retornou um erro: ${automatikResponse.status}`,
          variant: "destructive"
        });
        return;
      }

      // Pegar os resultados do AutomatikLabs
      const automatikData = await automatikResponse.json();
      console.log('AutomatikLabs response (raw):', automatikData);
      console.log('AutomatikLabs response type:', typeof automatikData);
      
      // Garantir que temos uma string de resultados
      let resultsString = '';
      if (typeof automatikData === 'string') {
        resultsString = automatikData;
      } else if (automatikData && typeof automatikData === 'object') {
        if (automatikData.results) {
          resultsString = typeof automatikData.results === 'string' 
            ? automatikData.results 
            : JSON.stringify(automatikData.results);
        } else {
          resultsString = JSON.stringify(automatikData);
        }
      }
      
      console.log('Processed results string:', resultsString);

      // Segundo webhook - Atualiza o Supabase com os resultados do AutomatikLabs
      console.log('Sending data to Supabase webhook:', {
        ...payload,
        results: resultsString
      });
      const supabaseResponse = await fetch('https://rgtolkmdzhmwotkvbone.supabase.co/functions/v1/webhook-receiver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          results: resultsString
        }),
      });

      const responseData = await supabaseResponse.json();
      console.log('Supabase webhook response:', responseData);

      if (!supabaseResponse.ok) {
        console.error('Error response from Supabase webhook:', supabaseResponse.status);
        console.error('Error details:', responseData);
        
        toast({
          title: "Erro na atualização",
          description: `Erro ao atualizar o Supabase: ${responseData.error || supabaseResponse.status}`,
          variant: "destructive"
        });
      } else {
        console.log('Update successful:', responseData.debug);
      }
      
      const timeout = setTimeout(() => {
        if (isLoading) {
          toast({
            title: "Tempo esgotado",
            description: "O backend não respondeu dentro do tempo limite.",
            variant: "destructive"
          });
        }
      }, 120000); // 2 minutes
      
      setTimeoutId(timeout);
    } catch (error) {
      console.error('Error sending data:', error);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
      
      setFormSubmitted(false);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao analisar seu blog. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  const hasFailures = results && results.includes('❌');
  
  const resetAnalysis = () => {
    setUrl('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {!results && !isLoading && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="https://seublog.wordpress.com"
              value={url}
              onChange={handleUrlChange}
              className="flex-grow"
            />
            <Button 
              onClick={handleStartAnalysis}
              className="gradient-bg text-white font-medium"
            >
              Analisar
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            *O site precisa ser WordPress para diagnóstico completo
          </p>
        </div>
      )}
      
      {/* Loading só aparece se o formulário foi enviado e não chegou resultado real */}
      {formSubmitted && (!results || results.trim() === '{"message":"Workflow was started"}') ? (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
          <div className="h-16 w-16 border-4 border-t-automatik-cyan rounded-full animate-spin mb-4"></div>
          <p className="mt-2 text-lg font-medium">Analisando seu blog...</p>
          <p className="text-sm text-gray-500 mb-4">Isso pode levar até 2 minutos</p>
          <div className="w-full max-w-md">
            <Progress value={timeoutProgress} className="h-2" />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>0s</span>
              <span>1min</span>
              <span>2min</span>
            </div>
          </div>
        </div>
      ) : results && results.trim() !== '{"message":"Workflow was started"}' ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Resultados da Análise</h2>
          {/* Layout em linhas */}
          <div className="flex flex-col gap-2 mb-6">
            {results.split('\n').filter(line => line.trim() !== '').map((line, index) => (
              <div key={index} className="rounded-md px-4 py-2 bg-gray-50 flex items-center gap-2">
                <span className={`${line.includes('❌') ? 'text-red-500' : 'text-green-600'} text-xl`}>
                  {line.includes('❌') ? '❌' : '✅'}
                </span>
                <span className={`${line.includes('❌') ? 'text-red-500' : 'text-green-600'}`}>
                  {line.replace('❌ ', '').replace('✅ ', '')}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-lg bg-gray-50">
            <h3 className="text-xl font-semibold text-center mb-4">
              {hasFailures 
                ? "Seu blog possui um ou mais pontos que podem ser melhorados." 
                : "Uau, seu blog está espetacular! Mas saiba que com a Automatik Blog você pode ir ainda mais longe."}
            </h3>
            <div className="flex justify-center mt-4">
              <a href="https://automatikblog.com" target="_blank" rel="noopener noreferrer">
                <Button className="gradient-bg text-white font-medium">
                  Ver como a Automatik Blog pode ajudar
                </Button>
              </a>
            </div>
          </div>
          {/* Esconde o botão se hideResetButton for true */}
          {!hideResetButton && (
            <Button 
              variant="outline" 
              className="mt-4 w-full"
              onClick={resetAnalysis}
            >
              Analisar outro blog
            </Button>
          )}
        </div>
      ) : null}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete seus dados para análise</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleFormChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleFormChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Faturamento mensal com o blog</Label>
              <Select onValueChange={handleFaturamentoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma faixa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Não faturo ainda</SelectItem>
                  <SelectItem value="1-1000">Entre R$ 1 e R$ 1.000</SelectItem>
                  <SelectItem value="1001-5000">Entre R$ 1.001 e R$ 5.000</SelectItem>
                  <SelectItem value="5001-10000">Entre R$ 5.001 e R$ 10.000</SelectItem>
                  <SelectItem value="10001-50000">Entre R$ 10.001 e R$ 50.000</SelectItem>
                  <SelectItem value="50001+">Acima de R$ 50.000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAnalyzeSubmit} className="gradient-bg text-white">
              Analisar meu blog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiagnosticForm;
