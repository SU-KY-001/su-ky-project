self.addEventListener("push", (event) => {
  let reminder;
  try {
    reminder = event.data?.json();
  } catch {
    return;
  }
  if (!reminder || typeof reminder.title !== "string" || typeof reminder.body !== "string" || typeof reminder.tag !== "string") return;
  event.waitUntil(self.registration.showNotification(reminder.title, { body: reminder.body, tag: reminder.tag }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL("/thanh-vien", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => client.url === destination);
    if (existing) return existing.focus();
    return self.clients.openWindow(destination);
  })());
});
