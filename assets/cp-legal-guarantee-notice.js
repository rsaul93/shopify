(() => {
  if (window.__cpLegalGuaranteeNoticeReady) return;
  window.__cpLegalGuaranteeNoticeReady = true;
  const dialog = document.querySelector('[data-cp-legal-guarantee-dialog]');
  const closeButton = dialog && dialog.querySelector('[data-cp-legal-guarantee-close]');
  let returnFocus = null;

  const openDialog = (opener) => {
    if (!(dialog instanceof HTMLDialogElement)) return;
    returnFocus = opener;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    requestAnimationFrame(() => closeButton && closeButton.focus());
  };
  const closeDialog = () => {
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  };
  document.addEventListener('click', (event) => {
    const opener = event.target.closest && event.target.closest('[data-cp-legal-guarantee-open]');
    if (opener) openDialog(opener);
  });
  closeButton && closeButton.addEventListener('click', closeDialog);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog instanceof HTMLDialogElement && dialog.open) {
      event.preventDefault();
      closeDialog();
    }
  });
  dialog && dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog && dialog.addEventListener('close', () => {
    if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
    returnFocus = null;
  });
})();
