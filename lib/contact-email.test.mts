import assert from "node:assert/strict";
import test from "node:test";

import {
  buildContactEmailHtml,
  contactMessageSchema,
  getContactEmailSettings,
} from "./contact-email.ts";

test("accepts and trims valid contact messages", () => {
  const payload = contactMessageSchema.safeParse({
    name: "  Zhenyu  ",
    email: "sender@example.com",
    subject: "  Feedback  ",
    message: "  The generator looks useful.  ",
    company: "",
  });

  assert.equal(payload.success, true);
  assert.equal(payload.success ? payload.data.name : "", "Zhenyu");
  assert.equal(payload.success ? payload.data.subject : "", "Feedback");
});

test("rejects invalid contact messages and filled honeypot fields", () => {
  assert.equal(
    contactMessageSchema.safeParse({
      name: "A",
      email: "not-an-email",
      subject: "Hi",
      message: "Short",
      company: "bot company",
    }).success,
    false,
  );
});

test("builds default Resend settings for the domain inbox", () => {
  const settings = getContactEmailSettings({
    RESEND_API_KEY: "re_test",
    NEXT_PUBLIC_CONTACT_EMAIL: "feedback@danceclip.org.com",
  });

  assert.equal(settings.from, "DanceClip AI <feedback@danceclip.org.com>");
  assert.equal(settings.to, "zhenyufang162@gmail.com");
});

test("escapes user content in contact email html", () => {
  const html = buildContactEmailHtml({
    name: "<Sender>",
    email: "sender@example.com",
    subject: "Hello <script>",
    message: "Use & verify",
    company: "",
  });

  assert.match(html, /&lt;Sender&gt;/);
  assert.match(html, /Hello &lt;script&gt;/);
  assert.match(html, /Use &amp; verify/);
});
