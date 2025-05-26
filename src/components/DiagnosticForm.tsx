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
    utm_source: '',
    utm_campaign: '',
    utm_medium: '',
    utm_content: '',
    utm_term: '',
    cidade: '',
    estado: '',
    pais: '',
    dispositivo: '',
    url_pagina: '',
    app_blogwp: '',
    app_plano: '',
    faturamento_com_blog: '',
  });
  const [timeoutProgress, setTimeoutProgress] = useState(0);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { 
    data: results, 
    isLoading, 
    error: supabaseError, 
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
    if (supabaseError) {
      toast({
        title: "Erro na análise",
        description: supabaseError.message,
        variant: "destructive"
      });
    }
  }, [supabaseError, toast]);

  // Preenchimento automático dos campos extras
  useEffect(() => {
    // UTM
    const params = new URLSearchParams(window.location.search);
    setFormData((f) => ({
      ...f,
      utm_source: params.get('utm_source') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || '',
      url_pagina: window.location.href,
      dispositivo: navigator.userAgent,
    }));
    // Localização
    fetch('https://ipinfo.io/json')
      .then((res) => res.json())
      .then((data) => {
        setFormData((f) => ({
          ...f,
          cidade: data.city || '',
          estado: data.region || '',
          pais: data.country || '',
        }));
      });
  }, []);

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
  
  const handleTelefone = (value: string) => {
    value = value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6)
      value = value.replace(/^(\d{2})(\d{5})(\d{0,4})$/, '($1) $2-$3');
    else if (value.length > 2)
      value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    else value = value.replace(/^(\d{0,2})/, '($1');
    return value;
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'telefone') {
      setFormData((prev) => ({ ...prev, telefone: handleTelefone(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
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
          <form
            className="grid gap-4 py-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError("");
              setMsg("");
              // Montar dados para Mautic com nomes corretos
              const mauticData = new FormData();
              mauticData.append('mauticform[formId]', '14');
              mauticData.append('mauticform[formName]', 'appanalyze');
              Object.entries(formData).forEach(([k, v]) => {
                mauticData.append(`mauticform[${k}]`, v);
              });
              // Enviar para Mautic
              fetch('/api/mautic-proxy', {
                method: 'POST',
                body: mauticData,
                mode: 'no-cors',
              });
              // Enviar para o backend (webhook)
              try {
                const record_id = await createWebhookRecord({
                  url: formData.url_pagina,
                  nome: formData.nome,
                  email: formData.email,
                  telefone: formData.telefone,
                  faturamento: formData.faturamento_com_blog,
                  results: '',
                });
                const payload = {
                  url: formData.url_pagina,
                  nome: formData.nome,
                  email: formData.email,
                  telefone: formData.telefone,
                  faturamento: formData.faturamento_com_blog,
                  record_id,
                };
                await fetch('https://webhooks.automatiklabs.com/webhook/testar-blog', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                setMsg('Enviado com sucesso!');
                setFormData({
                  nome: '',
                  email: '',
                  telefone: '',
                  utm_source: '',
                  utm_campaign: '',
                  utm_medium: '',
                  utm_content: '',
                  utm_term: '',
                  cidade: '',
                  estado: '',
                  pais: '',
                  dispositivo: '',
                  url_pagina: '',
                  app_blogwp: '',
                  app_plano: '',
                  faturamento_com_blog: '',
                });
              } catch (error) {
                setError('Erro ao enviar o formulário.');
              }
              setLoading(false);
              setIsDialogOpen(false);
              setFormSubmitted(true);
            }}
            autoComplete="off"
          >
            {/* Nome */}
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                className="px-4 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                value={formData.nome}
                onChange={handleFormChange}
                required
              />
            </div>
            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                className="px-4 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                value={formData.email}
                onChange={handleFormChange}
                required
              />
            </div>
            {/* Telefone */}
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                className="px-4 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                value={formData.telefone}
                onChange={handleFormChange}
                maxLength={15}
                placeholder="(99) 99999-9999"
                required
              />
            </div>
            {/* Faturamento com blog */}
            <div className="grid gap-2">
              <Label htmlFor="faturamento_com_blog">Faturamento mensal com o blog</Label>
              <select
                id="faturamento_com_blog"
                name="faturamento_com_blog"
                className="px-4 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                value={formData.faturamento_com_blog}
                onChange={handleFormChange}
                required
              >
                <option value="">Selecione uma faixa</option>
                <option value="Não faturo ainda">Não faturo ainda</option>
                <option value="Entre R$ 1 e R$ 1.000">Entre R$ 1 e R$ 1.000</option>
                <option value="Entre R$ 1.001 e R$ 5.000">Entre R$ 1.001 e R$ 5.000</option>
                <option value="Entre R$ 5.001 e R$ 10.000">Entre R$ 5.001 e R$ 10.000</option>
                <option value="Entre R$ 10.001 e R$ 50.000">Entre R$ 10.001 e R$ 50.000</option>
                <option value="Acima de R$ 50.000">Acima de R$ 50.000</option>
              </select>
            </div>
            {/* Campos ocultos */}
            <input type="hidden" name="utm_source" value={formData.utm_source} />
            <input type="hidden" name="utm_campaign" value={formData.utm_campaign} />
            <input type="hidden" name="utm_medium" value={formData.utm_medium} />
            <input type="hidden" name="utm_content" value={formData.utm_content} />
            <input type="hidden" name="utm_term" value={formData.utm_term} />
            <input type="hidden" name="cidade" value={formData.cidade} />
            <input type="hidden" name="estado" value={formData.estado} />
            <input type="hidden" name="pais" value={formData.pais} />
            <input type="hidden" name="dispositivo" value={formData.dispositivo} />
            <input type="hidden" name="url_pagina" value={formData.url_pagina} />
            <input type="hidden" name="app_blogwp" value={formData.app_blogwp} />
            <input type="hidden" name="app_plano" value={formData.app_plano} />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-bg text-white" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiagnosticForm;
