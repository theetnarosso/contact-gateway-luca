document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const statusEl = document.getElementById("formStatus");
  const contactDetails = document.getElementById("contactDetails");
  const yearEl = document.getElementById("year");
  const downloadBtn = document.getElementById("downloadCsvBtn");

  const RECAPTCHA_SITE_KEY = "6LcK_g8sAAAAAIY9MhWxquc8awqEsltRSLZvyzhe";

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      downloadLeadsCsv(statusEl);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    statusEl.textContent = "";
    statusEl.className = "form-status";

    const formData = new FormData(form);

    const fields = [
      "firstName",
      "lastName",
      "phone",
      "email",
      "reason",
      "personalRelation",
      "businessRelation",
    ];

    clearErrors(form, fields);

    const errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      showErrors(form, errors);
      statusEl.textContent =
        "Please correct the highlighted fields and try again.";
      statusEl.classList.add("error");
      return;
    }

    saveLeadLocally(formData);

    const payload = {
      firstName: formData.get("firstName")?.trim(),
      lastName: formData.get("lastName")?.trim(),
      phone: formData.get("phone")?.trim(),
      email: formData.get("email")?.trim(),
      reason: formData.get("reason")?.trim(),
      personalRelation: formData.get("personalRelation")?.trim(),
      businessRelation: formData.get("businessRelation")?.trim(),
      submittedAt: new Date().toISOString(),
    };

    statusEl.textContent = "Verifying identity (reCAPTCHA)...";
    statusEl.className = "form-status";

    grecaptcha.ready(() => {
      grecaptcha
        .execute(RECAPTCHA_SITE_KEY, { action: "submit" })
        .then((token) => {
          payload["g-recaptcha-response"] = token;

          statusEl.textContent = "Sending your request...";
          statusEl.className = "form-status";

          sendLeadEmail(payload)
            .then(() => {
              contactDetails.classList.add("visible");
              contactDetails.setAttribute("aria-hidden", "false");

              statusEl.textContent =
                "Thank you. Luca’s contact details are now visible below. A notification email has also been sent.";
              statusEl.classList.add("success");
            })
            .catch((err) => {
              console.error("Error sending email:", err);
              contactDetails.classList.add("visible");
              contactDetails.setAttribute("aria-hidden", "false");

              statusEl.textContent =
                "Contact info revealed — but email notification failed.";
              statusEl.classList.add("error");
            });
        })
        .catch((err) => {
          console.error("reCAPTCHA error:", err);
          statusEl.textContent =
            "There was a problem verifying you are human. Please try again.";
          statusEl.classList.add("error");
        });
    });
  });

  function validateForm(formData) {
    const errors = {};

    const firstName = formData.get("firstName")?.trim();
    const lastName = formData.get("lastName")?.trim();
    const phone = formData.get("phone")?.trim();
    const email = formData.get("email")?.trim();
    const reason = formData.get("reason")?.trim();

    if (!firstName) errors.firstName = "Name is required.";
    if (!lastName) errors.lastName = "Last name is required.";
    if (!phone) errors.phone = "Phone is required.";

    if (!email) {
      errors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      errors.email = "Please enter a valid email.";
    }

    if (!reason) errors.reason = "Please describe the reason for contact.";

    return errors;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function clearErrors(form, fields) {
    fields.forEach((name) => {
      const input = form.elements[name];
      if (!input) return;

      input.classList.remove("error");
      const fieldContainer = input.closest(".field");
      if (fieldContainer) {
        const errorMsg = fieldContainer.querySelector(".error-msg");
        if (errorMsg) errorMsg.textContent = "";
      }
    });
  }

  function showErrors(form, errors) {
    Object.entries(errors).forEach(([name, message]) => {
      const input = form.elements[name];
      if (!input) return;

      input.classList.add("error");
      const fieldContainer = input.closest(".field");
      if (fieldContainer) {
        const errorMsg = fieldContainer.querySelector(".error-msg");
        if (errorMsg) errorMsg.textContent = message;
      }
    });
  }

  function saveLeadLocally(formData) {
    const lead = {
      firstName: formData.get("firstName")?.trim(),
      lastName: formData.get("lastName")?.trim(),
      phone: formData.get("phone")?.trim(),
      email: formData.get("email")?.trim(),
      reason: formData.get("reason")?.trim(),
      personalRelation: formData.get("personalRelation")?.trim(),
      businessRelation: formData.get("businessRelation")?.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(
        localStorage.getItem("luca_contact_leads") || "[]"
      );
      existing.push(lead);
      localStorage.setItem("luca_contact_leads", JSON.stringify(existing));
    } catch (e) {
      console.warn("Local save failed:", e);
    }
  }

  function sendLeadEmail(payload) {
    // Formspree endpoint
    const endpoint = "https://formspree.io/f/mwpagjwe";

    return fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((response) => {
      if (!response.ok) throw new Error("Email failed");
      return response.json().catch(() => ({}));
    });
  }

  function downloadLeadsCsv(statusEl) {
    let raw = localStorage.getItem("luca_contact_leads");
    if (!raw) {
      statusEl.textContent = "No leads saved on this device.";
      statusEl.className = "form-status error";
      return;
    }

    let leads;
    try {
      leads = JSON.parse(raw);
    } catch (e) {
      statusEl.textContent = "Error reading saved leads.";
      statusEl.className = "form-status error";
      return;
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      statusEl.textContent = "No leads saved on this device.";
      statusEl.className = "form-status error";
      return;
    }

    const headers = [
      "First Name",
      "Last Name",
      "Phone",
      "Email",
      "Reason",
      "Personal Relation",
      "Business Relation",
      "Timestamp",
    ];

    const rows = [headers.join(",")];

    leads.forEach((lead) => {
      rows.push([
        escapeCsv(lead.firstName),
        escapeCsv(lead.lastName),
        escapeCsv(lead.phone),
        escapeCsv(lead.email),
        escapeCsv(lead.reason),
        escapeCsv(lead.personalRelation),
        escapeCsv(lead.businessRelation),
        escapeCsv(lead.timestamp),
      ].join(","));
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "luca-contact-leads.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    statusEl.textContent = "CSV exported (from local saved leads).";
    statusEl.classList.add("success");
  }

  function escapeCsv(value) {
    if (value === null || value === undefined) return """";
    const s = String(value).replace(/"/g, '""');
    return `"${s}"`;
  }
});
