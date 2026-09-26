export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          clave: string | null
          creada: string
          datos: Json
          hermana_id: number | null
          id: number
          mensaje: string
          resuelta_el: string | null
          tipo: string
        }
        Insert: {
          clave?: string | null
          creada?: string
          datos?: Json
          hermana_id?: number | null
          id?: never
          mensaje: string
          resuelta_el?: string | null
          tipo: string
        }
        Update: {
          clave?: string | null
          creada?: string
          datos?: Json
          hermana_id?: number | null
          id?: never
          mensaje?: string
          resuelta_el?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "alertas_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "alertas_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "alertas_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
        ]
      }
      categorias: {
        Row: {
          color: string
          id: number
          nombre: string
          objetivo_pct: number | null
          orden: number
        }
        Insert: {
          color: string
          id: number
          nombre: string
          objetivo_pct?: number | null
          orden?: number
        }
        Update: {
          color?: string
          id?: number
          nombre?: string
          objetivo_pct?: number | null
          orden?: number
        }
        Relationships: []
      }
      cierres: {
        Row: {
          fuente: string | null
          hermana_id: number
          mep_cierre: number | null
          mes: string
          registrado_el: string
          total_usd: number
        }
        Insert: {
          fuente?: string | null
          hermana_id: number
          mep_cierre?: number | null
          mes: string
          registrado_el?: string
          total_usd: number
        }
        Update: {
          fuente?: string | null
          hermana_id?: number
          mep_cierre?: number | null
          mes?: string
          registrado_el?: string
          total_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "cierres_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "cierres_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "cierres_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "cierres_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
        ]
      }
      config: {
        Row: {
          actualizado: string
          clave: string
          valor: Json
        }
        Insert: {
          actualizado?: string
          clave: string
          valor: Json
        }
        Update: {
          actualizado?: string
          clave?: string
          valor?: Json
        }
        Relationships: []
      }
      efectivo: {
        Row: {
          actualizado: string
          ars: number
          fuente: string | null
          hermana_id: number
          plataforma: string
          usd: number
        }
        Insert: {
          actualizado?: string
          ars?: number
          fuente?: string | null
          hermana_id: number
          plataforma: string
          usd?: number
        }
        Update: {
          actualizado?: string
          ars?: number
          fuente?: string | null
          hermana_id?: number
          plataforma?: string
          usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "efectivo_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "efectivo_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "efectivo_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "efectivo_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "efectivo_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "efectivo_plataforma_fkey"
            columns: ["plataforma"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["nombre"]
          },
        ]
      }
      hermanas: {
        Row: {
          color: string
          fecha_nacimiento: string | null
          id: number
          nombre: string
          orden: number
        }
        Insert: {
          color: string
          fecha_nacimiento?: string | null
          id: number
          nombre: string
          orden?: number
        }
        Update: {
          color?: string
          fecha_nacimiento?: string | null
          id?: number
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      intentos_login: {
        Row: {
          creado_el: string
          es_admin: boolean
          hermana_id: number | null
          id: number
          ip: string | null
          ok: boolean
        }
        Insert: {
          creado_el?: string
          es_admin?: boolean
          hermana_id?: number | null
          id?: never
          ip?: string | null
          ok: boolean
        }
        Update: {
          creado_el?: string
          es_admin?: boolean
          hermana_id?: number | null
          id?: never
          ip?: string | null
          ok?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "intentos_login_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intentos_login_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "intentos_login_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "intentos_login_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "intentos_login_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
        ]
      }
      iol_credenciales: {
        Row: {
          cargada_el: string
          hermana_id: number
          ultimo_login_ok: string | null
          usuario_mascara: string | null
          vault_secret_id: string
        }
        Insert: {
          cargada_el?: string
          hermana_id: number
          ultimo_login_ok?: string | null
          usuario_mascara?: string | null
          vault_secret_id: string
        }
        Update: {
          cargada_el?: string
          hermana_id?: number
          ultimo_login_ok?: string | null
          usuario_mascara?: string | null
          vault_secret_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iol_credenciales_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iol_credenciales_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "iol_credenciales_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "iol_credenciales_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "iol_credenciales_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
        ]
      }
      mep: {
        Row: {
          compra: number | null
          fecha: string
          fuente: string
          referencia: number
          venta: number | null
        }
        Insert: {
          compra?: number | null
          fecha: string
          fuente?: string
          referencia: number
          venta?: number | null
        }
        Update: {
          compra?: number | null
          fecha?: string
          fuente?: string
          referencia?: number
          venta?: number | null
        }
        Relationships: []
      }
      mep_vivo: {
        Row: {
          actualizado: string
          fecha: string
          fuente: string
          id: boolean
          valor: number
        }
        Insert: {
          actualizado?: string
          fecha: string
          fuente?: string
          id?: boolean
          valor: number
        }
        Update: {
          actualizado?: string
          fecha?: string
          fuente?: string
          id?: boolean
          valor?: number
        }
        Relationships: []
      }
      movimientos: {
        Row: {
          aportante: Database["public"]["Enums"]["aportante"] | null
          cantidad: number | null
          creado_el: string
          creado_por: string | null
          fecha: string
          hermana_id: number
          id: number
          iol_numero: number | null
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          nota: string | null
          origen: Database["public"]["Enums"]["origen_movimiento"]
          plataforma: string
          tc_manual: number | null
          ticker: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Insert: {
          aportante?: Database["public"]["Enums"]["aportante"] | null
          cantidad?: number | null
          creado_el?: string
          creado_por?: string | null
          fecha: string
          hermana_id: number
          id?: never
          iol_numero?: number | null
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          nota?: string | null
          origen?: Database["public"]["Enums"]["origen_movimiento"]
          plataforma?: string
          tc_manual?: number | null
          ticker?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Update: {
          aportante?: Database["public"]["Enums"]["aportante"] | null
          cantidad?: number | null
          creado_el?: string
          creado_por?: string | null
          fecha?: string
          hermana_id?: number
          id?: never
          iol_numero?: number | null
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          nota?: string | null
          origen?: Database["public"]["Enums"]["origen_movimiento"]
          plataforma?: string
          tc_manual?: number | null
          ticker?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_plataforma_fkey"
            columns: ["plataforma"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["nombre"]
          },
          {
            foreignKeyName: "movimientos_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
          {
            foreignKeyName: "movimientos_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "v_tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      perfiles: {
        Row: {
          hermana_id: number | null
          rol: Database["public"]["Enums"]["rol_usuario"]
          user_id: string
        }
        Insert: {
          hermana_id?: number | null
          rol: Database["public"]["Enums"]["rol_usuario"]
          user_id: string
        }
        Update: {
          hermana_id?: number | null
          rol?: Database["public"]["Enums"]["rol_usuario"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfiles_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "perfiles_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "perfiles_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "perfiles_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
        ]
      }
      plan_items: {
        Row: {
          cantidad: number | null
          id: number
          nivel: Database["public"]["Enums"]["nivel_riesgo"]
          orden: number
          pct_nivel: number | null
          plan_id: number
          ticker: string
        }
        Insert: {
          cantidad?: number | null
          id?: never
          nivel: Database["public"]["Enums"]["nivel_riesgo"]
          orden?: number
          pct_nivel?: number | null
          plan_id: number
          ticker: string
        }
        Update: {
          cantidad?: number | null
          id?: never
          nivel?: Database["public"]["Enums"]["nivel_riesgo"]
          orden?: number
          pct_nivel?: number | null
          plan_id?: number
          ticker?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
          {
            foreignKeyName: "plan_items_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "v_tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      planes: {
        Row: {
          capital_ars: number
          guardado_el: string
          hermana_id: number
          id: number
          mep: number | null
          mes: string
          origen_fondos: Database["public"]["Enums"]["origen_fondos"]
          pct_alto: number
          pct_bajo: number
          pct_medio: number
        }
        Insert: {
          capital_ars?: number
          guardado_el?: string
          hermana_id: number
          id?: never
          mep?: number | null
          mes: string
          origen_fondos?: Database["public"]["Enums"]["origen_fondos"]
          pct_alto?: number
          pct_bajo?: number
          pct_medio?: number
        }
        Update: {
          capital_ars?: number
          guardado_el?: string
          hermana_id?: number
          id?: never
          mep?: number | null
          mes?: string
          origen_fondos?: Database["public"]["Enums"]["origen_fondos"]
          pct_alto?: number
          pct_bajo?: number
          pct_medio?: number
        }
        Relationships: [
          {
            foreignKeyName: "planes_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planes_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "planes_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "planes_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "planes_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
        ]
      }
      plataformas: {
        Row: {
          nombre: string
          orden: number
        }
        Insert: {
          nombre: string
          orden?: number
        }
        Update: {
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      proy_gastos: {
        Row: {
          anio: number
          concepto: string
          hermana_id: number
          id: number
          monto_usd: number
        }
        Insert: {
          anio: number
          concepto: string
          hermana_id: number
          id?: never
          monto_usd: number
        }
        Update: {
          anio?: number
          concepto?: string
          hermana_id?: number
          id?: never
          monto_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "proy_gastos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proy_gastos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "proy_gastos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "proy_gastos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "proy_gastos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
        ]
      }
      proy_tramos: {
        Row: {
          desde_anio: number
          hasta_anio: number
          hermana_id: number
          id: number
          monto_usd_mes: number
          quien: Database["public"]["Enums"]["aportante"]
        }
        Insert: {
          desde_anio: number
          hasta_anio: number
          hermana_id: number
          id?: never
          monto_usd_mes: number
          quien: Database["public"]["Enums"]["aportante"]
        }
        Update: {
          desde_anio?: number
          hasta_anio?: number
          hermana_id?: number
          id?: never
          monto_usd_mes?: number
          quien?: Database["public"]["Enums"]["aportante"]
        }
        Relationships: [
          {
            foreignKeyName: "proy_tramos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proy_tramos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "proy_tramos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "proy_tramos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "proy_tramos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
        ]
      }
      proyecciones: {
        Row: {
          edad_hasta: number
          hermana_id: number
          meta_edad: number
          meta_usd: number
          rend_esperado: number
          rend_optimista: number
          rend_pesimista: number
        }
        Insert: {
          edad_hasta?: number
          hermana_id: number
          meta_edad?: number
          meta_usd?: number
          rend_esperado?: number
          rend_optimista?: number
          rend_pesimista?: number
        }
        Update: {
          edad_hasta?: number
          hermana_id?: number
          meta_edad?: number
          meta_usd?: number
          rend_esperado?: number
          rend_optimista?: number
          rend_pesimista?: number
        }
        Relationships: [
          {
            foreignKeyName: "proyecciones_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecciones_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "proyecciones_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "proyecciones_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "proyecciones_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: true
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
        ]
      }
      reglas_alerta: {
        Row: {
          activa: boolean
          nota: string | null
          tipo: string
          umbral: number | null
        }
        Insert: {
          activa?: boolean
          nota?: string | null
          tipo: string
          umbral?: number | null
        }
        Update: {
          activa?: boolean
          nota?: string | null
          tipo?: string
          umbral?: number | null
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          disparo: string
          error: string | null
          estado: string
          fin: string | null
          id: number
          inicio: string
          resumen: Json
        }
        Insert: {
          disparo: string
          error?: string | null
          estado?: string
          fin?: string | null
          id?: never
          inicio?: string
          resumen?: Json
        }
        Update: {
          disparo?: string
          error?: string | null
          estado?: string
          fin?: string | null
          id?: never
          inicio?: string
          resumen?: Json
        }
        Relationships: []
      }
      tesis: {
        Row: {
          actualizado: string
          cuando_vender: string | null
          hermana_id: number
          horizonte: string | null
          por_que: string | null
          ticker: string
        }
        Insert: {
          actualizado?: string
          cuando_vender?: string | null
          hermana_id: number
          horizonte?: string | null
          por_que?: string | null
          ticker: string
        }
        Update: {
          actualizado?: string
          cuando_vender?: string | null
          hermana_id?: number
          horizonte?: string | null
          por_que?: string | null
          ticker?: string
        }
        Relationships: [
          {
            foreignKeyName: "tesis_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tesis_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "tesis_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "tesis_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "tesis_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "tesis_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
          {
            foreignKeyName: "tesis_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "v_tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      tickers: {
        Row: {
          actualizado: string | null
          categoria_id: number | null
          cotiza_cada: number
          fuente: string | null
          moneda: Database["public"]["Enums"]["moneda"]
          nombre: string | null
          plataforma: string | null
          precio: number | null
          ticker: string
        }
        Insert: {
          actualizado?: string | null
          categoria_id?: number | null
          cotiza_cada?: number
          fuente?: string | null
          moneda?: Database["public"]["Enums"]["moneda"]
          nombre?: string | null
          plataforma?: string | null
          precio?: number | null
          ticker: string
        }
        Update: {
          actualizado?: string | null
          categoria_id?: number | null
          cotiza_cada?: number
          fuente?: string | null
          moneda?: Database["public"]["Enums"]["moneda"]
          nombre?: string | null
          plataforma?: string | null
          precio?: number | null
          ticker?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickers_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickers_plataforma_fkey"
            columns: ["plataforma"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["nombre"]
          },
        ]
      }
    }
    Views: {
      v_categorias_hermana: {
        Row: {
          categoria: string | null
          categoria_id: number | null
          color: string | null
          desvio: number | null
          hermana_id: number | null
          objetivo_pct: number | null
          orden: number | null
          pct: number | null
          valor_usd: number | null
        }
        Relationships: []
      }
      v_efectivo: {
        Row: {
          actualizado: string | null
          ars: number | null
          hermana_id: number | null
          total_usd: number | null
          usd: number | null
        }
        Relationships: []
      }
      v_mep_actual: {
        Row: {
          fecha: string | null
          valor: number | null
        }
        Relationships: []
      }
      v_movimientos: {
        Row: {
          aportante: Database["public"]["Enums"]["aportante"] | null
          cantidad: number | null
          creado_el: string | null
          creado_por: string | null
          fecha: string | null
          hermana_id: number | null
          id: number | null
          iol_numero: number | null
          mes: string | null
          moneda: Database["public"]["Enums"]["moneda"] | null
          monto: number | null
          monto_ars: number | null
          monto_usd: number | null
          nota: string | null
          origen: Database["public"]["Enums"]["origen_movimiento"] | null
          plataforma: string | null
          precio_unit_usd: number | null
          tc_manual: number | null
          tc_usado: number | null
          ticker: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"] | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_plataforma_fkey"
            columns: ["plataforma"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["nombre"]
          },
          {
            foreignKeyName: "movimientos_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
          {
            foreignKeyName: "movimientos_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "v_tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      v_plan_items: {
        Row: {
          cantidad: number | null
          capital_ars: number | null
          categoria: string | null
          ejecutado_usd: number | null
          hermana_id: number | null
          id: number | null
          mep: number | null
          mes: string | null
          monto_ars: number | null
          monto_usd: number | null
          nivel: Database["public"]["Enums"]["nivel_riesgo"] | null
          orden: number | null
          pct_capital: number | null
          pct_nivel: number | null
          plan_id: number | null
          ticker: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
          {
            foreignKeyName: "plan_items_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "v_tickers"
            referencedColumns: ["ticker"]
          },
          {
            foreignKeyName: "planes_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planes_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "planes_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "planes_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "planes_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
        ]
      }
      v_posiciones: {
        Row: {
          activa: boolean | null
          cant_comprada: number | null
          cantidad: number | null
          categoria: string | null
          categoria_color: string | null
          costo_compras_usd: number | null
          costo_usd: number | null
          hermana_id: number | null
          nombre: string | null
          plataforma: string | null
          ppc_usd: number | null
          precio_usado: number | null
          precio_usd: number | null
          resultado_pct: number | null
          resultado_usd: number | null
          ticker: string | null
          valor_usd: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "hermanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_categorias_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_efectivo"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_hermana"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_hermana_id_fkey"
            columns: ["hermana_id"]
            isOneToOne: false
            referencedRelation: "v_seguimiento"
            referencedColumns: ["hermana_id"]
          },
          {
            foreignKeyName: "movimientos_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
          {
            foreignKeyName: "movimientos_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "v_tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      v_resumen_hermana: {
        Row: {
          aportado_neto_ars: number | null
          aportado_neto_usd: number | null
          aportes_joaquin_usd: number | null
          aportes_propio_usd: number | null
          aportes_regalo_usd: number | null
          color: string | null
          costo_posiciones_usd: number | null
          efectivo_usd: number | null
          hermana_id: number | null
          n_movimientos: number | null
          n_posiciones: number | null
          nombre: string | null
          orden: number | null
          rendimiento: number | null
          resultado_usd: number | null
          retiros_usd: number | null
          total_usd: number | null
          valor_posiciones_usd: number | null
        }
        Relationships: []
      }
      v_seguimiento: {
        Row: {
          aportado_acum_usd: number | null
          cierre_ars: number | null
          cierre_usd: number | null
          es_mes_actual: boolean | null
          hermana_id: number | null
          ingresos_ars: number | null
          ingresos_usd: number | null
          inicio_ars: number | null
          inicio_usd: number | null
          mep_cierre: number | null
          mep_inicio: number | null
          mes: string | null
          rendimiento_acum: number | null
          rendimiento_mes: number | null
          resultado_acum_usd: number | null
          resultado_ars: number | null
          resultado_usd: number | null
          retiros_ars: number | null
          retiros_usd: number | null
        }
        Relationships: []
      }
      v_tickers: {
        Row: {
          actualizado: string | null
          categoria: string | null
          categoria_color: string | null
          categoria_id: number | null
          cotiza_cada: number | null
          fuente: string | null
          moneda: Database["public"]["Enums"]["moneda"] | null
          nombre: string | null
          plataforma: string | null
          precio: number | null
          precio_usd: number | null
          ticker: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickers_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickers_plataforma_fkey"
            columns: ["plataforma"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["nombre"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      aportante: "Joaquín" | "Propio" | "Regalo"
      moneda: "ARS" | "USD"
      nivel_riesgo: "Bajo" | "Medio" | "Alto" | "Venta"
      origen_fondos: "Aporte nuevo" | "Efectivo disponible"
      origen_movimiento: "Manual" | "IOL" | "Migración"
      rol_usuario: "admin" | "hermana"
      tipo_movimiento:
        | "Aporte"
        | "Retiro"
        | "Compra"
        | "Venta"
        | "Renta/Dividendo"
        | "Gasto/Comisión"
        | "Ingreso de títulos"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      aportante: ["Joaquín", "Propio", "Regalo"],
      moneda: ["ARS", "USD"],
      nivel_riesgo: ["Bajo", "Medio", "Alto", "Venta"],
      origen_fondos: ["Aporte nuevo", "Efectivo disponible"],
      origen_movimiento: ["Manual", "IOL", "Migración"],
      rol_usuario: ["admin", "hermana"],
      tipo_movimiento: [
        "Aporte",
        "Retiro",
        "Compra",
        "Venta",
        "Renta/Dividendo",
        "Gasto/Comisión",
        "Ingreso de títulos",
      ],
    },
  },
} as const
