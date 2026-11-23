/* Tramaviva · configuración de tu web
   Rellena estos dos datos con los de tu proyecto de Supabase (Project Settings → API).
   Los dos son públicos: están pensados para ir en la web.
   NUNCA pongas aquí la clave «service_role» / «secret» de Supabase ni tu clave de Anthropic. */
window.TV_CONFIG = {
  supabaseUrl: 'https://dqegxtcgfwlqhpsexvoh.supabase.co',
  supabaseKey: 'sb_publishable_GCJnGNDbH0fer6zRwndYdw_v_KiqMjJ',

  /* VERSIÓN DE PRUEBA: quien entra en tu web solo puede crear vídeos de este número de minutos.
     Para quitar la limitación, pon activa: false. */
  prueba: { activa: true, minutos: 1 },

  /* ENLACE PARA COMPRAR: pega aquí la dirección de tu página de pago (Stripe «Payment Link», Lemon Squeezy, Gumroad…).
     Mientras esté vacío, los botones de compra dicen que se abrirá muy pronto. */
  compraUrl: ''
};
