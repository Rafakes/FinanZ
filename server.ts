import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to send invitation email
  app.post("/api/send-invite-email", async (req, res) => {
    const { email, familyName, inviterName } = req.body;

    if (!resend) {
      console.warn("RESEND_API_KEY not found. Email not sent.");
      return res.status(200).json({ 
        success: false, 
        message: "Serviço de e-mail não configurado (RESEND_API_KEY ausente)." 
      });
    }

    try {
      const { data, error } = await resend.emails.send({
        from: "FinanZ <onboarding@resend.dev>",
        to: [email],
        subject: `Convite: Participe da família ${familyName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                .body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; margin: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                .header { background-color: #7c3aed; padding: 32px; text-align: center; }
                .content { padding: 40px 32px; }
                .title { color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 16px; margin-top: 0; }
                .text { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
                .button-container { text-align: center; margin: 32px 0; }
                .button { background-color: #7c3aed; color: #ffffff !important; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; }
                .footer { padding: 24px 32px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; }
                .footer-text { color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5; }
                .badge { background-color: #f3f4f6; color: #374151; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 500; }
              </style>
            </head>
            <body class="body">
              <div class="container">
                <div class="header">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -0.5px;">FinanZ</h1>
                </div>
                <div class="content">
                  <h2 class="title">Você foi convidado!</h2>
                  <p class="text">
                    Olá! <strong>${inviterName}</strong> convidou você para se juntar à família <span class="badge">${familyName}</span> no FinanZ.
                  </p>
                  <p class="text">
                    Agora vocês podem organizar gastos, planejar o futuro e acompanhar quem está economizando mais no ranking da família.
                  </p>
                  <div class="button-container">
                    <a href="https://ais-pre-bo7eogicloesoob2tte5jn-307783742013.europe-west2.run.app" class="button">Aceitar Convite</a>
                  </div>
                  <p class="text" style="font-size: 14px; margin-bottom: 0;">
                    Se você ainda não possui uma conta, basta se cadastrar usando o e-mail: <strong>${email}</strong>
                  </p>
                </div>
                <div class="footer">
                  <p class="footer-text">
                    Este é um e-mail automático enviado pelo FinanZ.<br>
                    © 2025 FinanZ. Todos os direitos reservados.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        return res.status(400).json({ success: false, error });
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error("Server error sending email:", err);
      res.status(500).json({ success: false, message: "Erro interno ao enviar e-mail." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
