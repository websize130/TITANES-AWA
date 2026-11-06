// Servidor simulado de la Messages API para pruebas e2e (no usa la API real ni gasta tokens).
import http from "node:http";

function reply(body) {
  const system = typeof body.system === "string" ? body.system : JSON.stringify(body.system);
  const prompt = body.messages?.[0]?.content ?? "";
  const text = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  let out;
  if (system.includes("Eres EMINEM") && text.includes("Crea un plan")) {
    out = {
      summary: "Plan de prueba: investigar, preparar oferta y revisar.",
      tasks: [
        { agent_id: "tupac", title: "Auditar negocio", description: "Auditoría digital", priority: "alta", depends_on: [], requires_approval: false },
        { agent_id: "fifty-cent", title: "Preparar oferta", description: "Oferta con catálogo", priority: "alta", depends_on: [0], requires_approval: false },
        { agent_id: "canserbero", title: "Prototipo costoso", description: "Requiere aprobación", priority: "media", depends_on: [0], requires_approval: true },
      ],
    };
  } else {
    const base = { summary: "Resultado de prueba", deliverable_markdown: "# Informe\n\n- punto **uno**\n- punto dos", verified_facts: ["Dato del CRM"], hypotheses: ["Suposición"], next_steps: ["Siguiente"], qa_verdict: "no_aplica", audit_score: null, audit_findings: [], proposal_items: [], sensitive_actions: [] };
    if (system.includes("Eres TUPAC")) out = { ...base, audit_score: 78, audit_findings: [{ area: "Web", severity: "alta", finding: "Sin reservas online", verified: false }] };
    else if (system.includes("Eres 50 CENT")) out = { ...base, proposal_items: [{ service_id: "web-pro", price: 350 }, { service_id: "reservas", price: 250 }, { service_id: "inventado", price: 1 }], sensitive_actions: [{ type: "enviar_propuesta", title: "Enviar oferta al cliente", description: "Email con la oferta" }] };
    else if (system.includes("Eres ICE CUBE")) out = { ...base, qa_verdict: "aprobado" };
    else out = base;
  }
  return {
    id: `msg_mock_${Date.now()}`, type: "message", role: "assistant", model: body.model,
    content: [{ type: "text", text: JSON.stringify(out) }], stop_reason: "end_turn", stop_sequence: null, stop_details: null,
    usage: { input_tokens: 1200, output_tokens: 800, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  };
}

export function startMock(port) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      requests.push({ url: req.url, headers: req.headers, body });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(reply(body)));
    });
  });
  return new Promise((r) => server.listen(port, () => r({ server, requests })));
}
