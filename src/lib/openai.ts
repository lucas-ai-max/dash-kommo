import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_build",
});

interface MetricsSummary {
  total_leads: number;
  leads_won: number;
  leads_lost: number;
  taxa_conversao: number | null;
  ciclo_medio_dias: number | null;
  ticket_medio: number | null;
  receita_total: number | null;
  canais: Array<{
    canal: string;
    leads: number;
    won: number;
    conversao: number | null;
    ticket: number | null;
  }>;
  vendedores: Array<{
    nome: string;
    leads: number;
    won: number;
    conversao: number | null;
    ticket: number | null;
    receita: number | null;
  }>;
  perdas: Array<{
    motivo: string;
    quantidade: number;
    canal: string | null;
  }>;
}

export async function generateInsights(
  metrics: MetricsSummary
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `Você é um analista comercial sênior de uma concessionária de motos (Motocor).
Analise os dados fornecidos e gere insights acionáveis em português.

Formato da resposta:
1. RESUMO (2-3 frases sobre o estado geral)
2. TOP 3 PONTOS POSITIVOS
3. TOP 3 PONTOS DE ATENÇÃO
4. RECOMENDAÇÕES (3-5 ações concretas)

Cruze métricas entre si: canal × conversão, vendedor × ciclo, perda × canal, etc.
Identifique padrões e anomalias. Seja direto e prático.`,
      },
      {
        role: "user",
        content: `Analise estes dados comerciais do período:

GERAL:
- Total leads: ${metrics.total_leads}
- Ganhos: ${metrics.leads_won} | Perdidos: ${metrics.leads_lost}
- Conversão: ${metrics.taxa_conversao ?? "N/A"}%
- Ciclo médio: ${metrics.ciclo_medio_dias ?? "N/A"} dias
- Ticket médio: R$ ${metrics.ticket_medio ?? "N/A"}
- Receita total: R$ ${metrics.receita_total ?? "N/A"}

POR CANAL:
${metrics.canais.map((c) => `- ${c.canal}: ${c.leads} leads, ${c.won} vendas, ${c.conversao ?? "N/A"}% conversão, ticket R$ ${c.ticket ?? "N/A"}`).join("\n")}

POR VENDEDOR:
${metrics.vendedores.map((v) => `- ${v.nome}: ${v.leads} leads, ${v.won} vendas, ${v.conversao ?? "N/A"}% conversão, ticket R$ ${v.ticket ?? "N/A"}, receita R$ ${v.receita ?? "N/A"}`).join("\n")}

PERDAS:
${metrics.perdas.map((p) => `- ${p.motivo}: ${p.quantidade}x${p.canal ? ` (canal: ${p.canal})` : ""}`).join("\n")}

Gere insights cruzando essas métricas.`,
      },
    ],
  });

  return response.choices[0]?.message?.content || "Não foi possível gerar insights.";
}
