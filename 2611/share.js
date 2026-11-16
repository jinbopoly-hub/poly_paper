(() => {
  const toast = document.querySelector('.share-toast');
  let timer;
  document.querySelectorAll('.section-share button[data-share-method="copy_link"]').forEach((button) => {
    const url = new URL(button.closest('section').id ? '#' + button.closest('section').id : '', document.querySelector('link[rel="canonical"]').href).href;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast.textContent = '링크를 복사했습니다.';
        toast.classList.add('is-visible');
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
      } catch {
        window.prompt('이 글의 링크를 복사하세요.', url);
      }
    });
  });
})();
