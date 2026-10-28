export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nomor } = req.body;
  if (!nomor) {
    return res.status(400).json({ error: 'Nomor tidak boleh kosong' });
  }

  const API_URL = `https://api.jerexd.my.id/api/tools/spamopt?apikey=${process.env.JEREXD_API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomor })
    });

    const data = await response.text();
    return res.status(response.status).send(data);
  } catch (e) {
    return res.status(500).json({ error: 'Server error: ' + e.message });
  }
}
