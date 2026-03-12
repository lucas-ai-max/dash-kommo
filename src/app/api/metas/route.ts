import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { format, startOfMonth } from "date-fns";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { responsible_user_id, responsible_user_name, meta_receita } = await req.json();

    if (!responsible_user_id || meta_receita == null) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const mes_referencia = format(startOfMonth(new Date()), "yyyy-MM-dd");

    const { error } = await supabaseAdmin
      .from("dashboard_metas")
      .upsert(
        {
          responsible_user_id,
          responsible_user_name,
          mes_referencia,
          meta_receita: Number(meta_receita),
          meta_quantidade: 0,
        },
        { onConflict: "responsible_user_id,mes_referencia" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
