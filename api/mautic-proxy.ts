export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    // Importa raw-body dinamicamente (compatível com ESM)
    const getRawBody = (await import('raw-body')).default;
    const bodyBuffer = await getRawBody(req);

    // Converte o buffer para FormData
    const formData = new FormData();
    const text = bodyBuffer.toString('utf-8');
    const params = new URLSearchParams(text);
    
    for (const [key, value] of params.entries()) {
      formData.append(key, value);
    }

    // Repassa para o Mautic
    const mauticResponse = await fetch(
      'https://mautic.automatiklabs.com/form/submit?formId=14',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      }
    )

    if (!mauticResponse.ok) {
      throw new Error(`Mautic retornou status ${mauticResponse.status}`);
    }

    const data = await mauticResponse.text()
    res.status(mauticResponse.status).send(data)
  } catch (err: any) {
    console.error('Erro no proxy Mautic:', err);
    res.status(500).json({ 
      error: 'Erro ao repassar para o Mautic', 
      details: err?.message,
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined 
    });
  }
} 