document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const statusEl = document.getElementById("formStatus");
  const contactDetails = document.getElementById("contactDetails");
  const yearEl = document.getElementById("year");

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
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

    // Save minimal record locally so you can later export if needed
    saveLeadLocally(formData);

    // Reveal contact details
    contactDetails.classList.add("visible");
    contactDetails.setAttribute("aria-hidden", "false");

    statusEl.textContent = "Thank you. Luca’s contact details are now visible below.";
    statusEl.classList.add("success");

    // Optionally reset the form (comment out if you prefer to keep values)
    // form.reset();
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
      errors.email = "Please enter a valid email address.";
    }

    if (!reason) errors.reason = "Please describe the reason for contacting.";

    return errors;
  }

  function isValidEmail(email) {
    // Basic email check – good enough for this use case
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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
      const existing = JSON.parse(localStorage.getItem("luca_contact_leads") || "[]");
      existing.push(lead);
      localStorage.setItem("luca_contact_leads", JSON.stringify(existing));
    } catch (e) {
      // If localStorage fails, we just skip persistence – no error to user.
      console.warn("Unable to save lead locally:", e);
    }
  }
});
