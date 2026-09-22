/* Accordion behaviors used across pages. */
document.querySelectorAll(".accordion-item").forEach((item) => {
  const head = item.querySelector(".accordion-head");
  const body = item.querySelector(".accordion-body");
  if (!head || !body) return;
  head.addEventListener("click", () => {
    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".accordion-item.open").forEach((o) => {
      o.classList.remove("open");
      o.querySelector(".accordion-body").style.maxHeight = null;
    });
    if (!isOpen) {
      item.classList.add("open");
      body.style.maxHeight = body.scrollHeight + "px";
    }
  });
});

document.querySelectorAll(".accordion-item").forEach((item) => {
  const body = item.querySelector(".accordion-body");
  if (item.classList.contains("open") && body) body.style.maxHeight = body.scrollHeight + "px";
});