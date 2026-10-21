const openButton = document.querySelector('#open-letter');
const letter = document.querySelector('#letter');
const letterTitle = document.querySelector('#letter-title');

openButton.addEventListener('click', () => {
  if (openButton.disabled) return;
  openButton.disabled = true;
  openButton.setAttribute('aria-expanded', 'true');
  openButton.replaceChildren('With heartfelt thanks ♡');
  document.querySelector('.envelope').classList.add('is-open');
  letter.hidden = false;
  letter.classList.add('revealed');

  const focusLetter = () => letterTitle.focus();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    focusLetter();
  } else {
    window.setTimeout(focusLetter, 800);
  }
});

// Enhance only after the interaction is ready; the HTML remains readable without JS.
letter.hidden = true;
openButton.hidden = false;
document.querySelector('#invitation-note').hidden = false;
