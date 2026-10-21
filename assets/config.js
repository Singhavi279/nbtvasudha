// Where the three enquiry forms (registration, partnership, nomination) send their data.
//
// endpoint: paste the URL of your form-collection service here. It receives one
//           JSON POST per submission (sent as text/plain to avoid a CORS preflight), e.g. a
//           Google Apps Script web app writing to a Sheet, a CRM webhook, Formspree, etc.
//           Payload: { form, submittedAt, page, lang, utm, referrer, fields: { ... } }
//
// Leave it empty and each form falls back to opening a pre-filled email to the
// relevant contact (registration: Simran Singh, partnership: Deepika Pawar,
// nominations: Sagun Kumari), so nothing is lost before a backend exists.
window.NBT_FORMS = {
  endpoint: ""
};
