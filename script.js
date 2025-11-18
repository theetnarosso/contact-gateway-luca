document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("contactForm");
  var statusEl = document.getElementById("formStatus");
  var contactDetails = document.getElementById("contactDetails");
  var yearEl = document.getElementById("year");

  var RECAPTCHA_SITE_KEY = "6LcK_g8sAAAAAIY9MhWxquc8awqEsltRSLZvyzhe";
  var FORMSPREE_ENDPOINT = "https://formspree.io/f/mwpagjwe";

  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    statusEl.textContent = "";
    statusEl.className = "form-status";

    var formData = new FormData(form);

    var fields = [
      "firstName","lastName","phone","email",
      "reason","personalRelation","businessRelation"
    ];

    clearErrors(form, fields);
    var errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      showErrors(form, errors);
      statusEl.textContent = "Please correct the highlighted fields and try again.";
      statusEl.classList.add("error");
      return;
    }

    saveLeadLocally(formData);

    statusEl.textContent = "Verifying identity (reCAPTCHA)...";
    statusEl.className = "form-status";

    if (typeof grecaptcha === "undefined") {
      statusEl.textContent = "reCAPTCHA failed to load. Please refresh and try again.";
      statusEl.classList.add("error");
      return;
    }

    grecaptcha.ready(function () {
      grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "submit" })
        .then(function (token) {
          formData.append("g-recaptcha-response", token);
          formData.append("submittedAt", new Date().toISOString());

          statusEl.textContent = "Sending your request...";
          statusEl.className = "form-status";

          sendLeadEmail(formData)
            .then(function () {
              contactDetails.classList.add("visible");
              contactDetails.setAttribute("aria-hidden", "false");

              statusEl.textContent =
                "Thank you. Luca’s contact details are now visible below. A notification email has also been sent.";
              statusEl.classList.add("success");
            })
            .catch(function (err) {
              console.error("Error sending email:", err);
              contactDetails.classList.add("visible");
              contactDetails.setAttribute("aria-hidden", "false");

              statusEl.textContent =
                "Contact info revealed, but email notification failed.";
              statusEl.classList.add("error");
            });
        })
        .catch(function (err) {
          console.error("reCAPTCHA error:", err);
          statusEl.textContent =
            "There was a problem verifying you are human. Please try again.";
          statusEl.classList.add("error");
        });
    });
  });

  function validateForm(fd) {
    var errors = {};
    var email = (fd.get("email") || "").trim();

    if (!(fd.get("firstName") || "").trim()) errors.firstName = "Name is required.";
    if (!(fd.get("lastName") || "").trim()) errors.lastName = "Last name is required.";
    if (!(fd.get("phone") || "").trim()) errors.phone = "Phone is required.";
    if (!email) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email.";
    if (!(fd.get("reason") || "").trim()) errors.reason = "Please describe the reason.";

    return errors;
  }

  function clearErrors(form, fields) {
    fields.forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      input.classList.remove("error");
      var c = input.closest(".field");
      if (c) {
        var e = c.querySelector(".error-msg");
        if (e) e.textContent = "";
      }
    });
  }

  function showErrors(form, errors) {
    Object.keys(errors).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      input.classList.add("error");
      var c = input.closest(".field");
      if (c) {
        var e = c.querySelector(".error-msg");
        if (e) e.textContent = errors[name];
      }
    });
  }

  function saveLeadLocally(fd) {
    var lead = {
      firstName: (fd.get("firstName")||"").trim(),
      lastName: (fd.get("lastName")||"").trim(),
      phone: (fd.get("phone")||"").trim(),
      email: (fd.get("email")||"").trim(),
      reason: (fd.get("reason")||"").trim(),
      personalRelation: (fd.get("personalRelation")||"").trim(),
      businessRelation: (fd.get("businessRelation")||"").trim(),
      timestamp: new Date().toISOString()
    };

    try {
      var existing = JSON.parse(localStorage.getItem("luca_contact_leads") || "[]");
      existing.push(lead);
      localStorage.setItem("luca_contact_leads", JSON.stringify(existing));
    } catch (e) { console.warn("LocalStorage failed:", e); }
  }

  function sendLeadEmail(formData) {
    return fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: { "Accept": "application/json" },
      body: formData
    }).then(function (response) {
      if (!response.ok) {
        return response.json().then(function (data) {
          console.error("Formspree error:", data);
          throw new Error("Formspree error");
        }).catch(function () {
          throw new Error("Formspree error");
        });
      }
      return response.json().catch(() => ({}));
    });
  }
});
