export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const data = {};
    const attachments = [];

    // Process form data, handling multiple values for checkboxes and extracting files
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();
        
        // Safely and efficiently convert ArrayBuffer to Base64 using chunks
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const chunkSize = 8192; // Process 8KB chunks at a time
        
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        
        attachments.push({
          filename: value.name || 'attachment.pdf',
          content: btoa(binary)
        });
        continue;
      }

      if (data[key]) {
        if (!Array.isArray(data[key])) {
          data[key] = [data[key]];
        }
        data[key].push(value);
      } else {
        data[key] = value;
      }
    }

    // Build dynamic HTML body
    let htmlContent = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">`;
    htmlContent += `<h2>New Website Submission</h2>`;
    htmlContent += `<table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">`;

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue; // Skip hidden or internal fields

      // Format the key to be more readable
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const displayValue = Array.isArray(value) ? value.join(', ') : value;

      htmlContent += `
            <tr>
                <td style="font-weight: bold; background-color: #f8f9fa; width: 35%;">${formattedKey}</td>
                <td>${displayValue || '<em>Not provided</em>'}</td>
            </tr>
        `;
    }
    htmlContent += `</table></div>`;

    // Determine subject based on form fields
    const subject = data.subject || (data.provState ? 'New Puppy Application!' : 'New Contact Form Submission!');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'noreply@wildernesskennels.ca',
        to: ['wildernesskennels@outlook.com'],
        reply_to: data.email,
        subject: subject,
        html: htmlContent,
        ...(attachments.length > 0 && { attachments })
      })
    });

    if (response.ok) {
      // Redirect to the thanks page
      const url = new URL(context.request.url);
      url.pathname = '/thanks';
      return Response.redirect(url.toString(), 302);
    } else {
      const errorData = await response.text();
      return new Response(JSON.stringify({ error: 'Failed to send email', details: errorData }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
