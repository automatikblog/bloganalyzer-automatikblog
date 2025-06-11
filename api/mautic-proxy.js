export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    // Log para debug
    console.log('Body recebido:', body);

    const mauticResponse = await fetch(
      'https://mautic.automatiklabs.com/form/submit?formId=14',
      {
        method: 'POST',
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
        },
        body,
      }
    );

    if (!mauticResponse.ok) {
      throw new Error(`Mautic retornou status ${mauticResponse.status}`);
    }

    const data = await mauticResponse.text();
    res.status(mauticResponse.status).send(data);
  } catch (err) {
    console.error('Erro no proxy Mautic:', err);
    res.status(500).json({
      error: 'Erro ao repassar para o Mautic',
      details: err?.message,
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
    });
  }
} 