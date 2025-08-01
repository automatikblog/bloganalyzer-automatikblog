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
    perfil: '',
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
  const [clickId, setClickId] = useState('');
  
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

  // Função util para pegar cookie
  const getCookieValue = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  };

  // Capturar cookie na montagem
  useEffect(() => {
    const cid = getCookieValue('mcclickid-store');
    if (cid) setClickId(cid);
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
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Análise Gratuita do Seu Blog</h2>
            <p className="text-gray-600">Descubra como potencializar seu blog WordPress em minutos</p>
          </div>
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
              Analisar Agora
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-gray-600">Análise em 2 minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-gray-600">100% gratuito</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-gray-600">Resultados instantâneos</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
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
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">Enquanto isso, saiba que você está no caminho certo!</p>
            <p className="text-sm text-gray-600 mt-2">Nossa análise vai te mostrar exatamente como melhorar seu blog.</p>
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
            <p className="text-sm text-gray-500 mt-2">
              Receba um diagnóstico completo e personalizado do seu blog
            </p>
          </DialogHeader>
          <form
            className="grid gap-4 py-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError("");
              setMsg("");

              try {
                const latestClickId = getCookieValue('mcclickid-store') || clickId;
                const record_id = await createWebhookRecord({
                  url: url,
                  nome: formData.nome,
                  email: formData.email,
                  telefone: formData.telefone,
                  faturamento: formData.faturamento_com_blog,
                  results: '',
                });
                const payload = {
                  ...formData,
                  formId: '14',
                  formName: 'appanalyze',
                  url: url,
                  record_id,
                  clickid: latestClickId,
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
                  perfil: '',
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
            {/* Perfil */}
            <div className="grid gap-2">
              <Label htmlFor="perfil">Qual o seu perfil?</Label>
              <select
                id="perfil"
                name="perfil"
                className="px-4 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                value={formData.perfil}
                onChange={handleFormChange}
                required
              >
                <option value="">Selecione seu perfil</option>
                <option value="Sou dono de negócio">Sou dono de negócio</option>
                <option value="Tenho uma agência de marketing">Tenho uma agência de marketing</option>
                <option value="Sou especialista em SEO">Sou especialista em SEO</option>
                <option value="Sou freelancer">Sou freelancer</option>
                <option value="Sou afiliado">Sou afiliado</option>
                <option value="Trabalho em agência de marketing">Trabalho em agência de marketing</option>
                <option value="Tenho um blog pessoal ou projeto próprio">Tenho um blog pessoal ou projeto próprio</option>
                <option value="Tenho um portal de notícias">Tenho um portal de notícias</option>
              </select>
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
                {loading ? 'Enviando...' : 'Receber Análise'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Seção de dados estatísticos com elementos gráficos */}
      <div className="bg-white p-8 rounded-lg shadow-md mt-12">
        <h3 className="text-2xl font-bold text-center mb-8">Por que a IA está revolucionando o marketing de conteúdo?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Card 1 - Gráfico circular 88% */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-blue-900">Uso de IA no Marketing</h4>
              <div className="relative w-20 h-20">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-blue-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                  <circle className="text-blue-600" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="30.144" strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-blue-600">88%</span>
              </div>
            </div>
            <p className="text-blue-800">dos profissionais de marketing já utilizam IA em suas funções diárias</p>
            <p className="text-xs text-blue-600 mt-2">Fonte: SurveyMonkey</p>
          </div>

          {/* Card 2 - Gráfico de barras 53% */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-purple-900">Geração de Conteúdo</h4>
              <div className="relative w-20 h-20">
                <div className="absolute bottom-0 left-0 w-full h-[53%] bg-purple-500 rounded-t"></div>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-purple-600">53%</span>
              </div>
            </div>
            <p className="text-purple-800">dos profissionais usam IA para gerar conteúdo e fazer edições</p>
            <p className="text-xs text-purple-600 mt-2">Fonte: WPBeginner</p>
          </div>

          {/* Card 3 - Gráfico linha 7.8x */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-green-900">Crescimento de Tráfego</h4>
              <div className="relative w-20 h-20">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <path className="text-green-500" strokeWidth="4" stroke="currentColor" fill="none" d="M10,80 L30,60 L50,70 L70,40 L90,20" />
                  <circle className="text-green-500" cx="90" cy="20" r="4" fill="currentColor" />
                </svg>
                <span className="absolute top-0 right-0 text-2xl font-bold text-green-600">7.8x</span>
              </div>
            </div>
            <p className="text-green-800">mais tráfego para líderes de marketing de conteúdo</p>
            <p className="text-xs text-green-600 mt-2">Fonte: Neil Patel</p>
          </div>

          {/* Card 4 - Gráfico pizza 50% */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-orange-900">Adoção Empresarial</h4>
              <div className="relative w-20 h-20">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <path className="text-orange-500" d="M50,50 L50,10 A40,40 0 0,1 90,50 Z" />
                  <path className="text-orange-200" d="M50,50 L90,50 A40,40 0 0,1 50,90 Z" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-orange-600">50%</span>
              </div>
            </div>
            <p className="text-orange-800">das empresas já estão utilizando IA em marketing</p>
            <p className="text-xs text-orange-600 mt-2">Fonte: SEO.com</p>
          </div>
        </div>

        {/* Card de destaque */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-xl text-white">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-2">Transforme seu blog em uma máquina de produção</h4>
              <p className="text-blue-100">Com automação inteligente de conteúdo, multiplique sua audiência e potencialize seus resultados</p>
              <p className="text-xs text-blue-200 mt-2">Fonte: Facebook - Automação inteligente de conteúdo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção: Como a Automatik Blog Transforma Seu Marketing de Conteúdo */}
      <div className="bg-white p-8 rounded-lg shadow-md mt-12">
        <h3 className="text-2xl font-bold text-center mb-6">Como a Automatik Blog Transforma Seu Marketing de Conteúdo</h3>

        <p className="text-center text-gray-700 max-w-2xl mx-auto mb-10">
          A <span className="font-semibold">Automatik Blog</span> é a solução definitiva que automatiza a criação de artigos e webstories usando Inteligência Artificial, permitindo que você publique conteúdo de alta qualidade em poucos minutos.
        </p>

        {/* Benefícios diretos ligados aos dados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Economia de Tempo */}
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 bg-blue-100 text-blue-600 p-3 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Economia de Tempo e Recursos</h4>
              <p className="text-sm text-gray-600">Crie dezenas de artigos em minutos, não dias, liberando seu tempo para focar em estratégias de alto nível — assim como <span className="font-semibold">53% dos profissionais de marketing</span> que usam IA para gerar conteúdo.</p>
            </div>
          </div>

          {/* Aumento de Tráfego */}
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 bg-green-100 text-green-600 p-3 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Aumento de Tráfego e Faturamento</h4>
              <p className="text-sm text-gray-600">Multiplique sua audiência com conteúdo otimizado para SEO, seguindo o exemplo de líderes que obtêm <span className="font-semibold">7.8x mais tráfego</span> em comparação aos seguidores.</p>
            </div>
          </div>

          {/* Conteúdo otimizado */}
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 bg-purple-100 text-purple-600 p-3 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 5l-4 4-4-4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v11" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Conteúdo Otimizado para SEO</h4>
              <p className="text-sm text-gray-600">Nossa IA garante artigos e webstories prontos para ranquear no Google, aproveitando o poder da IA generativa para selecionar palavras-chave eficazes.</p>
            </div>
          </div>

          {/* Competitividade */}
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 bg-orange-100 text-orange-600 p-3 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 2l3 7h7l-5.5 4 2 7-6-4.5L7 20l2-7L3.5 9h7L13 2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Mantenha-se Competitivo</h4>
              <p className="text-sm text-gray-600">Junte-se aos <span className="font-semibold">50% das empresas</span> que já utilizam IA em marketing e não fique para trás na corrida pela atenção do público.</p>
            </div>
          </div>
        </div>

        {/* Diferenciais */}
        <h4 className="text-xl font-bold text-center mb-6">Diferenciais da Automatik Blog</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
            <svg className="w-10 h-10 text-blue-600 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 12l9-5-9-5-9 5 9 5z" />
            </svg>
            <h5 className="font-semibold mb-1">Artigos Otimizados para SEO</h5>
            <p className="text-sm text-gray-600">Conteúdo criado já pensando em ranquear nas primeiras posições.</p>
          </div>
          <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-100">
            <svg className="w-10 h-10 text-purple-600 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v16" />
            </svg>
            <h5 className="font-semibold mb-1">Webstories</h5>
            <p className="text-sm text-gray-600">Crie webstories envolventes para ampliar sua presença e engajamento.</p>
          </div>
          <div className="text-center p-6 bg-green-50 rounded-xl border border-green-100">
            <svg className="w-10 h-10 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h5 className="font-semibold mb-1">Qualidade do Conteúdo</h5>
            <p className="text-sm text-gray-600">Texto de alta qualidade que se assemelha ao produzido por humanos.</p>
          </div>
        </div>

        {/* CTA Reforçada */}
        <div className="text-center">
          <Button
            className="gradient-bg text-white font-medium px-8 py-6 text-lg"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Analise seu blog agora
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticForm;
