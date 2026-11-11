// Where the enquiry forms (registration, partnership, nomination) send their data.
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

// Nomination registration + online payment (Awards page, "Select Plan" flow).
//
// The page never marks a registration as paid on its own. Payment needs a small server (or serverless
// function) that keeps your gateway secret. This page is written for Razorpay Checkout; the two endpoints are:
//
//  createOrderEndpoint  POST application/json  (CORS enabled)
//     Request : { reference, plan, amount: { base, gstRate, gst, total, currency }, fields: { name, mobile, email,
//                 company, designation, gstin }, sectors: [..], categories: [..], lang, utm, ... }
//     Do      : look up the plan price on the SERVER (never trust `amount` from the browser), add GST, store the
//               registration as "payment initiated", create a gateway order for the total.
//     Response: { keyId, orderId, amount /* in paise */, currency: "INR", reference }
//
//  verifyEndpoint       POST application/json  (CORS enabled)
//     Request : { reference, razorpay_order_id, razorpay_payment_id, razorpay_signature }
//     Do      : verify the signature server-side, mark the registration paid, email the confirmation.
//     Response: { ok: true, reference } on success, { ok: false } otherwise.
//
// Leave createOrderEndpoint empty and the popup still collects the registration (sent to NBT_FORMS.endpoint, or by
// email) and tells the visitor that payment is not switched on yet, instead of showing a false "paid" state.
window.NBT_PAY = {
  createOrderEndpoint: "",
  verifyEndpoint: "",
  gstRate: 18,   // percent, shown as "GST @18%"
  checkoutScript: "https://checkout.razorpay.com/v1/checkout.js"
};
