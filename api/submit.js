export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GHL_API_KEY = process.env.GHL_API_KEY || 'pit-1651c4b6-2f58-435b-a136-346eaaa8a3dd';
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'QfLnqqz1mgSKcXLkKK5c';
  const GHL_API_VERSION = '2021-07-28';
  const GHL_PIPELINE_ID = '9rYvSIxxmpoy4YYNawD9';
  const GHL_STAGE_ID = 'a0974c5d-64c0-4e31-8f36-2991e33a7a27';

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + GHL_API_KEY,
    'Version': GHL_API_VERSION
  };

  try {
    let data = req.body;
    // If body is a string (e.g. from some middleware), parse it
    if (typeof data === 'string') data = JSON.parse(data);

    const { nom, entreprise, telephone, email, message } = data;

    if (!nom || !email) {
      return res.status(400).json({ error: 'nom and email are required' });
    }

    // Split full name into first/last
    const nameParts = nom.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // 1. Create contact
    const contactPayload = {
      locationId: GHL_LOCATION_ID,
      firstName,
      lastName: lastName || '',
      email,
      companyName: entreprise || ''
    };
    if (telephone) contactPayload.phone = telephone;

    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers,
      body: JSON.stringify(contactPayload)
    });
    const contactData = await contactRes.json();

    if (!contactRes.ok) {
      return res.status(contactRes.status).json({ error: contactData.message || 'Contact creation failed' });
    }

    const contactId = contactData.contact?.id || contactData.id;

    // 2. Create opportunity in pipeline
    const oppPayload = {
      locationId: GHL_LOCATION_ID,
      contactId,
      pipelineId: GHL_PIPELINE_ID,
      pipelineStageId: GHL_STAGE_ID,
      name: 'Lead landing - ' + firstName,
      status: 'open',
      monetaryValue: 0
    };

    const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers,
      body: JSON.stringify(oppPayload)
    });
    const oppData = await oppRes.json();

    if (!oppRes.ok) {
      return res.status(oppRes.status).json({ error: oppData.message || 'Opportunity creation failed' });
    }

    return res.status(201).json({
      success: true,
      contactId,
      opportunityId: oppData.id
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
