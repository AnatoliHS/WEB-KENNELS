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

    // Map of field names to full questions
    const questionMap = {
        name: 'Full Name',
        address: 'Address',
        city: 'City',
        provState: 'Prov/State',
        postalCode: 'Postal Code',
        homePhone: 'Home Phone',
        cellPhone: 'Cell Phone',
        email: 'E-mail',
        sex: 'I would like a (Sex):',
        pattern: 'Coat color pattern preference:',
        shade: 'Coat color shade preference:',
        coatLength: 'Coat length preference:',
        preferredPair: 'Preferred Upcoming Pair:',
        breedQuality: 'Interest in Breed Quality/Show pup?',
        petOnly: 'Just a pet & plan to spay/neuter?',
        xrayAgreement: 'Do you agree to have hips/elbows x-rayed between 12-30 months?',
        mailman: 'The mailman knocks at the door with a package delivery, I want my dog to:',
        mailman_other: 'Mailman Reaction (Other):',
        park: 'Meeting old friends in the park, I want my dog to:',
        park_other: 'Park Reaction (Other):',
        temp_details: 'Tell us more about the temperament you are seeking:',
        housing: 'Housing Type:',
        location: 'Location:',
        propertyStatus: 'Property Status:',
        landlordEmail: 'Landlord Email',
        landlordPhone: 'Landlord Phone',
        landlordAddress: 'Landlord Address',
        fenced: 'Do you have a fenced yard?',
        fence_info: 'Describe material type, height, and size of enclosed area:',
        timeSpent: 'Where will the dog spend most of its time?',
        hoursAlone: 'How many hours of the day would the dog normally be left alone?',
        current_dogs: 'Please list current dogs in household (Age, Breed, Sex, Spayed/Neutered):',
        numAdults: 'Number of Adults',
        numChildren: 'Number of Children',
        agesChildren: 'Ages of Children',
        futureChildren: 'Expect children in the future?',
        numCats: 'Number of Cats',
        otherAnimals: 'Other Animals',
        training: 'I am interested in training my dog in:',
        experience: 'Your experience with large breed dogs:',
        lifestyle: 'Lifestyle Description:',
        ref1_name: 'Reference #1 Name',
        ref1_phone: 'Reference #1 Phone',
        ref1_email: 'Reference #1 Email',
        ref2_name: 'Reference #2 Name',
        ref2_phone: 'Reference #2 Phone',
        ref2_email: 'Reference #2 Email',
        additional_comments: 'Additional Comments',
        signature: 'Digital Signature'
    };

    // Build dynamic HTML body
    let htmlContent = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">`;
    htmlContent += `<h2>New Website Submission</h2>`;
    htmlContent += `<table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">`;

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue; // Skip hidden or internal fields

      // Format the key to be more readable
      const formattedKey = questionMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
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
