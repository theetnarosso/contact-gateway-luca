document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("contactForm");
  var statusEl = document.getElementById("formStatus");
  var contactDetails = document.getElementById("contactDetails");
  var yearEl = document.getElementById("year");

  var RECAPTCHA_SITE_KEY = "6LcK_g8sAAAAAIY9MhWxquc8awqEsltRSLZvyzhe";
  var FORMSPREE_ENDPOINT = "https://formspree.io/f/mwpagjwe";

  // Set footer year
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  if (!form) {
    return;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    statusEl.textContent = "";
    statusEl.className = "form-status";

    var formData = new FormData(form);

    var fields = [
      "firstName",
      "lastName",
      "phone",
      "email",
      "reason",
      "personalRelation",
      "businessRelation"
    ];

    clearErrors(form, fields);

    var errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      showErrors(form, errors);
      statusEl.textContent = "Please correct the highlighted fields and try again.";
      statusEl.classList.add("error");
      return;
    }

    // Optional: store lead locally in this browser
    saveLeadLocally(formData);

    var payload = {
      firstName: (formData.get("firstName") || "").trim(),
      lastName: (formData.get("lastName") || "").trim(),
      phone: (formData.get("phone") || "").trim(),
      email: (formData.get("email") || "").trim(),
      reason: (formData.get("reason") || "").trim(),
      personalRelation: (formData.get("personalRelation") || "").trim(),
      businessRelation: (formData.get("businessRelation") || "").trim(),
      submittedAt: new Date().toISOString()
    };

    statusEl.textContent = "Verifying identity (reCAPTCHA)...";
    statusEl.className = "form-status";

    if (typeof grecaptcha === "undefined") {
      statusEl.textContent =
        "reCAPTCHA failed to load. Please refresh the page and try again.";
      statusEl.classList.add("error");
      return;
    }

    grecaptcha.ready(function () {
      grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "submit" })
        .then(function (token) {
          payload["g-recaptcha-response"] = token;

          statusEl.textContent = "Sending your request...";
          statusEl.className = "form-status";

          sendLeadEmail(payload)
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

  // ---------- Validation helpers ----------

  function validateForm(formData) {
    var errors = {};

    var firstName = (formData.get("firstName") || "").trim();
    var lastName = (formData.get("lastName") || "").trim();
    var phone = (formData.get("phone") || "").trim();
    var email = (formData.get("email") || "").trim();
    var reason = (formData.get("reason") || "").trim();

    if (!firstName) {
      errors.firstName = "Name is required.";
    }
    if (!lastName) {
      errors.lastName = "Last name is required.";
    }
    if (!phone) {
      errors.phone = "Phone is required.";
    }

    if (!email) {
      errors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      errors.email = "Please enter a valid email.";
    }

    if (!reason) {
      errors.reason = "Please describe the reason for contact.";
    }

    return errors;
  }

  function isValidEmail(email) {
    var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }

  function clearErrors(form, fields) {
    fields.forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;

      input.classList.remove("error");
      var fieldContainer = input.closest(".field");
      if (fieldContainer) {
        var errorMsg = fieldContainer.querySelector(".error-msg");
        if (errorMsg) {
          errorMsg.textContent = "";
        }
      }
    });
  }

  function showErrors(form, errors) {
    Object.keys(errors).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;

      input.classList.add("error");
      var fieldContainer = input.closest(".field");
      if (fieldContainer) {
        var errorMsg = fieldContainer.querySelector(".error-msg");
        if (errorMsg) {
          errorMsg.textContent = errors[name];
        }
      }
    });
  }

  // ---------- Local storage (optional) ----------

  function saveLeadLocally(formData) {
    var lead = {
      firstName: (formData.get("firstName") || "").trim(),
      lastName: (formData.get("lastName") || "").trim(),
      phone: (formData.get("phone") || "").trim(),
      email: (formData.get("email") || "").trim(),
      reason: (formData.get("reason") || "").trim(),
      personalRelation: (formData.get("personalRelation") || "").trim(),
      businessRelation: (formData.get("businessRelation") || "").trim(),
      timestamp: new Date().toISOString()
    };

    try {
      var existingRaw = localStorage.getItem("luca_contact_leads") || "[]";
      var existing = JSON.parse(existingRaw);
      existing.push(lead);
      localStorage.setItem("luca_contact_leads", JSON.stringify(existing));
    } catch (e) {
      console.warn("Local storage save failed:", e);
    }
  }

  // ---------- Formspree call ----------

  function sendLeadEmail(payload) {
    return fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Email failed");
      }
      return response.json().catch(function () {
        return {};
      });
    });
  }
});
