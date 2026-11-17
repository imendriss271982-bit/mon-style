/* Diva Divina — service worker (v225) : seulement pour les notifications de suivi de Diva.
   Aucune mise en cache (l'app se met à jour comme avant). v226 (Imen : « الرسالة ما تبان من برا إلا لما تضغط ») : la
   notification ne montre JAMAIS la question, seulement « Diva a un message pour toi 💛 » dans la langue de la cliente ;
   la question s'affiche dans l'app quand elle touche la notification. Mode silencieux (réglé dans le Profil) : sans son ni vibration. */
const API = "https://mon-style.imendriss271982.workers.dev";
const DEF = { fr: "Diva a un message pour toi 💛", en: "Diva has a message for you 💛", ar: "ديفا عندها رسالة لچ 💛" };
// v227 : la tenue du matin (ids « m » + date) a son propre texte, toujours sans rien de personnel.
const MATIN = { fr: "Bonjour ☀️ Ta tenue du jour t’attend", en: "Good morning ☀️ Your outfit of the day is waiting", ar: "صباح الخير ☀️ لبسة اليوم جاهزة لچ" };

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => e.waitUntil((async () => {
  let j = {};
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (sub) {
      const r = await fetch(API + "/suivi/pending", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ep: sub.endpoint }) });
      j = (await r.json()) || {};
    }
  } catch (err) {}
  const lang = DEF[j.lang] ? j.lang : ((self.navigator && self.navigator.language) || "fr").slice(0, 2);
  const id = ((j.msgs || [])[0] || {}).id || "";
  await self.registration.showNotification("Diva", {
    body: (/^m\d{8}$/.test(id) ? MATIN : DEF)[lang] || DEF.fr, icon: "icon-192.png?v=5", badge: "icon-192.png?v=5", tag: /^m\d{8}$/.test(id) ? "diva-matin" : "diva-message",
    silent: !!j.silent, data: { id }, lang: DEF[lang] ? lang : "fr", dir: lang === "ar" ? "rtl" : "auto"
  });
})()));

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const id = (e.notification.data && e.notification.data.id) || "";
  const url = new URL("./" + (id ? "?suivi=" + encodeURIComponent(id) : ""), self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if (c.url.startsWith(self.registration.scope)) { try { c.postMessage({ suivi: id }); await c.focus(); return; } catch (err) {} } }
    await self.clients.openWindow(url);
  })());
});
