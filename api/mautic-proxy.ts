import getRawBody from 'raw-body';

// Desabilita o parser padrão para conseguirmos o corpo cru (multipart)
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
    // Lê o corpo cru da requisição (Buffer) de forma compatível com Vercel
    const bodyBuffer = await getRawBody(req);

    // Repassa para o Mautic
    const mauticResponse = await fetch(
      'https://mautic.automatiklabs.com/form/submit?formId=14',
      {
        method: 'POST',
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/octet-stream',
        },
        body: bodyBuffer,
      }
    )

    const data = await mauticResponse.text()
    res.status(mauticResponse.status).send(data)
  } catch (err: any) {
    console.error('Erro no proxy Mautic:', err);
    res.status(500).json({ error: 'Erro ao repassar para o Mautic', details: err?.message, stack: err?.stack });
  }
} 