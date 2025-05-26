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
    // Lê o corpo cru da requisição (Buffer)
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', resolve)
      req.on('error', reject)
    })
    const bodyBuffer = Buffer.concat(chunks)

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
    res.status(500).json({ error: 'Erro ao repassar para o Mautic', details: err?.message })
  }
} 