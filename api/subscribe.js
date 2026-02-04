<script>
  const form = document.querySelector('.form');
  const emailEl = document.querySelector('.field');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailEl.value.trim();
    if (!email) return;

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "cerberus-landing" })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        alert("Thanks — you’re subscribed.");
        emailEl.value = "";
      } else {
        alert(data?.error || "Subscribe failed.");
      }
    } catch (err) {
      alert("Network error. Try again.");
    }
  });
</script>
