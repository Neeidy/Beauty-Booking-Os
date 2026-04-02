import brandingData from "../../../../clients/demo-salon/branding.json";

type SupportedLanguage = "de" | "en" | "tr";

interface BookingConfirmationData {
  customerName: string;
  serviceName: string;
  date: string;       // e.g. "Montag, 14. April 2026"
  time: string;       // e.g. "14:00"
  salonName: string;
  salonAddress: string;
  salonPhone: string;
  salonEmail: string;
}

function fillTemplate(template: string, data: BookingConfirmationData): string {
  return template
    .replace(/{customerName}/g, data.customerName)
    .replace(/{serviceName}/g, data.serviceName)
    .replace(/{date}/g, data.date)
    .replace(/{time}/g, data.time)
    .replace(/{salonName}/g, data.salonName);
}

export function buildBookingConfirmationText(
  data: BookingConfirmationData,
  language: SupportedLanguage = "de"
): string {
  const templates = brandingData.messageTemplates.bookingConfirmation;
  const template = templates[language] ?? templates.de;
  return fillTemplate(template, data);
}

const BRAND_PRIMARY = "#2D2926";
const BRAND_SECONDARY = "#C9A96E";
const BRAND_ACCENT = "#E8DDD0";
const BRAND_BG = "#FAFAF8";

const SUBJECT: Record<SupportedLanguage, string> = {
  de: "Ihre Terminanfrage — Vienna Glow Studio",
  en: "Your Appointment Request — Vienna Glow Studio",
  tr: "Randevu Talebiniz — Vienna Glow Studio",
};

const LABELS: Record<SupportedLanguage, { appointment: string; address: string; questions: string; contact: string }> = {
  de: {
    appointment: "Ihr Termin",
    address: "Adresse",
    questions: "Haben Sie Fragen?",
    contact: "Kontakt",
  },
  en: {
    appointment: "Your Appointment",
    address: "Address",
    questions: "Any questions?",
    contact: "Contact",
  },
  tr: {
    appointment: "Randevunuz",
    address: "Adres",
    questions: "Sorularınız mı var?",
    contact: "İletişim",
  },
};

export function buildBookingConfirmationHtml(
  data: BookingConfirmationData,
  language: SupportedLanguage = "de"
): string {
  const subject = SUBJECT[language];
  const l = LABELS[language];
  const textMessage = buildBookingConfirmationText(data, language);

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND_BG};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND_BG};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid ${BRAND_ACCENT};">

          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_PRIMARY};padding:32px 40px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:600;color:${BRAND_BG};letter-spacing:0.5px;">
                ${data.salonName}
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:${BRAND_ACCENT};letter-spacing:1.5px;text-transform:uppercase;">
                Premium Beauty Studio
              </p>
            </td>
          </tr>

          <!-- Gold accent bar -->
          <tr>
            <td style="height:4px;background-color:${BRAND_SECONDARY};"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:${BRAND_PRIMARY};">
                ${textMessage}
              </p>

              <!-- Appointment details box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background-color:${BRAND_ACCENT};border-left:3px solid ${BRAND_SECONDARY};margin:0 0 28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${BRAND_SECONDARY};font-family:Arial,sans-serif;">
                      ${l.appointment}
                    </p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND_PRIMARY};font-family:Arial,sans-serif;">
                      ${data.serviceName}
                    </p>
                    <p style="margin:6px 0 0;font-size:14px;color:${BRAND_PRIMARY};font-family:Arial,sans-serif;">
                      ${data.date} &middot; ${data.time}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Address + contact -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:20px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${BRAND_SECONDARY};font-family:Arial,sans-serif;">
                      ${l.address}
                    </p>
                    <p style="margin:0;font-size:13px;color:${BRAND_PRIMARY};line-height:1.5;font-family:Arial,sans-serif;">
                      ${data.salonAddress}
                    </p>
                  </td>
                  <td style="vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${BRAND_SECONDARY};font-family:Arial,sans-serif;">
                      ${l.contact}
                    </p>
                    <p style="margin:0;font-size:13px;color:${BRAND_PRIMARY};line-height:1.5;font-family:Arial,sans-serif;">
                      <a href="tel:${data.salonPhone}" style="color:${BRAND_PRIMARY};text-decoration:none;">${data.salonPhone}</a><br />
                      <a href="mailto:${data.salonEmail}" style="color:${BRAND_PRIMARY};text-decoration:none;">${data.salonEmail}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${BRAND_PRIMARY};padding:20px 40px;">
              <p style="margin:0;font-size:11px;color:${BRAND_ACCENT};opacity:0.7;font-family:Arial,sans-serif;text-align:center;">
                © ${new Date().getFullYear()} ${data.salonName} GmbH &nbsp;·&nbsp;
                <a href="https://viennaglowstudio.at/datenschutz" style="color:${BRAND_ACCENT};text-decoration:none;">Datenschutz</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getBookingConfirmationSubject(language: SupportedLanguage = "de"): string {
  return SUBJECT[language];
}

export type { BookingConfirmationData, SupportedLanguage };
