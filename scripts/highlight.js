document.querySelectorAll('.highlightable').forEach(el => {
  el.style.cursor = 'pointer';
  el.title = 'Click to highlight';
  el.addEventListener('click', () => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
});
